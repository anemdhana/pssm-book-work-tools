import { NextResponse } from "next/server";
import { composePage } from "@/lib/flow";
import { loadBook } from "@/lib/books";
import { readPage } from "@/lib/pageLayout";
import { loadPageEdits, savePageEdits } from "@/lib/pageEdits";
import { PdfImportError } from "@/lib/pdf";
import type { FlowBlock, ImageAlign, PageView, SavedImage, SavedPage, SavedParagraph } from "@/lib/pageTypes";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; page: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, page } = await params;
  const book = await loadBook(id);
  const pageNumber = Number(page);
  if (!book || !Number.isInteger(pageNumber)) return NextResponse.json({ ok: false, error: "Page not found." }, { status: 404 });
  try {
    const laid = await readPage(book, pageNumber);
    const edits = await loadPageEdits(id);
    const blocks: FlowBlock[] = composePage(laid, edits[String(pageNumber)]).map((block) => {
      if (block.kind === "paragraph") return block;
      return {
        kind: "image",
        id: block.id,
        align: block.align,
        width: block.width,
        src: `data:image/png;base64,${block.png.toString("base64")}`,
      };
    });
    const view: PageView = {
      pageNumber: laid.pageNumber,
      pageCount: laid.pageCount,
      width: laid.width,
      height: laid.height,
      blocks,
    };
    return NextResponse.json({ ok: true, page: view });
  } catch (error) {
    console.error(error);
    const message = error instanceof PdfImportError ? error.message : "Could not open that page.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id, page } = await params;
  const book = await loadBook(id);
  const pageNumber = Number(page);
  if (!book || !Number.isInteger(pageNumber)) return NextResponse.json({ ok: false, error: "Page not found." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { paragraphs?: unknown; images?: unknown } | null;
  if (!body || !Array.isArray(body.paragraphs) || !Array.isArray(body.images)) {
    return NextResponse.json({ ok: false, error: "Page changes are required." }, { status: 400 });
  }
  const paragraphs = body.paragraphs.filter(isParagraph);
  const images = body.images.filter(isImage);
  if (paragraphs.length !== body.paragraphs.length || images.length !== body.images.length) {
    return NextResponse.json({ ok: false, error: "A block on this page is incomplete." }, { status: 400 });
  }
  const saved: SavedPage = { paragraphs, images };
  await savePageEdits(id, pageNumber, saved);
  return NextResponse.json({ ok: true });
}

function isParagraph(value: unknown): value is SavedParagraph {
  if (!value || typeof value !== "object") return false;
  const paragraph = value as SavedParagraph;
  return typeof paragraph.id === "string" && typeof paragraph.text === "string" && typeof paragraph.fontFamily === "string" && typeof paragraph.fontSize === "number";
}

function isImage(value: unknown): value is SavedImage {
  if (!value || typeof value !== "object") return false;
  const image = value as SavedImage;
  const align = image.align as ImageAlign;
  return typeof image.id === "string" && typeof image.width === "number" && (align === "left" || align === "center" || align === "right");
}

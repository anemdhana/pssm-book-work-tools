import { NextResponse } from "next/server";
import { loadBook } from "@/lib/books";
import { buildDocx, buildMarkdownZip, downloadBase } from "@/lib/exportBook";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const book = await loadBook(id);
  if (!book) return NextResponse.json({ ok: false, error: "Book not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format");
  try {
    if (format === "md") {
      const zip = await buildMarkdownZip(book);
      const name = `${downloadBase(book.title)}.zip`;
      return fileResponse(zip, "application/zip", name);
    }
    const docx = await buildDocx(book);
    const name = `${downloadBase(book.title)}.docx`;
    return fileResponse(docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Could not save that file." }, { status: 500 });
  }
}

function fileResponse(data: Buffer, type: string, filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

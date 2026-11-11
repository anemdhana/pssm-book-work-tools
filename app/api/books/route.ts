import { NextResponse } from "next/server";
import { createBookFromUpload, createPageBook } from "@/lib/books";
import { PdfImportError } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = form.get("title");
    const mode = form.get("mode") === "pages" ? "pages" : "sections";
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Choose a PDF file." }, { status: 400 });
    }
    const book =
      mode === "pages"
        ? await createPageBook(file, typeof title === "string" ? title : undefined)
        : await createBookFromUpload(file, typeof title === "string" ? title : undefined);
    return NextResponse.json({ ok: true, id: book.id, title: book.title, sectionCount: book.sections.length, splitBy: book.splitBy, mode });
  } catch (error) {
    console.error(error);
    const message = error instanceof PdfImportError ? error.message : passwordMessage(error) ?? "Could not import that PDF.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function passwordMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/password/i.test(message)) return "This PDF is password protected.";
  return null;
}

import { NextResponse } from "next/server";
import { removeBook, renameBook } from "@/lib/books";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
  }
  const book = await renameBook(id, body.title);
  if (!book) return NextResponse.json({ ok: false, error: "Book not found." }, { status: 404 });
  return NextResponse.json({ ok: true, title: book.title });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const removed = await removeBook(id);
  if (!removed) return NextResponse.json({ ok: false, error: "Book not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

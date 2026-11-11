import { NextResponse } from "next/server";
import { addSection } from "@/lib/books";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const section = await addSection(id);
  if (!section) return NextResponse.json({ ok: false, error: "Book not found." }, { status: 404 });
  return NextResponse.json({ ok: true, section });
}

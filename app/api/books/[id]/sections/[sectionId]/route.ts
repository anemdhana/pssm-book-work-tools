import { NextResponse } from "next/server";
import { removeSection, updateSection } from "@/lib/books";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id, sectionId } = await params;
  const body = (await request.json().catch(() => null)) as { title?: unknown; paragraphs?: unknown } | null;
  if (!body || typeof body.title !== "string" || !Array.isArray(body.paragraphs) || body.paragraphs.some((item) => typeof item !== "string")) {
    return NextResponse.json({ ok: false, error: "Title and paragraphs are required." }, { status: 400 });
  }
  if (body.paragraphs.length > 2000) {
    return NextResponse.json({ ok: false, error: "Too many paragraphs in one section." }, { status: 400 });
  }
  const section = await updateSection(id, sectionId, { title: body.title, paragraphs: body.paragraphs });
  if (!section) return NextResponse.json({ ok: false, error: "Section not found." }, { status: 404 });
  return NextResponse.json({ ok: true, section });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, sectionId } = await params;
  const sections = await removeSection(id, sectionId);
  if (!sections) return NextResponse.json({ ok: false, error: "Section could not be removed." }, { status: 400 });
  return NextResponse.json({ ok: true, sections });
}

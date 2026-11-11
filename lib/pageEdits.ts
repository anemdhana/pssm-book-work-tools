import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { isFontChoice } from "@/lib/fonts";
import { isSafeId } from "@/lib/ids";
import type { ImageAlign, SavedImage, SavedPage, SavedParagraph, TextAlign } from "@/lib/pageTypes";

const pagesDir = path.join(process.cwd(), "data", "pages");

type PageEditFile = { pages: Record<string, SavedPage | unknown> };

function editPath(id: string) {
  if (!isSafeId(id)) return null;
  return path.join(pagesDir, `${id}.json`);
}

export async function loadPageEdits(bookId: string): Promise<Record<string, SavedPage>> {
  const target = editPath(bookId);
  if (!target) return {};
  try {
    const parsed = JSON.parse(await readFile(target, "utf8")) as PageEditFile;
    const pages: Record<string, SavedPage> = {};
    for (const [pageNumber, value] of Object.entries(parsed.pages ?? {})) {
      if (isSavedPage(value)) pages[pageNumber] = { paragraphs: value.paragraphs.map(cleanParagraph), images: value.images.map(cleanImage) };
    }
    return pages;
  } catch {
    return {};
  }
}

export async function savePageEdits(bookId: string, pageNumber: number, page: SavedPage) {
  const target = editPath(bookId);
  if (!target) throw new Error("Invalid book id");
  const pages = await loadPageEdits(bookId);
  pages[String(pageNumber)] = {
    paragraphs: page.paragraphs.map(cleanParagraph),
    images: page.images.map(cleanImage),
  };
  await mkdir(pagesDir, { recursive: true });
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify({ pages }, null, 2), "utf8");
  await rm(target, { force: true });
  await rename(temp, target);
}

export async function removePageEdits(bookId: string) {
  const target = editPath(bookId);
  if (target) await rm(target, { force: true });
}

const textAligns = new Set<TextAlign>(["left", "center", "right", "justify"]);
const imageAligns = new Set<ImageAlign>(["left", "center", "right"]);

function isSavedPage(value: unknown): value is SavedPage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const page = value as SavedPage;
  return Array.isArray(page.paragraphs) && Array.isArray(page.images);
}

function cleanParagraph(paragraph: SavedParagraph): SavedParagraph {
  const fontSize = Number(paragraph.fontSize);
  const lineHeight = Number(paragraph.lineHeight);
  const color = /^#[0-9a-fA-F]{6}$/.test(paragraph.color) ? paragraph.color : "#1a1a1a";
  return {
    id: String(paragraph.id).slice(0, 40),
    text: String(paragraph.text ?? "").slice(0, 20000),
    fontFamily: isFontChoice(paragraph.fontFamily) ? paragraph.fontFamily : "Georgia",
    fontSize: Number.isFinite(fontSize) ? Math.min(96, Math.max(6, fontSize)) : 12,
    lineHeight: Number.isFinite(lineHeight) ? Math.min(3, Math.max(0.8, Math.round(lineHeight * 100) / 100)) : 1.35,
    align: textAligns.has(paragraph.align) ? paragraph.align : "left",
    bold: Boolean(paragraph.bold),
    italic: Boolean(paragraph.italic),
    color,
  };
}

function cleanImage(image: SavedImage): SavedImage {
  const width = Number(image.width);
  return {
    id: String(image.id).slice(0, 40),
    align: imageAligns.has(image.align) ? image.align : "left",
    width: Number.isFinite(width) ? Math.min(100, Math.max(10, Math.round(width))) : 40,
  };
}

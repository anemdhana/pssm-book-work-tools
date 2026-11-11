import { readFile, stat } from "fs/promises";
import path from "path";
import { fontFromPdf } from "@/lib/fonts";
import { encodePng } from "@/lib/png";
import type { PageImage, PageText, SavedText } from "@/lib/pageTypes";
import type { Book } from "@/lib/types";
import { PdfImportError } from "@/lib/pdf";

type PdfImage = {
  width?: number;
  height?: number;
  kind?: number;
  data?: Uint8Array;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{
    items: unknown[];
    styles: Record<string, { fontFamily?: string } | undefined>;
  }>;
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
  objs: { has: (name: string) => boolean; get: (name: string) => PdfImage | Promise<PdfImage> };
};

type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

export type LaidOutImage = Omit<PageImage, "src"> & { png: Buffer; top: number; bottom: number };
export type LaidOutText = PageText & { top: number; bottom: number };

export type LaidOutPage = {
  pageNumber: number;
  pageCount: number;
  width: number;
  height: number;
  texts: LaidOutText[];
  images: LaidOutImage[];
};

const openByKey = new Map<string, PdfDoc>();
let chain: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readPage(book: Book, pageNumber: number) {
  return exclusive(() => readPageUnlocked(book, pageNumber));
}

export function withBookPdf<T>(book: Book, task: (read: (pageNumber: number) => Promise<LaidOutPage>) => Promise<T>) {
  return exclusive(() => task((pageNumber) => readPageUnlocked(book, pageNumber)));
}

async function readPageUnlocked(book: Book, pageNumber: number): Promise<LaidOutPage> {
  const pdf = await openPdf(book);
  if (pageNumber < 1 || pageNumber > pdf.numPages) throw new PdfImportError("That page is not in this book.");
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const width = viewport.width;
  const height = viewport.height;
  const [texts, images] = await Promise.all([textBlocks(page, width, height), imageBlocks(page, width, height)]);
  return { pageNumber, pageCount: pdf.numPages, width, height, texts, images };
}

export function applyTextEdits(texts: LaidOutText[], saved: SavedText[] | undefined): LaidOutText[] {
  if (!saved?.length) return texts;
  const byId = new Map(saved.map((text) => [text.id, text]));
  return texts.map((text) => {
    const edit = byId.get(text.id);
    if (!edit) return text;
    return { ...text, ...edit, id: text.id, x: text.x, y: text.y, w: text.w, h: text.h, top: text.top, bottom: text.bottom };
  });
}

function pdfPath(book: Book) {
  const name = book.storedFile;
  if (!name || name !== path.basename(name) || name.includes("..")) return null;
  return path.join(process.cwd(), "data", "uploads", name);
}

async function openPdf(book: Book): Promise<PdfDoc> {
  const filePath = pdfPath(book);
  if (!filePath) throw new PdfImportError("The original PDF is missing.");
  const info = await stat(filePath);
  const key = `${book.id}:${info.mtimeMs}:${info.size}`;
  const cached = openByKey.get(key);
  if (cached) return cached;
  openByKey.clear();
  const bytes = new Uint8Array(await readFile(filePath));
  const { getDocumentProxy } = await import("unpdf");
  const pdf = (await getDocumentProxy(bytes.slice())) as PdfDoc;
  openByKey.set(key, pdf);
  return pdf;
}

type Glyph = { str: string; x: number; y: number; w: number; h: number; size: number; fontFamily: string };

async function textBlocks(page: PdfPage, pageWidth: number, pageHeight: number): Promise<LaidOutText[]> {
  const content = await page.getTextContent();
  const glyphs = dedupe(content.items.flatMap((item) => glyphFrom(item, content.styles)));
  glyphs.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Glyph[][] = [];
  for (const glyph of glyphs) {
    const last = lines[lines.length - 1];
    const head = last?.[0];
    if (head && Math.abs(head.y - glyph.y) < Math.max(2, glyph.size * 0.45)) last.push(glyph);
    else lines.push([glyph]);
  }

  const blocks: LaidOutText[] = [];
  lines.forEach((parts) => {
    const ordered = [...parts].sort((a, b) => a.x - b.x);
    const columns: Glyph[][] = [];
    for (const part of ordered) {
      const column = columns[columns.length - 1];
      const previous = column?.[column.length - 1];
      const gap = previous ? part.x - (previous.x + previous.w) : 0;
      if (!column || gap > Math.max(part.size * 1.4, 16)) columns.push([part]);
      else column.push(part);
    }
    for (const column of columns) {
      let text = "";
      let cursor = 0;
      for (const part of column) {
        if (text && part.x - cursor > part.size * 0.18 && !text.endsWith(" ") && !part.str.startsWith(" ")) text += " ";
        text += part.str;
        cursor = part.x + part.w;
      }
      text = text.replace(/[ \t]+/g, " ").trim();
      if (!text) continue;
      const first = column[0];
      const last = column[column.length - 1];
      const size = Math.max(...column.map((part) => part.size));
      const pdfX = first.x;
      const measured = Math.max(size, last.x + last.w - first.x);
      const estimated = text.length * size * 0.58;
      const pdfW = Math.min(Math.max(0, pageWidth - pdfX - 6), Math.max(measured, estimated));
      const pdfTop = first.y + size * 0.92;
      const pdfBottom = first.y - size * 0.25;
      blocks.push({
        id: `t${blocks.length}`,
        text,
        x: (pdfX / pageWidth) * 100,
        y: ((pageHeight - pdfTop) / pageHeight) * 100,
        w: Math.max(4, (pdfW / pageWidth) * 100),
        h: Math.max(1.2, ((pdfTop - pdfBottom) / pageHeight) * 100),
        fontSize: Math.round(size * 10) / 10,
        fontFamily: fontFromPdf(first.fontFamily, text),
        align: "left",
        bold: false,
        italic: false,
        color: "#1a1a1a",
        top: pdfTop,
        bottom: pdfBottom,
      });
    }
  });
  return blocks;
}

function glyphFrom(item: unknown, styles: Record<string, { fontFamily?: string } | undefined>): Glyph[] {
  if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) return [];
  const raw = item as { str: string; transform: number[]; width?: number; height?: number; fontName?: string };
  if (!raw.str?.trim() || raw.transform.length < 6) return [];
  const size = Math.hypot(raw.transform[0], raw.transform[1]) || raw.height || 12;
  return [
    {
      str: raw.str,
      x: raw.transform[4],
      y: raw.transform[5],
      w: raw.width || Math.max(1, raw.str.length * size * 0.45),
      h: raw.height || size,
      size,
      fontFamily: styles[raw.fontName ?? ""]?.fontFamily || "serif",
    },
  ];
}

function dedupe(glyphs: Glyph[]) {
  const sorted = [...glyphs].sort((a, b) => b.str.length - a.str.length);
  const kept: Glyph[] = [];
  for (const glyph of sorted) {
    const hidden = kept.some((other) => {
      const yClose = Math.abs(other.y - glyph.y) < Math.max(3, glyph.size * 0.4);
      const overlaps = glyph.x < other.x + other.w - 1 && other.x < glyph.x + glyph.w - 1;
      if (!yClose || !overlaps) return false;
      return other.str === glyph.str || (other.str.includes(glyph.str) && glyph.str.length < other.str.length);
    });
    if (!hidden) kept.push(glyph);
  }
  return kept;
}

async function imageBlocks(page: PdfPage, pageWidth: number, pageHeight: number): Promise<LaidOutImage[]> {
  const { OPS } = await import("unpdf/pdfjs");
  const opList = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const images: LaidOutImage[] = [];

  for (let index = 0; index < opList.fnArray.length; index += 1) {
    const fn = opList.fnArray[index];
    const args = opList.argsArray[index];
    if (fn === OPS.save) stack.push(ctm.slice());
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform && Array.isArray(args) && args.length >= 6) ctm = multiply(ctm, args as number[]);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const placed = await placeImage(page, args, ctm, pageWidth, pageHeight, images.length);
      if (!placed) continue;
      const duplicate = images.some((image) => Math.abs(image.x - placed.x) < 0.4 && Math.abs(image.y - placed.y) < 0.4 && Math.abs(image.w - placed.w) < 0.4);
      if (!duplicate) images.push(placed);
    }
  }
  return images;
}

async function placeImage(page: PdfPage, args: unknown, ctm: number[], pageWidth: number, pageHeight: number, index: number) {
  let boxW = ctm[0];
  let boxH = ctm[3];
  let boxX = ctm[4];
  let boxY = ctm[5];
  if (boxW < 0) {
    boxX += boxW;
    boxW = -boxW;
  }
  if (boxH < 0) {
    boxY += boxH;
    boxH = -boxH;
  }
  if (boxW < 2 || boxH < 2) return null;
  const source = await imageSource(page, args);
  if (!source) return null;
  const png = pngFromImage(source, Math.max(48, Math.round(boxW * 2)));
  if (!png) return null;
  const pdfTop = boxY + boxH;
  return {
    id: `i${index}`,
    x: (boxX / pageWidth) * 100,
    y: ((pageHeight - pdfTop) / pageHeight) * 100,
    w: (boxW / pageWidth) * 100,
    h: (boxH / pageHeight) * 100,
    png,
    top: pdfTop,
    bottom: boxY,
  };
}

async function imageSource(page: PdfPage, args: unknown): Promise<PdfImage | null> {
  const name = Array.isArray(args) ? args[0] : null;
  if (typeof name === "string" && page.objs.has(name)) {
    const found = page.objs.get(name);
    return typeof (found as Promise<PdfImage>)?.then === "function" ? await found : found;
  }
  if (name && typeof name === "object") return name as PdfImage;
  return null;
}

function pngFromImage(source: PdfImage, maxWidth: number) {
  const width = source.width ?? 0;
  const height = source.height ?? 0;
  const data = source.data;
  if (!width || !height || !data) return null;
  try {
    let pixels = data;
    let channels: 3 | 4 = 3;
    if (source.kind === 3 && data.length >= width * height * 4) channels = 4;
    else if (data.length < width * height * 3 && data.length >= width * height) {
      pixels = new Uint8Array(width * height * 3);
      for (let index = 0; index < width * height; index += 1) {
        const gray = data[index] ?? 0;
        pixels[index * 3] = gray;
        pixels[index * 3 + 1] = gray;
        pixels[index * 3 + 2] = gray;
      }
    } else if (data.length < width * height * 3) return null;
    const fitted = fitWidth(pixels, width, height, channels, maxWidth);
    return encodePng(fitted.width, fitted.height, fitted.pixels, 3);
  } catch (error) {
    console.error("Skipping an image", error);
  }
  return null;
}

function fitWidth(pixels: Uint8Array, width: number, height: number, channels: 3 | 4, maxWidth: number) {
  if (width <= maxWidth) {
    if (channels === 3) return { pixels, width, height };
    const rgb = new Uint8Array(width * height * 3);
    for (let index = 0; index < width * height; index += 1) {
      rgb[index * 3] = pixels[index * 4] ?? 0;
      rgb[index * 3 + 1] = pixels[index * 4 + 1] ?? 0;
      rgb[index * 3 + 2] = pixels[index * 4 + 2] ?? 0;
    }
    return { pixels: rgb, width, height };
  }
  const nextWidth = maxWidth;
  const nextHeight = Math.max(1, Math.round((height * maxWidth) / width));
  const rgb = new Uint8Array(nextWidth * nextHeight * 3);
  for (let y = 0; y < nextHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y * height) / nextHeight));
    for (let x = 0; x < nextWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x * width) / nextWidth));
      const from = (sourceY * width + sourceX) * channels;
      const to = (y * nextWidth + x) * 3;
      rgb[to] = pixels[from] ?? 0;
      rgb[to + 1] = pixels[from + (channels > 1 ? 1 : 0)] ?? 0;
      rgb[to + 2] = pixels[from + (channels > 2 ? 2 : 0)] ?? 0;
    }
  }
  return { pixels: rgb, width: nextWidth, height: nextHeight };
}

function multiply(left: number[], right: number[]) {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2, a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1];
}

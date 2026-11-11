import type { BookSection, SplitBy } from "@/lib/types";

export class PdfImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfImportError";
  }
}

export type ExtractedBook = {
  title: string;
  pageCount: number;
  splitBy: SplitBy;
  sections: Array<Omit<BookSection, "id" | "order">>;
};

type Line = { text: string; y: number; size: number };
type Draft = { title: string; pageStart: number | null; paragraphs: string[] };

type OutlineNode = {
  title?: string;
  dest?: string | unknown[] | null;
  items?: OutlineNode[];
};

type PdfDoc = {
  numPages: number;
  getOutline: () => Promise<OutlineNode[] | null>;
  getDestination: (dest: string) => Promise<unknown[] | null>;
  getPageIndex: (ref: unknown) => Promise<number>;
  destroy?: () => Promise<void> | void;
};

const CHAPTER = /^(chapter|part|section|book|అధ్యాయం|అధ్యాయము|భాగం|పాఠం)\b/i;

type StructuredItem = { str: string; x: number; y: number; width: number; height: number; fontSize: number };

/** Turn PDF text into sections: bookmarks, then larger or isolated headings, then one section per page. */
export async function extractPdf(bytes: Uint8Array, sourceName: string, titleOverride?: string): Promise<ExtractedBook> {
  const { getDocumentProxy, extractTextItems, getMeta } = await import("unpdf");
  const pdf = (await getDocumentProxy(bytes)) as PdfDoc;
  try {
    const extracted = await extractTextItems(pdf as never);
    const rawPages = extracted.items.map((items) => linesFromStructured(items));
    const pages = stripFurniture(rawPages);
    const pageCount = extracted.totalPages;
    const gap = typicalGap(pages);
    const size = bodySize(pages);
    const outlined = await sectionsFromOutline(pdf, pages, gap);
    const headed = outlined ? null : sectionsFromHeadings(pages, gap, size);
    const chosen = outlined ?? headed ?? pageSections(pages, gap);
    const splitBy: SplitBy = outlined ? "outline" : headed ? "headings" : "pages";
    const sections = chosen.filter((section) => section.paragraphs.some((paragraph) => paragraph.trim()));
    if (!sections.length) {
      throw new PdfImportError("No selectable text in this PDF. Scanned pages need a text layer before they can be edited.");
    }
    const title = (titleOverride?.trim() || (await metadataTitle(pdf, getMeta)) || titleFromFilename(sourceName) || "Untitled book").slice(0, 180);
    if (sections.length === 1 && sections[0].title.startsWith("Page ")) sections[0].title = title;
    return { title, pageCount, splitBy, sections };
  } finally {
    await pdf.destroy?.();
  }
}

async function metadataTitle(pdf: PdfDoc, getMeta: (data: never) => Promise<{ info: Record<string, unknown> }>) {
  try {
    const meta = await getMeta(pdf as never);
    const raw = meta?.info?.Title;
    const title = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
    return title.length >= 2 ? title : "";
  } catch {
    return "";
  }
}

function titleFromFilename(name: string) {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.pdf$/i, "");
  return base.replace(/[_]+/g, " ").trim();
}

type Glyph = { str: string; x: number; y: number; size: number; width: number };

function linesFromStructured(items: StructuredItem[]): Line[] {
  const glyphs: Glyph[] = items
    .filter((item) => item.str)
    .map((item) => ({
      str: item.str,
      x: item.x,
      y: item.y,
      size: Math.abs(item.fontSize || item.height || 12),
      width: item.width,
    }));
  glyphs.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: { parts: Glyph[]; y: number; size: number }[] = [];
  for (const glyph of glyphs) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - glyph.y) < Math.max(2, glyph.size * 0.4)) {
      last.parts.push(glyph);
      last.size = Math.max(last.size, glyph.size);
    } else {
      rows.push({ parts: [glyph], y: glyph.y, size: glyph.size });
    }
  }

  return rows
    .map((row) => {
      const parts = [...row.parts].sort((a, b) => a.x - b.x);
      let text = "";
      let cursor = 0;
      for (const part of parts) {
        if (text) {
          const gap = part.x - cursor;
          if (gap > part.size * 0.18 && !text.endsWith(" ") && !part.str.startsWith(" ")) text += " ";
        }
        text += part.str;
        cursor = part.x + (part.width || part.str.length * part.size * 0.45);
      }
      return { text: text.replace(/\s+/g, " ").trim(), y: row.y, size: row.size };
    })
    .filter((line) => line.text.length > 0);
}

function stripFurniture(pages: Line[][]) {
  const threshold = Math.max(2, Math.ceil(pages.length * 0.4));
  const firstCounts = new Map<string, number>();
  const lastCounts = new Map<string, number>();
  if (pages.length >= 2) {
    for (const lines of pages) {
      if (!lines.length) continue;
      countLine(firstCounts, lines[0].text);
      countLine(lastCounts, lines[lines.length - 1].text);
    }
  }
  const repeatedFirst = repeated(firstCounts, threshold);
  const repeatedLast = repeated(lastCounts, threshold);

  return pages.map((lines) => {
    let next = lines;
    if (next.length > 1 && repeatedFirst.has(next[0].text)) next = next.slice(1);
    while (next.length > 1 && (repeatedLast.has(next[next.length - 1].text) || /^\d{1,4}$/.test(next[next.length - 1].text))) {
      next = next.slice(0, -1);
    }
    return next;
  });
}

function countLine(counts: Map<string, number>, text: string) {
  if (!text || text.length > 80) return;
  counts.set(text, (counts.get(text) ?? 0) + 1);
}

function repeated(counts: Map<string, number>, threshold: number) {
  return new Set([...counts].filter(([, count]) => count >= threshold).map(([text]) => text));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function typicalGap(pages: Line[][]) {
  const gaps: number[] = [];
  for (const lines of pages) {
    for (let index = 1; index < lines.length; index += 1) {
      const gap = lines[index - 1].y - lines[index].y;
      if (gap > 0 && gap < 80) gaps.push(gap);
    }
  }
  if (!gaps.length) return 14;
  const sorted = [...gaps].sort((a, b) => a - b);
  // Paragraph breaks are the larger gaps. Line spacing is the cluster at the small end.
  const lower = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.4)));
  return median(lower) || 14;
}

function bodySize(pages: Line[][]) {
  const sizes = pages.flatMap((lines) => lines.map((line) => line.size)).filter((size) => size > 0);
  return median(sizes) || 12;
}

function paragraphsFromLines(lines: Line[], gap: number) {
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = joinLines(buffer);
    buffer = [];
    if (!text) return;
    paragraphs.push(...chunkParagraph(text));
  };

  lines.forEach((line, index) => {
    const distance = index === 0 ? 0 : lines[index - 1].y - line.y;
    if (index > 0 && distance > gap * 1.55) flush();
    buffer.push(line.text);
  });
  flush();
  return paragraphs;
}

function joinLines(parts: string[]) {
  let out = "";
  for (const part of parts) {
    if (!out) {
      out = part;
      continue;
    }
    if (/[A-Za-z]-$/.test(out)) out = `${out.slice(0, -1)}${part}`;
    else out = `${out} ${part}`;
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

function chunkParagraph(text: string, max = 4000) {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("। "), slice.lastIndexOf(" "));
    const at = cut > max * 0.5 ? cut + 1 : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function isHeading(line: Line, size: number, gapBefore: number, gapAfter: number, gap: number) {
  const text = line.text.trim();
  const words = text.split(/\s+/).length;
  if (text.length < 2 || text.length > 80 || words > 12) return false;
  if (!/\p{L}/u.test(text)) return false;
  if (CHAPTER.test(text)) return true;
  if (line.size < size * 0.9) return false;
  const bigger = line.size >= size * 1.15;
  const isolated = gapBefore > gap * 1.4 && gapAfter > gap * 1.25;
  if (bigger && !/[।.!?]$/.test(text)) return true;
  if (isolated && words <= 8 && !/[।.!?,:;]$/.test(text) && text.length <= 48) return true;
  return false;
}

function sectionsFromHeadings(pages: Line[][], gap: number, size: number): Draft[] | null {
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let headingCount = 0;
  let lineCount = 0;

  const pushCurrent = () => {
    if (!current) return;
    if (current.paragraphs.some((paragraph) => paragraph.trim()) || current.title !== "Opening") drafts.push(current);
    current = null;
  };

  pages.forEach((lines, pageIndex) => {
    const pageNumber = pageIndex + 1;
    let buffer: string[] = [];
    const flush = () => {
      const text = joinLines(buffer);
      buffer = [];
      if (!text) return;
      let draft = current;
      if (!draft) {
        draft = { title: "Opening", pageStart: pageNumber, paragraphs: [] };
        current = draft;
      }
      draft.paragraphs.push(...chunkParagraph(text));
    };

    lines.forEach((line, index) => {
      lineCount += 1;
      const gapBefore = index === 0 ? gap * 2 : lines[index - 1].y - line.y;
      const gapAfter = index === lines.length - 1 ? gap * 2 : line.y - lines[index + 1].y;
      if (isHeading(line, size, gapBefore, gapAfter, gap)) {
        flush();
        pushCurrent();
        headingCount += 1;
        current = { title: line.text, pageStart: pageNumber, paragraphs: [] };
        return;
      }
      if (index > 0 && gapBefore > gap * 1.55) flush();
      buffer.push(line.text);
    });
    flush();
  });
  pushCurrent();

  if (headingCount < 2 || headingCount > lineCount * 0.35) return null;
  return drafts.map((draft) => ({ ...draft, paragraphs: dropTitleEcho(draft.title, draft.paragraphs) }));
}

function pageSections(pages: Line[][], gap: number): Draft[] {
  return pages.flatMap((lines, index) => {
    const paragraphs = paragraphsFromLines(lines, gap);
    if (!paragraphs.length) return [];
    return [{ title: `Page ${index + 1}`, pageStart: index + 1, paragraphs }];
  });
}

async function sectionsFromOutline(pdf: PdfDoc, pages: Line[][], gap: number): Promise<Draft[] | null> {
  let outline: OutlineNode[] | null = null;
  try {
    outline = await pdf.getOutline();
  } catch {
    return null;
  }
  if (!outline?.length) return null;

  const marks: { title: string; page: number }[] = [];
  for (const node of outline) {
    const page = await firstPage(pdf, node);
    const title = node.title?.replace(/\s+/g, " ").trim() ?? "";
    if (!page || !title) continue;
    if (marks.some((mark) => mark.page === page)) continue;
    marks.push({ title: title.slice(0, 180), page });
  }
  if (marks.length < 2) return null;
  marks.sort((a, b) => a.page - b.page);

  const sections: Draft[] = [];
  if (marks[0].page > 1) {
    const opening = pages.slice(0, marks[0].page - 1).flatMap((lines) => paragraphsFromLines(lines, gap));
    if (opening.length) sections.push({ title: "Opening", pageStart: 1, paragraphs: opening });
  }

  for (let index = 0; index < marks.length; index += 1) {
    const start = marks[index].page;
    const end = index + 1 < marks.length ? Math.max(start, marks[index + 1].page - 1) : pages.length;
    const paragraphs = dropTitleEcho(
      marks[index].title,
      pages.slice(start - 1, end).flatMap((lines) => paragraphsFromLines(lines, gap)),
    );
    sections.push({
      title: marks[index].title,
      pageStart: start,
      paragraphs: paragraphs.length ? paragraphs : [""],
    });
  }

  const withText = sections.filter((section) => section.paragraphs.some((paragraph) => paragraph.trim()));
  return withText.length >= 2 ? withText : null;
}

async function firstPage(pdf: PdfDoc, node: OutlineNode): Promise<number | null> {
  const own = await destPage(pdf, node.dest);
  if (own) return own;
  for (const child of node.items ?? []) {
    const page = await firstPage(pdf, child);
    if (page) return page;
  }
  return null;
}

async function destPage(pdf: PdfDoc, dest: OutlineNode["dest"]) {
  if (!dest) return null;
  try {
    const explicit = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    if (!Array.isArray(explicit) || explicit[0] == null) return null;
    const ref = explicit[0];
    if (typeof ref === "number") return ref >= 0 && ref < pdf.numPages ? ref + 1 : null;
    const index = await pdf.getPageIndex(ref);
    return index + 1;
  } catch {
    return null;
  }
}

function dropTitleEcho(title: string, paragraphs: string[]) {
  if (!paragraphs.length) return paragraphs;
  const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  if (norm(paragraphs[0]) === norm(title)) return paragraphs.slice(1);
  return paragraphs;
}

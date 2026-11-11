import type { LaidOutImage, LaidOutPage, LaidOutText } from "@/lib/pageLayout";
import type { FlowParagraph, ImageAlign, SavedPage, TextAlign } from "@/lib/pageTypes";

export type ComposedImage = {
  kind: "image";
  id: string;
  align: ImageAlign;
  width: number;
  png: Buffer;
  aspect: number;
};

export type ComposedBlock = FlowParagraph | ComposedImage;

type DraftParagraph = FlowParagraph & { top: number; bottom: number; left: number; right: number };
type DraftImage = ComposedImage & { top: number; bottom: number; x: number };

export function composePage(page: LaidOutPage, saved?: SavedPage): ComposedBlock[] {
  const paragraphs = groupParagraphs(page.texts).map((lines, index) => draftParagraph(lines, index, saved));
  const images = page.images.map((image) => draftImage(image, page, paragraphs, saved));
  return orderBlocks(paragraphs, images);
}

function groupParagraphs(texts: LaidOutText[]) {
  const lines = texts.filter((text) => text.text.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: LaidOutText[][] = [];
  for (const line of lines) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    if (previous && joins(previous, line)) group.push(line);
    else groups.push([line]);
  }
  return groups;
}

function joins(previous: LaidOutText, line: LaidOutText) {
  if (Math.abs(previous.fontSize - line.fontSize) > Math.max(1.6, previous.fontSize * 0.22)) return false;
  const gap = line.y - (previous.y + previous.h);
  const lineHeight = Math.max(previous.h, line.h, 0.6);
  if (gap > lineHeight * 0.35 || gap < -lineHeight) return false;
  return Math.abs(previous.x - line.x) < 4.5;
}

function draftParagraph(lines: LaidOutText[], index: number, saved?: SavedPage): DraftParagraph {
  const base: DraftParagraph = {
    kind: "paragraph",
    id: `p${index}`,
    text: lines
      .map((line) => line.text.trim())
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim(),
    fontFamily: lines[0]?.fontFamily ?? "Georgia",
    fontSize: medianSize(lines),
    lineHeight: 1.35,
    align: paragraphAlign(lines),
    bold: false,
    italic: false,
    color: "#1a1a1a",
    top: Math.min(...lines.map((line) => line.y)),
    bottom: Math.max(...lines.map((line) => line.y + line.h)),
    left: Math.min(...lines.map((line) => line.x)),
    right: Math.max(...lines.map((line) => line.x + line.w)),
  };
  const edit = saved?.paragraphs.find((paragraph) => paragraph.id === base.id);
  if (!edit) return base;
  return { ...base, ...edit, kind: "paragraph", id: base.id, top: base.top, bottom: base.bottom };
}

function draftImage(image: LaidOutImage, page: LaidOutPage, paragraphs: DraftParagraph[], saved?: SavedPage): DraftImage {
  const widthPt = Math.max(1, (image.w / 100) * page.width);
  const heightPt = Math.max(1, (image.h / 100) * page.height);
  const base: DraftImage = {
    kind: "image",
    id: image.id,
    align: inferAlign(image, paragraphs),
    width: Math.min(100, Math.max(10, Math.round(image.w))),
    png: image.png,
    aspect: heightPt / widthPt,
    top: image.y,
    bottom: image.y + image.h,
    x: image.x,
  };
  const edit = saved?.images.find((item) => item.id === image.id);
  if (!edit) return base;
  return { ...base, align: edit.align, width: edit.width };
}

function inferAlign(image: LaidOutImage, paragraphs: DraftParagraph[]): ImageAlign {
  const bottom = image.y + image.h;
  const right = image.x + image.w;
  const beside = paragraphs.filter((paragraph) => overlap(paragraph.top, paragraph.bottom, image.y, bottom) > 0.2);
  const textOnRight = beside.some((paragraph) => paragraph.left >= right - 8);
  const textOnLeft = beside.some((paragraph) => paragraph.right <= image.x + 8);
  if (textOnRight && !textOnLeft) return "left";
  if (textOnLeft && !textOnRight) return "right";
  if (image.w >= 75) return "center";
  const mid = image.x + image.w / 2;
  if (mid < 42) return "left";
  if (mid > 58) return "right";
  return "center";
}

function paragraphAlign(lines: LaidOutText[]): TextAlign {
  const left = Math.min(...lines.map((line) => line.x));
  const right = Math.max(...lines.map((line) => line.x + line.w));
  const mid = (left + right) / 2;
  if (left > 15 && right < 88 && Math.abs(mid - 50) < 14) return "center";
  return "left";
}

function medianSize(lines: LaidOutText[]) {
  const sizes = lines.map((line) => line.fontSize).sort((a, b) => a - b);
  const mid = sizes[Math.floor(sizes.length / 2)] ?? 12;
  return Math.round(mid * 2) / 2;
}

function orderBlocks(paragraphs: DraftParagraph[], images: DraftImage[]): ComposedBlock[] {
  const placed = new Set<string>();
  const output: ComposedBlock[] = [];
  const ordered = [...paragraphs, ...images].sort((a, b) => a.top - b.top || ("x" in a ? a.x : 0) - ("x" in b ? b.x : 0));
  for (const item of ordered) {
    if (item.kind === "image") {
      if (placed.has(item.id)) continue;
      output.push(stripImage(item));
      placed.add(item.id);
      continue;
    }
    const floats = images
      .filter((image) => image.align !== "center" && !placed.has(image.id) && overlap(item.top, item.bottom, image.top, image.bottom) > 0.2)
      .sort((a, b) => a.x - b.x);
    for (const image of floats) {
      output.push(stripImage(image));
      placed.add(image.id);
    }
    output.push(stripParagraph(item));
  }
  return output;
}

function overlap(topA: number, bottomA: number, topB: number, bottomB: number) {
  const shared = Math.min(bottomA, bottomB) - Math.max(topA, topB);
  const height = Math.max(1, Math.min(bottomA - topA, bottomB - topB));
  return shared / height;
}

function stripParagraph(paragraph: DraftParagraph): FlowParagraph {
  return {
    kind: "paragraph",
    id: paragraph.id,
    text: paragraph.text,
    fontFamily: paragraph.fontFamily,
    fontSize: paragraph.fontSize,
    lineHeight: paragraph.lineHeight,
    align: paragraph.align,
    bold: paragraph.bold,
    italic: paragraph.italic,
    color: paragraph.color,
  };
}

function stripImage(image: DraftImage): ComposedImage {
  return {
    kind: "image",
    id: image.id,
    align: image.align,
    width: image.width,
    png: image.png,
    aspect: image.aspect,
  };
}

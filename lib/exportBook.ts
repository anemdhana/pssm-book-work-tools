import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import JSZip from "jszip";
import { composePage, type ComposedBlock, type ComposedImage } from "@/lib/flow";
import { withBookPdf, type LaidOutPage } from "@/lib/pageLayout";
import { loadPageEdits } from "@/lib/pageEdits";
import type { FlowParagraph, TextAlign } from "@/lib/pageTypes";
import type { Book } from "@/lib/types";

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

export function downloadBase(title: string) {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || "book";
}

export async function buildDocx(book: Book) {
  const edits = await loadPageEdits(book.id);
  const built = await withBookPdf(book, async (readPage) => {
    const blocks: (Paragraph | Table)[] = [];
    let width = 576;
    let height = 576;
    for (let pageNumber = 1; pageNumber <= book.pageCount; pageNumber += 1) {
      if (pageNumber > 1) blocks.push(new Paragraph({ children: [new PageBreak()] }));
      try {
        const laid = await readPage(pageNumber);
        width = laid.width;
        height = laid.height;
        blocks.push(...pageBlocks(composePage(laid, edits[String(pageNumber)]), laid));
      } catch (error) {
        console.error(`Skipping page ${pageNumber}`, error);
        blocks.push(new Paragraph({ children: [new TextRun(`Page ${pageNumber} could not be read.`)] }));
      }
    }
    return { blocks, width, height };
  });

  const doc = new Document({
    title: book.title,
    sections: [
      {
        properties: {
          page: {
            size: { width: Math.round(built.width * 20), height: Math.round(built.height * 20) },
            margin: { top: 360, bottom: 360, left: 360, right: 360 },
          },
        },
        children: built.blocks,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildMarkdownZip(book: Book) {
  const edits = await loadPageEdits(book.id);
  const zip = new JSZip();
  const base = downloadBase(book.title);
  const parts: string[] = [`# ${book.title}`, ""];
  await withBookPdf(book, async (readPage) => {
    for (let pageNumber = 1; pageNumber <= book.pageCount; pageNumber += 1) {
      try {
        const laid = await readPage(pageNumber);
        parts.push(markdownPage(composePage(laid, edits[String(pageNumber)]), laid, zip));
      } catch (error) {
        console.error(`Skipping page ${pageNumber}`, error);
        parts.push(`## Page ${pageNumber}`, "", "_This page could not be read._", "");
      }
    }
  });
  zip.file(`${base}.md`, parts.join("\n"));
  return zip.generateAsync({ type: "nodebuffer" });
}

function pageBlocks(blocks: ComposedBlock[], page: LaidOutPage) {
  const output: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: `Page ${page.pageNumber}`, italics: true, size: 16, color: "8A7A68", font: "Georgia" })],
    }),
  ];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (block.kind === "image" && block.align !== "center") {
      const images: ComposedImage[] = [];
      const align = block.align;
      while (index < blocks.length && blocks[index].kind === "image" && blocks[index].align === align) {
        images.push(blocks[index] as ComposedImage);
        index += 1;
      }
      const paragraphs: FlowParagraph[] = [];
      while (index < blocks.length && blocks[index].kind === "paragraph" && (blocks[index] as FlowParagraph).align !== "center") {
        paragraphs.push(blocks[index] as FlowParagraph);
        index += 1;
      }
      output.push(sideBySide(images, paragraphs, align, page));
      continue;
    }
    if (block.kind === "image") {
      output.push(imageParagraph(block, page, AlignmentType.CENTER));
      index += 1;
      continue;
    }
    output.push(textParagraph(block));
    index += 1;
  }
  return output;
}

function sideBySide(images: ComposedImage[], paragraphs: FlowParagraph[], align: "left" | "right", page: LaidOutPage) {
  const imageWidth = Math.min(78, images.reduce((sum, image) => sum + image.width, 0));
  const textWidth = Math.max(22, 100 - imageWidth);
  const picture = new TableCell({
    width: { size: imageWidth, type: WidthType.PERCENTAGE },
    borders,
    verticalAlign: VerticalAlign.TOP,
    children: images.map((image) => imageParagraph(image, page, AlignmentType.LEFT)),
  });
  const copy = new TableCell({
    width: { size: textWidth, type: WidthType.PERCENTAGE },
    borders,
    verticalAlign: VerticalAlign.TOP,
    children: paragraphs.length ? paragraphs.map((paragraph) => textParagraph(paragraph)) : [new Paragraph("")],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [new TableRow({ cantSplit: true, children: align === "right" ? [copy, picture] : [picture, copy] })],
  });
}

function textParagraph(paragraph: FlowParagraph) {
  return new Paragraph({
    alignment: alignmentOf(paragraph.align),
    spacing: { before: 40, after: 80, line: Math.round(paragraph.lineHeight * 240), lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: paragraph.text,
        font: paragraph.fontFamily,
        size: Math.max(8, Math.round(paragraph.fontSize * 2)),
        bold: paragraph.bold,
        italics: paragraph.italic,
        color: paragraph.color.replace("#", ""),
      }),
    ],
  });
}

function imageParagraph(image: ComposedImage, page: LaidOutPage, alignment: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  const contentPx = ((page.width - 36) * 96) / 72;
  const width = Math.max(24, Math.round((contentPx * image.width) / 100));
  const height = Math.max(24, Math.round(width * image.aspect));
  return new Paragraph({
    alignment,
    spacing: { after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: image.png,
        transformation: { width, height },
      }),
    ],
  });
}

function alignmentOf(align: TextAlign) {
  if (align === "center") return AlignmentType.CENTER;
  if (align === "right") return AlignmentType.RIGHT;
  if (align === "justify") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function markdownPage(blocks: ComposedBlock[], page: LaidOutPage, zip: JSZip) {
  const lines = [`## Page ${page.pageNumber}`, ""];
  let imageCount = 0;
  for (const block of blocks) {
    if (block.kind === "paragraph") {
      const style = [
        `text-align:${block.align}`,
        `font-family:${block.fontFamily}`,
        `font-size:${block.fontSize}pt`,
        `line-height:${block.lineHeight}`,
        block.bold ? "font-weight:bold" : "",
        block.italic ? "font-style:italic" : "",
        `color:${block.color}`,
      ]
        .filter(Boolean)
        .join(";");
      lines.push(`<p style="${style}">${escapeHtml(block.text)}</p>`, "");
      continue;
    }
    imageCount += 1;
    const name = `images/page-${String(page.pageNumber).padStart(3, "0")}-${imageCount}.png`;
    zip.file(name, block.png);
    const style =
      block.align === "center"
        ? `width:${block.width}%; display:block; margin:8px auto; clear:both;`
        : `width:${block.width}%; float:${block.align}; margin:${block.align === "left" ? "0 12px 8px 0" : "0 0 8px 12px"};`;
    lines.push(`<img src="${name}" alt="" style="${style}" />`, "");
  }
  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

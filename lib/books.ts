import { mkdir, readFile, readdir, rm, writeFile, rename } from "fs/promises";
import path from "path";
import { isSafeId, newId } from "@/lib/ids";
import { removePageEdits } from "@/lib/pageEdits";
import { extractPdf, PdfImportError } from "@/lib/pdf";
import type { Book, BookSection, BookSummary } from "@/lib/types";

const booksDir = path.join(process.cwd(), "data", "books");
const uploadsDir = path.join(process.cwd(), "data", "uploads");
const maxBytes = 40 * 1024 * 1024;

function bookPath(id: string) {
  if (!isSafeId(id)) return null;
  return path.join(booksDir, `${id}.json`);
}

export async function listBooks(): Promise<BookSummary[]> {
  await mkdir(booksDir, { recursive: true });
  const names = await readdir(booksDir);
  const books: BookSummary[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const book = JSON.parse(await readFile(path.join(booksDir, name), "utf8")) as Book;
      books.push(summarize(book));
    } catch (error) {
      console.error(`Skipping ${name}`, error);
    }
  }
  books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return books;
}

export async function loadBook(id: string): Promise<Book | null> {
  const target = bookPath(id);
  if (!target) return null;
  try {
    return JSON.parse(await readFile(target, "utf8")) as Book;
  } catch {
    return null;
  }
}

export async function createBookFromUpload(file: File, title?: string): Promise<Book> {
  const bytes = await acceptedPdf(file);

  // pdf.js detaches the buffer it parses, so keep a separate copy for the upload.
  const extracted = await extractPdf(bytes.slice(), file.name, title);
  const id = newId("book");
  const storedFile = safeUploadName(id, file.name);
  const now = new Date().toISOString();
  const book: Book = {
    id,
    title: extracted.title,
    sourceFile: path.basename(file.name),
    storedFile,
    pageCount: extracted.pageCount,
    splitBy: extracted.splitBy,
    importedAt: now,
    updatedAt: now,
    sections: extracted.sections.map((section, index) => ({
      id: newId("sec"),
      order: index + 1,
      title: section.title,
      pageStart: section.pageStart,
      paragraphs: section.paragraphs.length ? section.paragraphs : [""],
    })),
  };

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, storedFile), bytes);
  await saveBook(book);
  return book;
}

export async function createPageBook(file: File, title?: string): Promise<Book> {
  const bytes = await acceptedPdf(file);
  const { getDocumentProxy, getMeta } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes.slice());
  let metaTitle = "";
  try {
    const meta = await getMeta(pdf as never);
    const raw = (meta.info as { Title?: unknown } | undefined)?.Title;
    if (typeof raw === "string") metaTitle = raw.replace(/\s+/g, " ").trim();
  } catch {
    metaTitle = "";
  }
  const id = newId("book");
  const storedFile = safeUploadName(id, file.name);
  const now = new Date().toISOString();
  const book: Book = {
    id,
    title: (title?.trim() || (metaTitle.length >= 2 ? metaTitle : "") || titleFromFilename(file.name) || "Untitled book").slice(0, 180),
    sourceFile: path.basename(file.name),
    storedFile,
    pageCount: pdf.numPages,
    splitBy: "pages",
    importedAt: now,
    updatedAt: now,
    sections: [
      {
        id: newId("sec"),
        order: 1,
        title: "Full pages",
        pageStart: 1,
        paragraphs: ["This book was imported page by page. Use Pages to edit it."],
      },
    ],
  };
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, storedFile), bytes);
  await saveBook(book);
  return book;
}

export async function renameBook(id: string, title: string): Promise<Book | null> {
  const book = await loadBook(id);
  if (!book) return null;
  book.title = title.trim().slice(0, 180) || "Untitled book";
  book.updatedAt = new Date().toISOString();
  await saveBook(book);
  return book;
}

export async function removeBook(id: string) {
  const book = await loadBook(id);
  if (!book) return false;
  const target = bookPath(id);
  if (target) await rm(target, { force: true });
  if (book.storedFile && isSafeUpload(book.storedFile)) {
    await rm(path.join(uploadsDir, book.storedFile), { force: true });
  }
  await removePageEdits(id);
  return true;
}

export async function updateSection(id: string, sectionId: string, input: { title: string; paragraphs: string[] }) {
  const book = await loadBook(id);
  if (!book) return null;
  const section = book.sections.find((item) => item.id === sectionId);
  if (!section) return null;
  section.title = input.title.trim().slice(0, 180) || "Untitled section";
  const paragraphs = input.paragraphs.map((paragraph) => paragraph.trim());
  section.paragraphs = paragraphs.length ? paragraphs : [""];
  book.updatedAt = new Date().toISOString();
  await saveBook(book);
  return section;
}

export async function addSection(id: string): Promise<BookSection | null> {
  const book = await loadBook(id);
  if (!book) return null;
  const section: BookSection = {
    id: newId("sec"),
    order: book.sections.length + 1,
    title: "New section",
    pageStart: null,
    paragraphs: [""],
  };
  book.sections.push(section);
  book.updatedAt = new Date().toISOString();
  await saveBook(book);
  return section;
}

export async function removeSection(id: string, sectionId: string): Promise<BookSection[] | null> {
  const book = await loadBook(id);
  if (!book || book.sections.length < 2) return null;
  const next = book.sections.filter((section) => section.id !== sectionId);
  if (next.length === book.sections.length) return null;
  book.sections = next.map((section, index) => ({ ...section, order: index + 1 }));
  book.updatedAt = new Date().toISOString();
  await saveBook(book);
  return book.sections;
}

async function saveBook(book: Book) {
  const target = bookPath(book.id);
  if (!target) throw new Error("Invalid book id");
  await mkdir(booksDir, { recursive: true });
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(book, null, 2), "utf8");
  await rm(target, { force: true });
  await rename(temp, target);
}

function summarize(book: Book): BookSummary {
  return {
    id: book.id,
    title: book.title,
    sourceFile: book.sourceFile,
    pageCount: book.pageCount,
    splitBy: book.splitBy,
    sectionCount: book.sections.length,
    updatedAt: book.updatedAt,
  };
}

async function acceptedPdf(file: File) {
  if (!file || file.size === 0) throw new PdfImportError("Choose a PDF file.");
  if (file.size > maxBytes) throw new PdfImportError("PDF is larger than 40 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = String.fromCharCode(...bytes.subarray(0, 5));
  if (header !== "%PDF-") throw new PdfImportError("That file is not a PDF.");
  return bytes;
}

function titleFromFilename(name: string) {
  return path.basename(name, path.extname(name)).replace(/[_]+/g, " ").trim();
}

function safeUploadName(id: string, original: string) {
  const base = path
    .basename(original)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .slice(0, 80);
  return `${id}-${base || "book.pdf"}`;
}

function isSafeUpload(name: string) {
  return name === path.basename(name) && !name.includes("..");
}

export type SplitBy = "outline" | "headings" | "pages";

export type BookSection = {
  id: string;
  order: number;
  title: string;
  pageStart: number | null;
  paragraphs: string[];
};

export type Book = {
  id: string;
  title: string;
  sourceFile: string;
  storedFile: string;
  pageCount: number;
  splitBy: SplitBy;
  importedAt: string;
  updatedAt: string;
  sections: BookSection[];
};

export type BookSummary = {
  id: string;
  title: string;
  sourceFile: string;
  pageCount: number;
  splitBy: SplitBy;
  sectionCount: number;
  updatedAt: string;
};

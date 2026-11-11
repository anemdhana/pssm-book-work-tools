# PSSM Book Work

Local tool for turning a book PDF into editable sections and paragraphs. The editor follows the Quantum Life University section editor: a left section list, one section open at a time, each paragraph in its own field, and save for that section.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3010.

`npm run sample-pdf` writes `fixtures/sample-book.pdf` if you want a small file to try.

## Import

Choose or drop a PDF on the library page. Text is read from the PDF (a scan with no text layer cannot be imported). Sections are chosen in this order:

1. PDF bookmarks, when the file has at least two
2. Heading lines (larger type, or a short line set apart from the body)
3. One section per page

Repeated running headers and page numbers are left out. The original PDF is kept in `data/uploads/`. Edited text is stored as JSON in `data/books/`.

## Edit

Open a book. The left nav lists sections. The pane shows a reader preview and one field per paragraph. You can retitle a section, add, remove, and reorder paragraphs, then **Save** (or Ctrl+S). Saving writes that section only. The book title saves when you leave the title field.

Add a section with **+ Section**. Delete is on the section being edited, and on the book from the left nav.

## Pages

**Import as pages** keeps each PDF page as itself: pictures stay in place, and each text line stays where it was. Previous and Next move between pages. Select a line to change font, size, alignment, bold, italic, or color, then **Save page**.

**Save Word** writes a `.docx` with those fonts, sizes, alignments, and pictures, so it can be reviewed and exported to PDF. **Save Markdown** writes a `.zip` with a Markdown file and the page pictures. Page edits are stored in `data/pages/`.

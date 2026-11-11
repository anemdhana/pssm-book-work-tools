"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookSummary } from "@/lib/types";
import { splitLabel } from "@/lib/text";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function BookLibrary({ books: initialBooks }: { books: BookSummary[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onImport(mode: "sections" | "pages") {
    if (!file) return;
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("file", file);
    data.set("mode", mode);
    if (title.trim()) data.set("title", title.trim());
    const response = await fetch("/api/books", { method: "POST", body: data });
    const result = (await response.json()) as { ok: boolean; id?: string; error?: string };
    setPending(false);
    if (!result.ok || !result.id) {
      setError(result.error ?? "Could not import that PDF.");
      return;
    }
    router.push(mode === "pages" ? `/book/${result.id}/pages` : `/book/${result.id}`);
  }

  async function onDelete(book: BookSummary) {
    if (!window.confirm(`Delete “${book.title}”? The edited text and the uploaded PDF will be removed.`)) return;
    const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete that book.");
      return;
    }
    setBooks((current) => current.filter((item) => item.id !== book.id));
  }

  return (
    <div className="library">
      <header className="page-head">
        <h1>Books</h1>
        <p>Import as sections for paragraph editing, or as pages to keep the pictures and text where they sit on each PDF page.</p>
      </header>

      <form
        className="import-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void onImport("pages");
        }}
      >
        <label
          className={`drop${drag ? " drag" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDrag(false);
            const next = event.dataTransfer.files?.[0];
            if (next) setFile(next);
          }}
        >
          <strong>{file ? file.name : "Choose a PDF"}</strong>
          <span>{file ? "Ready to import" : "or drop it here"}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional — taken from the PDF if empty" />
        </label>
        <div className="import-actions">
          <button type="submit" className="btn primary" disabled={!file || pending}>
            {pending ? "Importing…" : "Import as pages"}
          </button>
          <button type="button" className="btn" disabled={!file || pending} onClick={() => void onImport("sections")}>
            {pending ? "Importing…" : "Import as sections"}
          </button>
        </div>
        {error ? <p className="danger">{error}</p> : null}
      </form>

      {books.length ? (
        <ul className="book-list">
          {books.map((book) => (
            <li key={book.id} className="book-row">
              <Link href={`/book/${book.id}`}>
                <strong>{book.title}</strong>
                <span>
                  {book.sectionCount} sections · {book.pageCount} pages · split by {splitLabel(book.splitBy)}
                  {formatWhen(book.updatedAt) ? ` · ${formatWhen(book.updatedAt)}` : ""}
                </span>
              </Link>
              <div className="book-actions">
                <Link href={`/book/${book.id}/pages`}>Pages</Link>
                <Link href={`/book/${book.id}`}>Sections</Link>
                <button type="button" className="text-danger" onClick={() => void onDelete(book)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No books yet. A sample file is in fixtures/sample-book.pdf.</p>
      )}
    </div>
  );
}

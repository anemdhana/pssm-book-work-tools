"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Book, BookSection } from "@/lib/types";
import { hasTelugu, splitLabel } from "@/lib/text";

function paragraphsOf(section: BookSection) {
  return section.paragraphs.length ? section.paragraphs : [""];
}

function SectionPane({
  bookId,
  section,
  index,
  total,
  previousId,
  nextId,
  onOpen,
  onSaved,
  onDirty,
  onDelete,
}: {
  bookId: string;
  section: BookSection;
  index: number;
  total: number;
  previousId: string | null;
  nextId: string | null;
  onOpen: (id: string) => void;
  onSaved: (section: BookSection) => void;
  onDirty: (dirty: boolean) => void;
  onDelete: (() => void) | null;
}) {
  const [title, setTitle] = useState(section.title);
  const [paragraphs, setParagraphs] = useState(paragraphsOf(section));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const telugu = hasTelugu(`${title}\n${paragraphs.join("\n")}`);
  const saveRef = useRef<() => void>(() => undefined);

  function markDirty() {
    onDirty(true);
    setMessage(null);
  }

  function updateParagraph(paragraphIndex: number, value: string) {
    setParagraphs((current) => current.map((paragraph, itemIndex) => (itemIndex === paragraphIndex ? value : paragraph)));
    markDirty();
  }

  function move(paragraphIndex: number, dir: -1 | 1) {
    setParagraphs((current) => {
      const nextIndex = paragraphIndex + dir;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(paragraphIndex, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
    markDirty();
  }

  async function onSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    const response = await fetch(`/api/books/${bookId}/sections/${section.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, paragraphs }),
    });
    const result = (await response.json()) as { ok: boolean; section?: BookSection; error?: string };
    setPending(false);
    if (!result.ok || !result.section) {
      setMessage(result.error ?? "Could not save.");
      return;
    }
    setTitle(result.section.title);
    setParagraphs(paragraphsOf(result.section));
    setMessage("Saved.");
    onDirty(false);
    onSaved(result.section);
  }

  saveRef.current = () => void onSubmit();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form className={telugu ? "lang-te" : undefined} onSubmit={(event) => void onSubmit(event)}>
      <div className="stepper">
        <button type="button" className="text-btn" disabled={!previousId || pending} onClick={() => previousId && onOpen(previousId)}>
          ← Prev
        </button>
        <span className="muted">
          {index + 1}/{total}
          {section.pageStart ? ` · page ${section.pageStart}` : ""}
        </span>
        <button type="button" className="text-btn" disabled={!nextId || pending} onClick={() => nextId && onOpen(nextId)}>
          Next →
        </button>
      </div>

      <label className="title-field">
        <span>Title</span>
        <input
          className="section-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markDirty();
          }}
        />
      </label>

      <div className={`reader-preview${telugu ? " lang-te" : ""}`} aria-live="polite">
        <p className="intro">Reader preview</p>
        <h2>{title.trim() || "Untitled section"}</h2>
        {paragraphs.some((paragraph) => paragraph.trim()) ? (
          paragraphs.map((paragraph, paragraphIndex) => (paragraph.trim() ? <p key={paragraphIndex}>{paragraph}</p> : null))
        ) : (
          <p className="muted">Paragraphs will appear here as you type.</p>
        )}
      </div>

      {paragraphs.map((paragraph, paragraphIndex) => (
        <div key={paragraphIndex} className="paragraph">
          <div className="paragraph-head">
            <label htmlFor={`p-${paragraphIndex}`}>
              <span>Paragraph {paragraphIndex + 1}</span>
            </label>
            <div className="paragraph-tools">
              <button type="button" aria-label="Move up" onClick={() => move(paragraphIndex, -1)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" onClick={() => move(paragraphIndex, 1)}>
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove paragraph"
                onClick={() => {
                  setParagraphs((current) => {
                    const next = current.filter((_, itemIndex) => itemIndex !== paragraphIndex);
                    return next.length ? next : [""];
                  });
                  markDirty();
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <textarea
            id={`p-${paragraphIndex}`}
            rows={Math.min(12, Math.max(3, Math.ceil(paragraph.length / 90)))}
            value={paragraph}
            onChange={(event) => updateParagraph(paragraphIndex, event.target.value)}
          />
        </div>
      ))}

      <div className="section-footer">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setParagraphs((current) => [...current, ""]);
            markDirty();
          }}
        >
          + Paragraph
        </button>
        <button type="submit" className="btn primary" disabled={pending} title="Ctrl+S">
          {pending ? "Saving…" : "Save"}
        </button>
        {onDelete ? (
          <button type="button" className="text-danger" onClick={onDelete}>
            Delete section
          </button>
        ) : null}
        {message ? <span className={message === "Saved." ? "muted" : "danger"}>{message}</span> : null}
      </div>
    </form>
  );
}

export function BookEditor({ book }: { book: Book }) {
  const router = useRouter();
  const [bookTitle, setBookTitle] = useState(book.title);
  const [savedTitle, setSavedTitle] = useState(book.title);
  const [sections, setSections] = useState(book.sections);
  const [activeId, setActiveId] = useState(book.sections[0]?.id ?? "");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  function openSection(id: string) {
    if (!active || id === active.id) return;
    if (dirty && !window.confirm("This section has unsaved edits. Leave without saving?")) return;
    setDirty(false);
    setError(null);
    setActiveId(id);
  }

  useEffect(() => {
    document.getElementById(`sec-nav-${activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  async function saveTitle() {
    const next = bookTitle.trim() || "Untitled book";
    setBookTitle(next);
    if (next === savedTitle) return;
    const response = await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    const result = (await response.json()) as { ok: boolean; title?: string };
    if (result.ok && result.title) {
      setBookTitle(result.title);
      setSavedTitle(result.title);
    }
  }

  async function onAddSection() {
    if (dirty && !window.confirm("This section has unsaved edits. Leave without saving?")) return;
    const response = await fetch(`/api/books/${book.id}/sections`, { method: "POST" });
    const result = (await response.json()) as { ok: boolean; section?: BookSection; error?: string };
    if (!result.ok || !result.section) {
      setError(result.error ?? "Could not add a section.");
      return;
    }
    setSections((current) => [...current, result.section!]);
    setDirty(false);
    setActiveId(result.section.id);
  }

  async function onDeleteSection() {
    if (!active || sections.length < 2) return;
    if (!window.confirm(`Delete “${active.title}”?`)) return;
    const response = await fetch(`/api/books/${book.id}/sections/${active.id}`, { method: "DELETE" });
    const result = (await response.json()) as { ok: boolean; sections?: BookSection[]; error?: string };
    if (!result.ok || !result.sections?.length) {
      setError(result.error ?? "Could not delete that section.");
      return;
    }
    const index = sections.findIndex((section) => section.id === active.id);
    setSections(result.sections);
    setDirty(false);
    setActiveId(result.sections[Math.max(0, index - 1)]?.id ?? result.sections[0].id);
  }

  async function onDeleteBook() {
    if (!window.confirm(`Delete “${bookTitle}”? The edited text and the uploaded PDF will be removed.`)) return;
    const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete this book.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!active) return <p className="muted">This book has no sections.</p>;

  const index = sections.findIndex((section) => section.id === active.id);
  const previous = index > 0 ? sections[index - 1] : null;
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;

  return (
    <>
      <header className="page-head">
        <input
          className="book-title"
          aria-label="Book title"
          value={bookTitle}
          onChange={(event) => setBookTitle(event.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <p className="muted">
          {sections.length} sections · split by {splitLabel(book.splitBy)} · {book.sourceFile} · edits save per section
        </p>
      </header>

      <div className="edit-layout">
        <aside className="section-nav" aria-label="Sections">
          <div className="side-links">
            <Link href="/">Library</Link>
            <Link href={`/book/${book.id}/pages`}>Pages</Link>
            <button type="button" className="text-danger" onClick={() => void onDeleteBook()}>
              Delete book
            </button>
          </div>
          <p className="panel-label">Sections</p>
          <ul>
            {sections.map((section) => {
              const current = section.id === active.id;
              return (
                <li key={section.id}>
                  <button
                    id={`sec-nav-${section.id}`}
                    type="button"
                    className={`nav-item${current ? " active" : ""}`}
                    aria-current={current ? "page" : undefined}
                    onClick={() => openSection(section.id)}
                  >
                    <span>{section.order}</span>
                    <strong className={hasTelugu(section.title) ? "lang-te" : undefined}>{section.title}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="nav-actions">
            <button type="button" className="text-btn" disabled={!previous} onClick={() => previous && openSection(previous.id)}>
              ← Prev
            </button>
            <button type="button" className="text-btn" onClick={() => void onAddSection()}>
              + Section
            </button>
            <button type="button" className="text-btn" disabled={!next} onClick={() => next && openSection(next.id)}>
              Next →
            </button>
          </div>
        </aside>

        <div className="section-pane">
          {error ? <p className="danger">{error}</p> : null}
          <SectionPane
            key={active.id}
            bookId={book.id}
            section={active}
            index={index}
            total={sections.length}
            previousId={previous?.id ?? null}
            nextId={next?.id ?? null}
            onOpen={openSection}
            onDirty={setDirty}
            onDelete={sections.length > 1 ? () => void onDeleteSection() : null}
            onSaved={(saved) => {
              setSections((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            }}
          />
        </div>
      </div>
    </>
  );
}

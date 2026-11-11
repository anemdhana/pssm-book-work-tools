"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cssFontFamily, FONT_CHOICES } from "@/lib/fonts";
import type { FlowBlock, FlowImage, FlowParagraph, ImageAlign, PageView, TextAlign } from "@/lib/pageTypes";

const aligns: { id: TextAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
  { id: "justify", label: "Justify" },
];

const imageAligns: { id: ImageAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

type Selection = { kind: "paragraph" | "image"; id: string } | null;

export function PageEditor({
  bookId,
  title,
  pageCount,
  initialPage,
}: {
  bookId: string;
  title: string;
  pageCount: number;
  initialPage: number;
}) {
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [page, setPage] = useState<PageView | null>(null);
  const [blocks, setBlocks] = useState<FlowBlock[]>([]);
  const [selected, setSelected] = useState<Selection>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"save" | "docx" | "md" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jump, setJump] = useState(String(initialPage));
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `/book/${bookId}/pages?page=${pageNumber}`;
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
    setJump(String(pageNumber));
  }, [bookId, pageNumber]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelected(null);
    void (async () => {
      try {
        const response = await fetch(`/api/books/${bookId}/pages/${pageNumber}`, { signal: controller.signal });
        const result = (await response.json()) as { ok: boolean; page?: PageView; error?: string };
        if (!result.ok || !result.page) {
          setError(result.error ?? "Could not open that page.");
          setLoading(false);
          return;
        }
        setPage(result.page);
        setBlocks(result.page.blocks);
        setDirty(false);
        setLoading(false);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError("Could not open that page.");
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [bookId, pageNumber]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const paragraph = blocks.find((block): block is FlowParagraph => block.kind === "paragraph" && selected?.kind === "paragraph" && block.id === selected.id) ?? null;
  const image = blocks.find((block): block is FlowImage => block.kind === "image" && selected?.kind === "image" && block.id === selected.id) ?? null;

  function updateParagraph(id: string, patch: Partial<FlowParagraph>) {
    setBlocks((current) => current.map((block) => (block.kind === "paragraph" && block.id === id ? { ...block, ...patch } : block)));
    setDirty(true);
    setMessage(null);
  }

  function updateImage(id: string, patch: Partial<Pick<FlowImage, "align" | "width">>) {
    setBlocks((current) => current.map((block) => (block.kind === "image" && block.id === id ? { ...block, ...patch } : block)));
    setDirty(true);
    setMessage(null);
  }

  function goTo(next: number) {
    if (next === pageNumber || next < 1 || next > pageCount || loading) return;
    if (dirty && !window.confirm("This page has unsaved edits. Leave without saving?")) return;
    setMessage(null);
    setPageNumber(next);
  }

  async function save() {
    if (pending) return false;
    setPending("save");
    setMessage(null);
    const response = await fetch(`/api/books/${bookId}/pages/${pageNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paragraphs: blocks.flatMap((block) =>
          block.kind === "paragraph"
            ? [{ id: block.id, text: block.text, fontFamily: block.fontFamily, fontSize: block.fontSize, lineHeight: block.lineHeight, align: block.align, bold: block.bold, italic: block.italic, color: block.color }]
            : [],
        ),
        images: blocks.flatMap((block) => (block.kind === "image" ? [{ id: block.id, align: block.align, width: block.width }] : [])),
      }),
    });
    const result = (await response.json()) as { ok: boolean; error?: string };
    setPending(null);
    if (!result.ok) {
      setMessage(result.error ?? "Could not save.");
      return false;
    }
    setDirty(false);
    setMessage("Saved.");
    return true;
  }

  async function download(format: "docx" | "md") {
    if (dirty) {
      const saved = await save();
      if (!saved) return;
    }
    setPending(format);
    setMessage(null);
    const response = await fetch(`/api/books/${bookId}/export?format=${format}`);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setPending(null);
      setMessage(result?.error ?? "Could not save that file.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "docx" ? `${title}.docx` : `${title}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setPending(null);
    setMessage(format === "docx" ? "Word file saved." : "Markdown file saved.");
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, current: FlowImage) {
    event.stopPropagation();
    event.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const origin = event.clientX;
    const start = current.width;
    const sign = current.align === "right" ? -1 : 1;
    const span = stage.clientWidth || 1;
    function move(moveEvent: PointerEvent) {
      const next = Math.round(start + ((moveEvent.clientX - origin) / span) * 100 * sign);
      updateImage(current.id, { width: Math.min(100, Math.max(10, next)) });
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div className="page-work">
      <header className="page-head">
        <h1>{title}</h1>
        <p className="muted">Select a whole paragraph to change its font, size, or line spacing. Place a picture on the left, right, or center and the text wraps around it.</p>
      </header>

      <div className="page-toolbar">
        <div className="page-nav">
          <button type="button" className="btn" disabled={pageNumber <= 1 || loading} onClick={() => goTo(pageNumber - 1)}>
            ← Previous
          </button>
          <form
            className="page-jump"
            onSubmit={(event) => {
              event.preventDefault();
              const next = Number(jump);
              if (Number.isInteger(next)) goTo(next);
            }}
          >
            <label>
              <span className="muted">Page</span>
              <input value={jump} inputMode="numeric" onChange={(event) => setJump(event.target.value)} aria-label="Page number" />
            </label>
            <span className="muted">of {pageCount}</span>
          </form>
          <button type="button" className="btn" disabled={pageNumber >= pageCount || loading} onClick={() => goTo(pageNumber + 1)}>
            Next →
          </button>
        </div>
        <div className="page-actions">
          <Link href={`/book/${bookId}`}>Sections</Link>
          <Link href="/">Library</Link>
          <button type="button" className="btn primary" disabled={loading || pending !== null} onClick={() => void save()}>
            {pending === "save" ? "Saving…" : "Save page"}
          </button>
          <button type="button" className="btn" disabled={pending !== null} onClick={() => void download("docx")}>
            {pending === "docx" ? "Preparing Word…" : "Save Word"}
          </button>
          <button type="button" className="btn" disabled={pending !== null} onClick={() => void download("md")}>
            {pending === "md" ? "Preparing Markdown…" : "Save Markdown"}
          </button>
          {message ? <span className={message === "Saved." || message.endsWith("saved.") ? "muted" : "danger"}>{message}</span> : null}
        </div>
      </div>

      <div className="format-bar" aria-label={image ? "Picture layout" : "Paragraph formatting"}>
        {image ? (
          <>
            <div className="align-group" role="group" aria-label="Picture position">
              {imageAligns.map((align) => (
                <button key={align.id} type="button" className={image.align === align.id ? "active" : undefined} onClick={() => updateImage(image.id, { align: align.id })}>
                  {align.label}
                </button>
              ))}
            </div>
            <label>
              <span>Width</span>
              <input
                type="range"
                min={10}
                max={100}
                value={image.width}
                aria-label="Picture width"
                onChange={(event) => updateImage(image.id, { width: Number(event.target.value) })}
              />
              <span>{image.width}%</span>
            </label>
            <span className="muted">Text wraps around the picture. Drag the corner to resize it.</span>
          </>
        ) : (
          <>
            <label>
              <span>Font</span>
              <select value={paragraph?.fontFamily ?? "Georgia"} disabled={!paragraph} onChange={(event) => paragraph && updateParagraph(paragraph.id, { fontFamily: event.target.value })}>
                {FONT_CHOICES.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Size</span>
              <input
                type="number"
                min={6}
                max={96}
                step={0.5}
                value={paragraph ? Math.round(paragraph.fontSize * 10) / 10 : 12}
                disabled={!paragraph}
                onChange={(event) => paragraph && updateParagraph(paragraph.id, { fontSize: Number(event.target.value) })}
              />
            </label>
            <button type="button" disabled={!paragraph} onClick={() => paragraph && updateParagraph(paragraph.id, { fontSize: Math.max(6, paragraph.fontSize - 1) })}>
              Smaller
            </button>
            <button type="button" disabled={!paragraph} onClick={() => paragraph && updateParagraph(paragraph.id, { fontSize: Math.min(96, paragraph.fontSize + 1) })}>
              Larger
            </button>
            <label>
              <span>Spacing</span>
              <input
                type="number"
                min={0.8}
                max={3}
                step={0.1}
                value={paragraph?.lineHeight ?? 1.35}
                disabled={!paragraph}
                aria-label="Line spacing"
                onChange={(event) => paragraph && updateParagraph(paragraph.id, { lineHeight: Number(event.target.value) })}
              />
            </label>
            <div className="align-group" role="group" aria-label="Alignment">
              {aligns.map((align) => (
                <button
                  key={align.id}
                  type="button"
                  className={paragraph?.align === align.id ? "active" : undefined}
                  disabled={!paragraph}
                  onClick={() => paragraph && updateParagraph(paragraph.id, { align: align.id })}
                >
                  {align.label}
                </button>
              ))}
            </div>
            <button type="button" className={paragraph?.bold ? "active" : undefined} disabled={!paragraph} onClick={() => paragraph && updateParagraph(paragraph.id, { bold: !paragraph.bold })}>
              Bold
            </button>
            <button type="button" className={paragraph?.italic ? "active" : undefined} disabled={!paragraph} onClick={() => paragraph && updateParagraph(paragraph.id, { italic: !paragraph.italic })}>
              Italic
            </button>
            <label>
              <span>Color</span>
              <input type="color" value={paragraph?.color ?? "#1a1a1a"} disabled={!paragraph} onChange={(event) => paragraph && updateParagraph(paragraph.id, { color: event.target.value })} />
            </label>
            {!paragraph ? <span className="muted">Select a paragraph for font, size, and spacing. Select a picture to move or resize it.</span> : null}
          </>
        )}
      </div>

      {error ? <p className="danger">{error}</p> : null}

      <div className={`page-frame${loading ? " is-loading" : ""}`}>
        {page ? (
          <div
            ref={stageRef}
            className="page-stage"
            style={{ width: `${(page.width * 96) / 72}px`, minHeight: `${(page.height * 96) / 72}px` }}
            onMouseDown={() => setSelected(null)}
          >
            {blocks.map((block) =>
              block.kind === "image" ? (
                <figure
                  key={`${page.pageNumber}-${block.id}`}
                  className={`flow-image align-${block.align}${image?.id === block.id ? " selected" : ""}`}
                  style={{ width: `${block.width}%` }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setSelected({ kind: "image", id: block.id });
                  }}
                >
                  <img src={block.src} alt="" />
                  <button type="button" className="resize-handle" aria-label="Resize picture" onPointerDown={(event) => startResize(event, block)} />
                </figure>
              ) : (
                <p
                  key={`${page.pageNumber}-${block.id}`}
                  className={`flow-paragraph${paragraph?.id === block.id ? " selected" : ""}`}
                  role="textbox"
                  aria-label={block.text.slice(0, 80) || "Paragraph"}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  style={{
                    fontSize: `${(block.fontSize * 96) / 72}px`,
                    lineHeight: block.lineHeight,
                    fontFamily: cssFontFamily(block.fontFamily),
                    textAlign: block.align,
                    fontWeight: block.bold ? 700 : 400,
                    fontStyle: block.italic ? "italic" : "normal",
                    color: block.color,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setSelected({ kind: "paragraph", id: block.id });
                  }}
                  onFocus={() => setSelected({ kind: "paragraph", id: block.id })}
                  onInput={(event) => {
                    const value = event.currentTarget.innerText.replace(/\u00a0/g, " ").replace(/\n$/, "");
                    updateParagraph(block.id, { text: value });
                  }}
                  ref={(node) => {
                    if (!node) return;
                    const token = `${page.pageNumber}:${block.id}`;
                    if (node.dataset.bound !== token) {
                      node.textContent = block.text;
                      node.dataset.bound = token;
                    }
                  }}
                />
              ),
            )}
          </div>
        ) : null}
        {loading ? <p className="page-loading">Opening page {pageNumber}…</p> : null}
      </div>
    </div>
  );
}

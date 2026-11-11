import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <h1>Not found</h1>
      <p className="muted">That book is not in the library.</p>
      <p>
        <Link href="/">Back to library</Link>
      </p>
    </main>
  );
}

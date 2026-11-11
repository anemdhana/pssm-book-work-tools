import { BookLibrary } from "@/components/BookLibrary";
import { listBooks } from "@/lib/books";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await listBooks();
  return (
    <main className="shell">
      <BookLibrary books={books} />
    </main>
  );
}

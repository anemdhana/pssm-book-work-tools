import { notFound } from "next/navigation";
import { BookEditor } from "@/components/BookEditor";
import { loadBook } from "@/lib/books";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const book = await loadBook(id);
  return { title: book?.title ?? "Book" };
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const book = await loadBook(id);
  if (!book) notFound();
  return (
    <main className="shell">
      <BookEditor book={book} />
    </main>
  );
}

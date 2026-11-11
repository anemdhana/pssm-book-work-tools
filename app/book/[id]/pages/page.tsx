import { notFound } from "next/navigation";
import { PageEditor } from "@/components/PageEditor";
import { loadBook } from "@/lib/books";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const book = await loadBook(id);
  return { title: book ? `${book.title} pages` : "Pages" };
}

export default async function BookPages({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const book = await loadBook(id);
  if (!book) notFound();
  const requested = Number(query.page);
  const initialPage = Number.isInteger(requested) && requested >= 1 && requested <= book.pageCount ? requested : 1;
  return (
    <main className="shell">
      <PageEditor bookId={book.id} title={book.title} pageCount={book.pageCount} initialPage={initialPage} />
    </main>
  );
}

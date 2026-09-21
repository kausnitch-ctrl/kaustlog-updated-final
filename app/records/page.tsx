import { getBooks } from "../../lib/books";
import RecordsClient from "../../components/RecordsClient";

export default function RecordsPage() {
  const books = getBooks().map((book) => ({ id: book.id, subject: book.subject }));
  return <RecordsClient books={books} />;
}

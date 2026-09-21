import Link from "next/link";
import Image from "next/image";
import { getBooks, getTotalProblems } from "../../lib/books";
import BooksClient from "../../components/BooksClient";

export default function BooksPage() {
  const books = getBooks().map((book) => ({
    id: book.id,
    name: book.name,
    subject: book.subject,
    cover: book.cover,
    totalProblems: getTotalProblems(book),
  }));
  return <BooksClient books={books} />;
}

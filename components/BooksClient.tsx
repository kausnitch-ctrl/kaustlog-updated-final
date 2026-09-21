"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Book = { id: string; name: string; subject: string; cover: string; totalProblems: number };

export default function BooksClient({ books }: { books: Book[] }) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  useEffect(() => {
    async function load() {
      if (!books.length) return;
      const { data, error } = await supabase.from("attempts").select("book_id, problem_number, attempted_at").in("book_id", books.map((book) => book.id)).order("attempted_at", { ascending: false });
      if (error) { console.error(error); return; }
      const latest = new Map<string, Set<string>>();
      for (const item of data ?? []) {
        if (!item.book_id || !item.problem_number) continue;
        if (!latest.has(item.book_id)) latest.set(item.book_id, new Set());
        latest.get(item.book_id)!.add(String(item.problem_number));
      }
      const next: Record<string, number> = {};
      for (const book of books) next[book.id] = Math.round(((latest.get(book.id)?.size ?? 0) / Math.max(book.totalProblems, 1)) * 100);
      setProgress(next);
    }
    load();
  }, [books]);

  return <main className="app-shell">
    <header className="page-header"><Link href="/">←</Link><h1>本</h1></header>
    <section className="books-content">
      <div className="books-heading"><h2>登録されている本</h2><span>{books.length}冊</span></div>
      <div className="books-list">
        {books.map((book) => <Link key={book.id} href={`/books/${book.id}`} className="book-card">
          <Image src={book.cover} alt={book.name} width={88} height={124} className="book-cover" />
          <div className="book-card-info"><span className="book-subject">{book.subject}</span><h2>{book.name}</h2><p>{book.totalProblems}問</p><div className="book-progress"><div className="book-progress-fill" style={{ width: `${progress[book.id] ?? 0}%` }} /></div><small>{progress[book.id] ?? 0}%　{progress[book.id] ? "学習中" : "未着手"}</small></div>
          <span className="book-arrow">›</span>
        </Link>)}
      </div>
    </section>
    <BottomNavigation current="books" />
  </main>;
}

function BottomNavigation({ current }: { current: "home" | "records" | "books" }) {
  return <nav className="bottom-nav"><Link className={current === "home" ? "active" : ""} href="/"><span>⌂</span><small>ホーム</small></Link><Link className={current === "records" ? "active" : ""} href="/records"><span>▦</span><small>学習記録</small></Link><Link className={current === "books" ? "active" : ""} href="/books"><span>▤</span><small>本</small></Link></nav>;
}

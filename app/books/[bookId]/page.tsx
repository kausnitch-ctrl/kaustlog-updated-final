import Link from "next/link";
import Image from "next/image";
import { getBook, getTotalProblems } from "../../../lib/books";
import ProgressBar from "./ProgressBar";

type Props = { params: Promise<{ bookId: string }> };

export default async function BookPage({ params }: Props) {
  const { bookId } = await params;
  const book = getBook(bookId);
  if (!book) return <main className="app-shell"><div className="error-message"><h2>本が見つかりません</h2></div></main>;
  const totalProblems = getTotalProblems(book);

  return <main className="app-shell">
    <header className="page-header"><Link href="/books">←</Link><h1>本の詳細</h1></header>
    <section className="book-detail">
      <div className="book-detail-top"><Image src={book.cover} alt={book.name} width={108} height={150} className="detail-cover" /><div className="detail-info"><span>{book.subject}</span><h2>{book.name}</h2><p>{totalProblems}問</p></div></div>
      <section className="overall-progress"><ProgressBar bookId={book.id} totalProblems={totalProblems} /></section>
      <section className="unit-section"><div className="section-title-row"><h2>単元</h2><span>{book.units.length}単元</span></div><div className="unit-list">
        {book.units.map((unit) => { const count = unit.endProblem - unit.startProblem + 1; return <Link key={unit.id} href={`/books/${book.id}/units/${unit.id}/chapters/${unit.id}`} className="unit-card"><div className="unit-card-top"><div><strong>{unit.name}</strong><span>問題 {unit.startProblem}～{unit.endProblem} ・ {count}問</span></div><span className="arrow">›</span></div><ProgressBar bookId={book.id} unitId={unit.id} totalProblems={count} /></Link>; })}
      </div></section>
    </section>
    <BottomNavigation current="books" />
  </main>;
}

function BottomNavigation({ current }: { current: "home" | "records" | "books" }) {
  return <nav className="bottom-nav"><Link className={current === "home" ? "active" : ""} href="/"><span>⌂</span><small>ホーム</small></Link><Link className={current === "records" ? "active" : ""} href="/records"><span>▦</span><small>学習記録</small></Link><Link className={current === "books" ? "active" : ""} href="/books"><span>▤</span><small>本</small></Link></nav>;
}

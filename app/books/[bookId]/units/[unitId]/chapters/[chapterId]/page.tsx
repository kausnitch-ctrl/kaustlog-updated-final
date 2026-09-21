import Link from "next/link";
import { getBook, getProblems } from "../../../../../../../lib/books";
import ProblemList from "./ProblemList";

type Props = { params: Promise<{ bookId: string; unitId: string; chapterId: string }> };

export default async function ChapterPage({ params }: Props) {
  const { bookId, unitId, chapterId } = await params;
  const book = getBook(bookId);
  const unit = book?.units.find((item) => item.id === unitId);

  if (!book || !unit || chapterId !== unit.id) {
    return <main className="app-shell"><div className="error-message"><h2>単元が見つかりません</h2></div></main>;
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link href={`/books/${book.id}`}>←</Link>
        <div><h1>{unit.name}</h1><p>問題 {unit.startProblem}～{unit.endProblem}</p></div>
      </header>
      <section className="chapter-content">
        <ProblemList bookId={book.id} unitId={unit.id} chapterId={chapterId} problemNumbers={getProblems(unit)} />
      </section>
      <BottomNavigation current="books" />
    </main>
  );
}

function BottomNavigation({ current }: { current: "home" | "records" | "books" }) {
  return <nav className="bottom-nav">
    <Link className={current === "home" ? "active" : ""} href="/"><span>⌂</span><small>ホーム</small></Link>
    <Link className={current === "records" ? "active" : ""} href="/records"><span>▦</span><small>学習記録</small></Link>
    <Link className={current === "books" ? "active" : ""} href="/books"><span>▤</span><small>本</small></Link>
  </nav>;
}

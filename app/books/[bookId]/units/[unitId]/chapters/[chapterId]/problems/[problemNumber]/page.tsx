import Link from "next/link";
import { getBook, getUnit } from "../../../../../../../../../lib/books";
import ProblemTimer from "./ProblemTimer";
import ProblemHistory from "./ProblemHistory";

type Props = {
  params: Promise<{
    bookId: string;
    unitId: string;
    chapterId: string;
    problemNumber: string;
  }>;
};

export default async function ProblemPage({ params }: Props) {
  const { bookId, unitId, chapterId, problemNumber } = await params;

  const book = getBook(bookId);
  const unit = getUnit(bookId, unitId);
  const number = Number(problemNumber);

  const validNumber =
    unit &&
    Number.isInteger(number) &&
    number >= unit.startProblem &&
    number <= unit.endProblem;

  // 本や章が存在しない場合はここで終了
  if (!book || !unit || chapterId !== unit.id || !validNumber) {
    return (
      <main className="app-shell">
        <div className="error-message">
          <h2>問題が見つかりません</h2>
        </div>
      </main>
    );
  }

  // ここから下では book と unit が必ず存在する
  const currentIndex = book.units.findIndex(
    (item) => item.id === unit.id
  );

  const currentNumber = Number(problemNumber);

  let nextProblemHref: string | null = null;
  let isChapterClear = false;
  let isBookComplete = false;

  if (currentNumber < unit.endProblem) {
    // まだ章の途中
    nextProblemHref =
      `/books/${book.id}/units/${unit.id}/chapters/${unit.id}/problems/${currentNumber + 1}`;
  } else if (
    currentIndex >= 0 &&
    currentIndex < book.units.length - 1
  ) {
    // 章の最後 → 次の章
    const nextUnit = book.units[currentIndex + 1];

    isChapterClear = true;

    nextProblemHref =
      `/books/${book.id}/units/${nextUnit.id}/chapters/${nextUnit.id}/problems/${nextUnit.startProblem}`;
  } else {
    // 本の最後
    isChapterClear = true;
    isBookComplete = true;
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link
          href={`/books/${bookId}/units/${unitId}/chapters/${chapterId}`}
        >
          ←
        </Link>

        <div>
          <h1>問題 {problemNumber}</h1>
          <p>{unit.name}</p>
        </div>
      </header>

      <section className="chapter-content">
        <ProblemTimer
          bookId={bookId}
          unitId={unitId}
          problemNumber={problemNumber}
          nextProblemHref={nextProblemHref}
          isChapterClear={isChapterClear}
          isBookComplete={isBookComplete}
          unitName={unit.name}
          bookName={book.name}
        />

        <ProblemHistory
          bookId={bookId}
          unitId={unitId}
          problemNumber={problemNumber}
        />
      </section>

      <BottomNavigation current="books" />
    </main>
  );
}

function BottomNavigation({
  current,
}: {
  current: "home" | "records" | "books";
}) {
  return (
    <nav className="bottom-nav">
      <Link
        className={current === "home" ? "active" : ""}
        href="/"
      >
        <span>⌂</span>
        <small>ホーム</small>
      </Link>

      <Link
        className={current === "records" ? "active" : ""}
        href="/records"
      >
        <span>▦</span>
        <small>学習記録</small>
      </Link>

      <Link
        className={current === "books" ? "active" : ""}
        href="/books"
      >
        <span>▤</span>
        <small>本</small>
      </Link>
    </nav>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../../../lib/supabase";
import type { Result } from "../../../../../../../types/database";

type A = {
  problem_number: string;
  result: Result;
  attempted_at: string;
  partial_mistake: string | null;
  memo: string | null;
};

type Props = { bookId: string; unitId: string; chapterId: string; problemNumbers: number[] };
type Note = { problem_number: string; content: string };

function symbol(result: Result | null) {
  return result === "correct" ? "○" : result === "partial" ? "△" : result === "wrong" ? "×" : "";
}

export default function ProblemList({ bookId, unitId, chapterId, problemNumbers }: Props) {
  const [attempts, setAttempts] = useState<A[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [countFilter, setCountFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("problem_number,result,attempted_at,partial_mistake,memo")
        .eq("book_id", bookId)
        .eq("unit_id", unitId)
        .order("attempted_at");
      if (error) console.error(error);
      setAttempts((data ?? []) as A[]);
      const { data: noteData, error: noteError } = await supabase
        .from("problem_notes")
        .select("problem_number,content")
        .eq("book_id", bookId)
        .eq("unit_id", unitId);
      if (noteError) console.error(noteError);
      setNotes((noteData ?? []) as Note[]);
    })();
  }, [bookId, unitId]);

  const noteMap = useMemo(() => new Map(notes.map((note) => [note.problem_number, note.content])), [notes]);

  const by = useMemo(() => {
    const map = new Map<string, A[]>();
    for (const attempt of attempts) {
      const list = map.get(attempt.problem_number) ?? [];
      list.push(attempt);
      map.set(attempt.problem_number, list);
    }
    return map;
  }, [attempts]);

  const list = problemNumbers.filter((number) => {
    const arr = by.get(String(number)) ?? [];
    const latest = arr.at(-1)?.result;
    const okQ = String(number).includes(q);
    const okF =
      filter === "all" ||
      (filter === "wrongEver" && arr.some((a) => a.result === "wrong")) ||
      (filter === "partialEver" && arr.some((a) => a.result === "partial")) ||
      (filter === "latestWrong" && latest === "wrong") ||
      (filter === "latestPartial" && latest === "partial") ||
      (filter === "latestCorrect" && latest === "correct") ||
      (filter === "untouched" && !arr.length);
    const count = arr.length;
    const okC = countFilter === "all" || (countFilter === "1" && count === 1) || (countFilter === "2" && count === 2) || (countFilter === "3" && count >= 3) || (countFilter === "5" && count >= 5);
    return okQ && okF && okC;
  });

  return (
    <section className="problem-list">
      <div className="problem-filter">
        <input placeholder="問題番号を検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">すべて</option>
          <option value="wrongEver">不正解経験あり</option>
          <option value="partialEver">部分正解経験あり</option>
          <option value="latestWrong">最新が不正解</option>
          <option value="latestPartial">最新が部分正解</option>
          <option value="latestCorrect">最新が正解</option>
          <option value="untouched">未挑戦</option>
        </select>
        <select value={countFilter} onChange={(e) => setCountFilter(e.target.value)}>
          <option value="all">回数：すべて</option>
          <option value="1">1回</option>
          <option value="2">2回</option>
          <option value="3">3回以上</option>
          <option value="5">5回以上</option>
        </select>
      </div>

      {list.map((number) => {
        const arr = by.get(String(number)) ?? [];
        const latest = arr.at(-1);
        return (
          <Link key={number} href={`/books/${bookId}/units/${unitId}/chapters/${chapterId}/problems/${number}`} className="problem-card">
            <div className="problem-card-main">
              <div className="problem-number-row">
                {latest && <strong className={`problem-symbol ${latest.result}`}>{symbol(latest.result)}</strong>}
                <strong>問題 {number}</strong>
                {latest?.partial_mistake && <span className="problem-inline-note">{latest.partial_mistake}</span>}
                {noteMap.get(String(number)) && <span className="problem-inline-note">{noteMap.get(String(number))}</span>}
              </div>
              <p className="problem-status">{arr.length ? `${arr.length}回` : "未解答"}</p>
            </div>
            <span>→</span>
          </Link>
        );
      })}
      {!list.length && <div className="empty-state">条件に一致する問題はありません。</div>}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Result } from "../../../types/database";

type Props = { bookId: string; unitId?: string; totalProblems: number };
type Attempt = { problem_number: string | null; result: Result; attempted_at: string };

export default function ProgressBar({ bookId, unitId, totalProblems }: Props) {
  const [counts, setCounts] = useState({ correct: 0, partial: 0, wrong: 0, unattempted: totalProblems });

  useEffect(() => {
    async function loadProgress() {
      let query = supabase.from("attempts").select("problem_number, result, attempted_at").eq("book_id", bookId);
      if (unitId) query = query.eq("unit_id", unitId);
      const { data, error } = await query.order("attempted_at", { ascending: false });
      if (error) { console.error(error); return; }

      const latest = new Map<string, Result>();
      for (const attempt of (data ?? []) as Attempt[]) {
        if (attempt.problem_number && !latest.has(attempt.problem_number)) latest.set(attempt.problem_number, attempt.result);
      }
      let correct = 0, partial = 0, wrong = 0;
      for (const result of latest.values()) {
        if (result === "correct") correct++;
        else if (result === "partial") partial++;
        else wrong++;
      }
      setCounts({ correct, partial, wrong, unattempted: Math.max(totalProblems - latest.size, 0) });
    }
    loadProgress();
  }, [bookId, unitId, totalProblems]);

  const total = Math.max(totalProblems, 1);
  return <div className="progress-wrapper">
    <div className="progress-bar">
      <div className="progress-correct" style={{ width: `${(counts.correct / total) * 100}%` }} />
      <div className="progress-partial" style={{ width: `${(counts.partial / total) * 100}%` }} />
      <div className="progress-wrong" style={{ width: `${(counts.wrong / total) * 100}%` }} />
      <div className="progress-unattempted" style={{ width: `${(counts.unattempted / total) * 100}%` }} />
    </div>
    <div className="progress-summary"><span>正解 {counts.correct}</span><span>部分 {counts.partial}</span><span>不正解 {counts.wrong}</span><span>未解答 {counts.unattempted}</span></div>
  </div>;
}

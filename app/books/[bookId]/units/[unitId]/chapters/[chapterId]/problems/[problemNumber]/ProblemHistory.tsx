"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../../../../../../lib/supabase";
import { formatDateTime } from "../../../../../../../../../lib/date";
import type { Attempt, Result } from "../../../../../../../../../types/database";

type Props = {
  bookId: string;
  unitId: string;
  problemNumber: string;
};

function symbol(result: Result) {
  return result === "correct" ? "○" : result === "partial" ? "△" : "×";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function parsePartialMistakes(value: string | null) {
  if (!value) return [];
  return Array.from(value.matchAll(/（([1-6])）/g), (m) => Number(m[1]));
}

function partialMistakeText(values: number[]) {
  return values.sort((a, b) => a - b).map((n) => `（${n}）`).join("、");
}

export default function ProblemHistory({ bookId, unitId, problemNumber }: Props) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<Result>("correct");
  const [editDuration, setEditDuration] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editPartial, setEditPartial] = useState<number[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("book_id", bookId)
      .eq("unit_id", unitId)
      .eq("problem_number", problemNumber)
      .order("attempted_at", { ascending: false });
    if (error) console.error(error);
    setAttempts((data ?? []) as Attempt[]);
  }

  useEffect(() => {
    load();
  }, [bookId, unitId, problemNumber]);

  function startEdit(attempt: Attempt) {
    setEditingId(attempt.id);
    setEditResult(attempt.result);
    setEditDuration(String(attempt.duration_seconds));
    setEditMemo(attempt.memo ?? "");
    setEditPartial(parsePartialMistakes(attempt.partial_mistake));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditResult("correct");
    setEditDuration("");
    setEditMemo("");
    setEditPartial([]);
  }

  function toggleEditPartial(number: number) {
    setEditPartial((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number].sort((a, b) => a - b)
    );
  }

  async function saveEdit(attempt: Attempt) {
    const duration = Number(editDuration);
    if (!Number.isFinite(duration) || duration < 0) {
      window.alert("所要時間は0以上の数字で入力してください。");
      return;
    }
    if (editResult === "partial" && editPartial.length === 0) {
      window.alert("部分正解だった箇所を1つ以上選択してください。");
      return;
    }

    const { error } = await supabase
      .from("attempts")
      .update({
        result: editResult,
        duration_seconds: duration,
        memo: editMemo.trim() || null,
        partial_mistake: editResult === "partial" ? partialMistakeText([...editPartial]) : null,
      })
      .eq("id", attempt.id);

    if (error) {
      console.error(error);
      return;
    }

    cancelEdit();
    await load();
  }

  async function deleteAttempt(attempt: Attempt) {
    if (!window.confirm("この挑戦記録を完全に削除しますか？")) return;
    const { error } = await supabase.from("attempts").delete().eq("id", attempt.id);
    if (error) {
      console.error(error);
      return;
    }
    await supabase.from("review_schedules").delete().eq("attempt_id", attempt.id);
    await load();
  }

  return (
    <section className="problem-history">
      <h2>過去の挑戦</h2>
      {attempts.length === 0 ? (
        <p>まだ記録がありません。</p>
      ) : (
        <div className="history-list">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="history-item">
              {editingId === attempt.id ? (
                <div className="history-edit">
                  <div className="history-edit-row">
                    <label>
                      結果
                      <select value={editResult} onChange={(event) => setEditResult(event.target.value as Result)}>
                        <option value="correct">○ 正解</option>
                        <option value="partial">△ 部分正解</option>
                        <option value="wrong">× 不正解</option>
                      </select>
                    </label>
                    <label>
                      所要時間（秒）
                      <input value={editDuration} onChange={(event) => setEditDuration(event.target.value)} inputMode="numeric" />
                    </label>
                  </div>
                  {editResult === "partial" && (
                    <div className="history-partial-edit">
                      <p>間違えた箇所</p>
                      <div className="partial-choice-grid">
                        {[1, 2, 3, 4, 5, 6].map((number) => (
                          <button key={number} type="button" className={editPartial.includes(number) ? "selected" : ""} onClick={() => toggleEditPartial(number)}>
                            （{number}）
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <label>
                    挑戦メモ
                    <textarea value={editMemo} onChange={(event) => setEditMemo(event.target.value)} />
                  </label>
                  <div className="history-actions">
                    <button type="button" onClick={() => saveEdit(attempt)}>保存</button>
                    <button type="button" onClick={cancelEdit}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong className={`history-result ${attempt.result}`}>
                      {symbol(attempt.result)}
                    </strong>
                    <span>{formatDateTime(attempt.attempted_at)}</span>
                    <span>{formatTime(attempt.duration_seconds)}</span>
                    {attempt.partial_mistake && <small>間違い：{attempt.partial_mistake}</small>}
                    {attempt.memo && <small>メモ：{attempt.memo}</small>}
                  </div>
                  <div className="history-actions">
                    <button type="button" onClick={() => startEdit(attempt)}>編集</button>
                    <button type="button" onClick={() => deleteAttempt(attempt)}>削除</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

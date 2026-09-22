"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../../../lib/supabase";
import type { Result } from "../../../../../../../types/database";

type A = {
  problem_number: string;
  result: Result;
  attempted_at: string;
  partial_mistake: string | null;
  memo: string | null;
};

type Props = {
  bookId: string;
  unitId: string;
  chapterId: string;
  problemNumbers: number[];
};

type Note = {
  problem_number: string;
  content: string;
};

function symbol(result: Result | null) {
  if (result === "correct") return "○";
  if (result === "partial") return "△";
  if (result === "wrong") return "×";
  return "";
}

export default function ProblemList({
  bookId,
  unitId,
  chapterId,
  problemNumbers,
}: Props) {
  const router = useRouter();

  const [attempts, setAttempts] = useState<A[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [countFilter, setCountFilter] = useState("all");

  const [editingProblem, setEditingProblem] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select(
          "problem_number,result,attempted_at,partial_mistake,memo"
        )
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

  const noteMap = useMemo(
    () =>
      new Map(
        notes.map((note) => [note.problem_number, note.content])
      ),
    [notes]
  );

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
      (filter === "wrongEver" &&
        arr.some((a) => a.result === "wrong")) ||
      (filter === "partialEver" &&
        arr.some((a) => a.result === "partial")) ||
      (filter === "latestWrong" && latest === "wrong") ||
      (filter === "latestPartial" && latest === "partial") ||
      (filter === "latestCorrect" && latest === "correct") ||
      (filter === "untouched" && !arr.length);

    const count = arr.length;

    const okC =
      countFilter === "all" ||
      (countFilter === "1" && count === 1) ||
      (countFilter === "2" && count === 2) ||
      (countFilter === "3" && count >= 3) ||
      (countFilter === "5" && count >= 5);

    return okQ && okF && okC;
  });

  function openNote(number: string) {
    setEditingProblem(number);
    setEditingText(noteMap.get(number) ?? "");
  }

  function closeNote() {
    if (savingNote) return;
    setEditingProblem(null);
    setEditingText("");
  }

  async function saveNote() {
    if (!editingProblem) return;

    setSavingNote(true);

    const existing = notes.find(
      (note) => note.problem_number === editingProblem
    );

    let error = null;

    if (existing) {
      const result = await supabase
        .from("problem_notes")
        .update({
          content: editingText,
          updated_at: new Date().toISOString(),
        })
        .eq("book_id", bookId)
        .eq("unit_id", unitId)
        .eq("problem_number", editingProblem);

      error = result.error;
    } else {
      const result = await supabase.from("problem_notes").insert({
        book_id: bookId,
        unit_id: unitId,
        problem_number: editingProblem,
        content: editingText,
        updated_at: new Date().toISOString(),
      });

      error = result.error;
    }

    if (error) {
      console.error(error);
      setSavingNote(false);
      return;
    }

    setNotes((current) => {
      const filtered = current.filter(
        (note) => note.problem_number !== editingProblem
      );

      if (!editingText.trim()) {
        return filtered;
      }

      return [
        ...filtered,
        {
          problem_number: editingProblem,
          content: editingText,
        },
      ];
    });

    setSavingNote(false);
    closeNote();
  }

  return (
    <>
      <section className="problem-list">
        <div className="problem-filter">
          <input
            placeholder="問題番号を検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="wrongEver">不正解経験あり</option>
            <option value="partialEver">部分正解経験あり</option>
            <option value="latestWrong">最新が不正解</option>
            <option value="latestPartial">最新が部分正解</option>
            <option value="latestCorrect">最新が正解</option>
            <option value="untouched">未挑戦</option>
          </select>

          <select
            value={countFilter}
            onChange={(e) => setCountFilter(e.target.value)}
          >
            <option value="all">回数：すべて</option>
            <option value="1">1回</option>
            <option value="2">2回</option>
            <option value="3">3回以上</option>
            <option value="5">5回以上</option>
          </select>
        </div>

        {list.map((number) => {
          const numberText = String(number);
          const arr = by.get(numberText) ?? [];
          const latest = arr.at(-1);
          const note = noteMap.get(numberText);

          return (
            <div
              key={number}
              className="problem-card"
              onClick={() =>
                router.push(
                  `/books/${bookId}/units/${unitId}/chapters/${chapterId}/problems/${number}`
                )
              }
            >
              <div className="problem-status-slot">
                {latest && (
                  <span
                    className={`problem-symbol ${latest.result}`}
                  >
                    {symbol(latest.result)}
                  </span>
                )}
              </div>

              <div className="problem-attempt-slot">
                {latest ? (
                  <span
                    className={`problem-attempt-count ${latest.result}`}
                  >
                    {arr.length}
                  </span>
                ) : (
                  <span className="problem-attempt-count-empty">
                    —
                  </span>
                )}
              </div>

              <div className="problem-number">
                {number}
              </div>

              <button
                type="button"
                className={`problem-note ${
                  note ? "has-note" : "empty-note"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  openNote(numberText);
                }}
              >
                {note || "方針・考え方"}
              </button>

              <span className="problem-arrow">→</span>
            </div>
          );
        })}

        {!list.length && (
          <div className="empty-state">
            条件に一致する問題はありません。
          </div>
        )}
      </section>

      {editingProblem !== null && (
        <div
          className="problem-note-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeNote();
            }
          }}
        >
          <div
            ref={overlayRef}
            className="problem-note-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="problem-note-modal-title">
              問題{editingProblem}
              <span>方針・考え方</span>
            </div>

            <textarea
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="方針・考え方を入力"
            />

            <div className="problem-note-modal-actions">
              <button
                type="button"
                className="problem-note-cancel"
                onClick={closeNote}
                disabled={savingNote}
              >
                キャンセル
              </button>

              <button
                type="button"
                className="problem-note-save"
                onClick={saveNote}
                disabled={savingNote}
              >
                {savingNote ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
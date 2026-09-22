"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getToday } from "../../lib/date";
import { addDays } from "../../lib/review";
import type { ReviewSchedule } from "../../types/database";
import BottomNav from "../../components/BottomNav";

type ReviewRow = ReviewSchedule & {
  chapter_id?: string;
};

export default function ReviewPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("review_schedules")
      .select("*")
      .eq("completed", false)
      .lte("scheduled_date", getToday())
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("復習予定の取得に失敗しました:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ReviewRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * 現在の問題集は、book_id / unit_id / problem_number
   * から直接問題ページのURLを作れる。
   *
   * 例：
   * physics-2021-jumon
   * unit-01
   * 1
   *
   * ↓
   * /books/physics-2021-jumon/units/unit-01/chapters/unit-01/problems/1
   */
  function getProblemHref(row: ReviewRow) {
    return (
      `/books/${row.book_id}` +
      `/units/${row.unit_id}` +
      `/chapters/${row.unit_id}` +
      `/problems/${encodeURIComponent(row.problem_number)}` +
      `?reviewId=${encodeURIComponent(row.id)}`
    );
  }

  const startReview = (row: ReviewRow) => {
    const href = getProblemHref(row);

    window.location.href = href;
  };

  const startAllReviews = () => {
    if (rows.length === 0) return;

    const first = rows[0];

    const href = getProblemHref(first);

    const ids = rows.map((row) => row.id).join(",");

    window.location.href =
      `${href}&reviewQueue=${encodeURIComponent(ids)}`;
  };

  const choose = async (row: ReviewRow, yes: boolean) => {
    const { error: updateError } = await supabase
      .from("review_schedules")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      console.error(updateError);
      window.alert(
        `復習予定の更新に失敗しました。\n${updateError.message}`
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("review_schedules")
      .insert({
        book_id: row.book_id,
        unit_id: row.unit_id,
        problem_number: row.problem_number,
        review_type: row.review_type,
        review_round: row.review_round + 1,
        scheduled_date: addDays(
          getToday(),
          yes ? 30 : 90
        ),
        completed: false,
        stage: yes ? "extra30" : "day90",
      });

    if (insertError) {
      console.error(insertError);
      window.alert(
        `次の復習予定の登録に失敗しました。\n${insertError.message}`
      );
      return;
    }

    load();
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link href="/">←</Link>

        <div>
          <h1>今日の復習</h1>
          <p>弱点を定着させる</p>
        </div>
      </header>

      <section className="page-section">
        {loading ? (
          <div className="empty-state">
            読み込み中...
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            今日の復習はありません。
          </div>
        ) : (
          <>
            <div
              style={{
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <strong>
                今日の復習 {rows.length}問
              </strong>

              {rows.length >= 2 && (
                <button
                  type="button"
                  onClick={startAllReviews}
                  className="primary-button"
                >
                  まとめて復習する
                </button>
              )}
            </div>

            {rows.map((row) => (
              <article
                className="review-card"
                key={row.id}
              >
                <div className="review-main">
                  <strong>
                    問題 {row.problem_number}
                  </strong>

                  <span>
                    {row.stage === "day90"
                      ? "3か月後の最終確認"
                      : row.stage === "day30" ||
                          row.stage === "extra30"
                        ? "1か月後の復習"
                        : label(row.stage)}
                  </span>

                  <small>
                    予定日：{row.scheduled_date}
                  </small>
                </div>

                {row.stage === "day30" ||
                row.stage === "extra30" ? (
                  <div className="review-choice">
                    <p>来月も復習する？</p>

                    <button
                      type="button"
                      onClick={() =>
                        choose(row, true)
                      }
                    >
                      はい
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        choose(row, false)
                      }
                    >
                      いいえ → 3か月後
                    </button>
                  </div>
                ) : (
                  <div className="review-buttons">
                    <button
                      type="button"
                      onClick={() =>
                        startReview(row)
                      }
                    >
                      復習する
                    </button>
                  </div>
                )}
              </article>
            ))}
          </>
        )}
      </section>

      <BottomNav current="plan" />
    </main>
  );
}

function label(stage: string) {
  if (stage === "day1") return "翌日の復習";
  if (stage === "day7") return "1週間後の復習";
  if (stage === "day14") return "2週間後の復習";

  return "復習";
}
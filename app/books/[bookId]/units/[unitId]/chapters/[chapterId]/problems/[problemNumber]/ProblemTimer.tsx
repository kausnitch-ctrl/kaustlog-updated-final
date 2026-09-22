"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../../../../../../lib/supabase";
import type { Result } from "../../../../../../../../../types/database";

type Props = {
  bookId: string;
  unitId: string;
  problemNumber: string;
  nextProblemHref: string | null;
  isChapterClear: boolean;
  isBookComplete: boolean;
  unitName: string;
  bookName: string;
};

const CONTINUOUS_MODE_KEY = "kaustlog-continuous-mode";
const AUTO_NEXT_DELAY_KEY = "kaustlog-auto-next-delay";

const resultSymbol: Record<Result, string> = {
  correct: "○",
  partial: "△",
  wrong: "×",
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
}

function parsePartialMistakes(value: string | null) {
  if (!value) return [];

  return Array.from(
    value.matchAll(/（([1-6])）/g),
    (m) => Number(m[1])
  );
}

function partialMistakeText(values: number[]) {
  return values
    .sort((a, b) => a - b)
    .map((n) => `（${n}）`)
    .join("、");
}

type ReviewScheduleRow = {
  id: string;
  attempt_id: string | null;
  book_id: string;
  unit_id: string;
  problem_number: string;
  review_type: string;
  review_round: number;
  scheduled_date: string;
  completed: boolean;
  completed_at: string | null;
  stage: string;
};

export default function ProblemTimer({
  bookId,
  unitId,
  problemNumber,
  nextProblemHref,
  isChapterClear,
  isBookComplete,
  unitName,
  bookName,
}: Props) {
  const router = useRouter();

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedResult, setSavedResult] = useState<Result | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const [previousAttempt, setPreviousAttempt] = useState<{
    result: Result;
    duration_seconds: number;
    partial_mistake: string | null;
  } | null>(null);

  const [partialMistakes, setPartialMistakes] = useState<number[]>(
    []
  );

  const [showPartialMistakes, setShowPartialMistakes] =
    useState(false);

  const [problemNote, setProblemNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const [continuousMode, setContinuousMode] = useState(false);
  const [autoNextDelay, setAutoNextDelay] = useState(2);

  // =========================
  // 復習モード
  // =========================

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [currentReview, setCurrentReview] =
    useState<ReviewScheduleRow | null>(null);

  const [reviewChoiceNeeded, setReviewChoiceNeeded] =
    useState(false);

  const [reviewCompletedMessage, setReviewCompletedMessage] =
    useState(false);

  // URLから復習モード情報を取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const currentReviewId = params.get("reviewId");
    const queueText = params.get("reviewQueue");

    if (currentReviewId) {
      setReviewId(currentReviewId);
    }

    if (queueText) {
      setReviewQueue(
        queueText
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      );
    }
  }, []);

  // 現在の復習予定を取得
  useEffect(() => {
    if (!reviewId) return;

    async function loadReviewSchedule() {
      const { data, error } = await supabase
        .from("review_schedules")
        .select("*")
        .eq("id", reviewId)
        .maybeSingle();

      if (error) {
        console.error(
          "復習予定の取得に失敗しました:",
          error
        );
        return;
      }

      if (data) {
        setCurrentReview(data as ReviewScheduleRow);
      }
    }

    loadReviewSchedule();
  }, [reviewId]);

  // =========================
  // 連続モード設定
  // =========================

  useEffect(() => {
    const savedContinuousMode = localStorage.getItem(
      CONTINUOUS_MODE_KEY
    );

    const savedDelay = localStorage.getItem(
      AUTO_NEXT_DELAY_KEY
    );

    if (savedContinuousMode !== null) {
      setContinuousMode(savedContinuousMode === "true");
    }

    if (savedDelay !== null) {
      const delay = Number(savedDelay);

      if (
        Number.isFinite(delay) &&
        delay >= 0 &&
        delay <= 5
      ) {
        setAutoNextDelay(delay);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CONTINUOUS_MODE_KEY,
      String(continuousMode)
    );
  }, [continuousMode]);

  useEffect(() => {
    localStorage.setItem(
      AUTO_NEXT_DELAY_KEY,
      String(autoNextDelay)
    );
  }, [autoNextDelay]);

  // =========================
  // 履歴・メモ
  // =========================

  useEffect(() => {
    async function loadHistory() {
      const { data, error } = await supabase
        .from("attempts")
        .select(
          "id,result,duration_seconds,partial_mistake,attempted_at"
        )
        .eq("book_id", bookId)
        .eq("unit_id", unitId)
        .eq("problem_number", problemNumber)
        .order("attempted_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setAttemptCount(data?.length ?? 0);

      if (data && data.length > 0) {
        setPreviousAttempt({
          result: data[0].result as Result,
          duration_seconds: data[0].duration_seconds,
          partial_mistake: data[0].partial_mistake,
        });
      } else {
        setPreviousAttempt(null);
      }
    }

    async function loadNote() {
      const { data, error } = await supabase
        .from("problem_notes")
        .select("content")
        .eq("book_id", bookId)
        .eq("unit_id", unitId)
        .eq("problem_number", problemNumber)
        .maybeSingle();

      if (error) console.error(error);

      setProblemNote(data?.content ?? "");
    }

    loadHistory();
    loadNote();
  }, [bookId, unitId, problemNumber]);

  // =========================
  // タイマー
  // =========================

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(
      () => setSeconds((current) => current + 1),
      1000
    );

    return () => window.clearInterval(timer);
  }, [running]);

  // =========================
  // 部分正解
  // =========================

  function togglePartialMistake(number: number) {
    setPartialMistakes((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number].sort((a, b) => a - b)
    );
  }

  // =========================
  // 問題メモ
  // =========================

  async function saveProblemNote() {
    const { data, error } = await supabase
      .from("problem_notes")
      .select("id")
      .eq("book_id", bookId)
      .eq("unit_id", unitId)
      .eq("problem_number", problemNumber)
      .maybeSingle();

    if (error) {
      console.error(error);
      return false;
    }

    if (data) {
      const { error: updateError } = await supabase
        .from("problem_notes")
        .update({
          content: problemNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updateError) {
        console.error(updateError);
        return false;
      }
    } else if (problemNote.trim()) {
      const { error: insertError } = await supabase
        .from("problem_notes")
        .insert({
          book_id: bookId,
          unit_id: unitId,
          problem_number: problemNumber,
          content: problemNote,
        });

      if (insertError) {
        console.error(insertError);
        return false;
      }
    }

    setNoteSaved(true);

    window.setTimeout(
      () => setNoteSaved(false),
      1800
    );

    return true;
  }

  // =========================
  // 次の復習予定を作る
  // =========================

  async function createNextReview(
    review: ReviewScheduleRow,
    result: Result
  ) {
    const today = new Date().toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
      }
    );

    let next:
      | {
          book_id: string;
          unit_id: string;
          problem_number: string;
          review_type: string;
          review_round: number;
          scheduled_date: string;
          completed: boolean;
          stage: string;
        }
      | null = null;

    if (review.stage === "day1") {
      next = {
        book_id: review.book_id,
        unit_id: review.unit_id,
        problem_number: review.problem_number,
        review_type: review.review_type,
        review_round: review.review_round,
        scheduled_date: addDaysToDate(today, 7),
        completed: false,
        stage: "day7",
      };
    } else if (review.stage === "day7") {
      next = {
        book_id: review.book_id,
        unit_id: review.unit_id,
        problem_number: review.problem_number,
        review_type: review.review_type,
        review_round: review.review_round,
        scheduled_date: addDaysToDate(today, 14),
        completed: false,
        stage: "day14",
      };
    } else if (review.stage === "day14") {
      next = {
        book_id: review.book_id,
        unit_id: review.unit_id,
        problem_number: review.problem_number,
        review_type: review.review_type,
        review_round: review.review_round,
        scheduled_date: addDaysToDate(today, 30),
        completed: false,
        stage: "day30",
      };
    } else if (
      review.stage === "day30" ||
      review.stage === "extra30"
    ) {
      // 1か月後の復習は、
      // 「来月も復習する？」をあとで表示する。
      setReviewChoiceNeeded(true);
      return;
    } else if (review.stage === "day90") {
      if (result !== "correct") {
        next = {
          book_id: review.book_id,
          unit_id: review.unit_id,
          problem_number: review.problem_number,
          review_type: review.review_type,
          review_round: review.review_round + 1,
          scheduled_date: addDaysToDate(today, 1),
          completed: false,
          stage: "day1",
        };
      }
    }

    if (!next) return;

    const { error } = await supabase
      .from("review_schedules")
      .insert(next);

    if (error) {
      console.error(
        "次の復習予定の登録に失敗しました:",
        error
      );

      window.alert(
        `次の復習予定の登録に失敗しました。\n${error.message}`
      );
    }
  }

  // =========================
  // 復習予定の日付計算
  // =========================

  function addDaysToDate(
    dateText: string,
    days: number
  ) {
    const date = new Date(`${dateText}T00:00:00+09:00`);

    date.setDate(date.getDate() + days);

    return date.toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
      }
    );
  }

  // =========================
  // 復習予定を完了
  // =========================

  async function completeCurrentReview(
    result: Result,
    attemptId: string
  ) {
    if (!reviewId || !currentReview) return true;

    const { error } = await supabase
      .from("review_schedules")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      console.error(
        "復習予定の完了処理に失敗しました:",
        error
      );

      window.alert(
        `復習予定の完了処理に失敗しました。\n${error.message}`
      );

      return false;
    }

    await createNextReview(
      currentReview,
      result
    );

    return true;
  }

  // =========================
  // 復習キューの次の問題
  // =========================

  async function goToNextReview() {
  const currentIndex = reviewQueue.indexOf(
    reviewId ?? ""
  );

  const nextReviewId =
    currentIndex >= 0
      ? reviewQueue[currentIndex + 1]
      : null;

  // 次の復習問題がない
  if (!nextReviewId) {
    setReviewCompletedMessage(true);
    return;
  }

  // 次の復習予定を取得
  const {
    data: review,
    error: reviewError,
  } = await supabase
    .from("review_schedules")
    .select("*")
    .eq("id", nextReviewId)
    .maybeSingle();

  if (reviewError || !review) {
    console.error(
      "次の復習予定を取得できませんでした:",
      reviewError
    );

    setReviewCompletedMessage(true);
    return;
  }

  /*
   * 現在の問題集は
   *
   * book_id
   * unit_id
   * problem_number
   *
   * から直接問題ページを作れる。
   *
   * 例：
   * physics-2021-jumon
   * unit-01
   * 1
   *
   * ↓
   * /books/physics-2021-jumon/
   * units/unit-01/
   * chapters/unit-01/
   * problems/1
   */

  const queueText = reviewQueue.join(",");

  const href =
    `/books/${review.book_id}` +
    `/units/${review.unit_id}` +
    `/chapters/${review.unit_id}` +
    `/problems/${encodeURIComponent(
      review.problem_number
    )}` +
    `?reviewId=${encodeURIComponent(
      nextReviewId
    )}` +
    `&reviewQueue=${encodeURIComponent(
      queueText
    )}`;

  router.push(href);
}

  // =========================
  // 1か月後の復習
  // =========================

  async function chooseNextMonthReview(
    yes: boolean
  ) {
    if (!currentReview || !reviewId) return;

    const today = new Date().toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
      }
    );

    const scheduledDate = addDaysToDate(
      today,
      yes ? 30 : 90
    );

    const nextStage = yes
      ? "extra30"
      : "day90";

    const { error } = await supabase
      .from("review_schedules")
      .insert({
        book_id: currentReview.book_id,
        unit_id: currentReview.unit_id,
        problem_number:
          currentReview.problem_number,
        review_type:
          currentReview.review_type,
        review_round:
          currentReview.review_round + 1,
        scheduled_date: scheduledDate,
        completed: false,
        stage: nextStage,
      });

    if (error) {
      console.error(error);

      window.alert(
        `次の復習予定の登録に失敗しました。\n${error.message}`
      );

      return;
    }

    setReviewChoiceNeeded(false);

    if (reviewQueue.length > 0) {
      await goToNextReview();
    } else {
      setReviewCompletedMessage(true);
    }
  }

  // =========================
  // 結果保存
  // =========================

  async function saveResult(result: Result) {
    if (saving || saved) return;

    if (
      result === "partial" &&
      partialMistakes.length === 0
    ) {
      window.alert(
        "部分正解だった箇所を1つ以上選択してください。"
      );
      return;
    }

    setRunning(false);
    setSaving(true);

    await saveProblemNote();

    const mistake =
      result === "partial"
        ? partialMistakeText([
            ...partialMistakes,
          ])
        : null;

    const {
      data: insertedAttempt,
      error,
    } = await supabase
      .from("attempts")
      .insert({
        book_id: bookId,
        unit_id: unitId,
        problem_number: problemNumber,
        result,
        duration_seconds: seconds,
        partial_mistake: mistake,
        memo: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);

      setRunning(true);
      setSaving(false);

      window.alert(
        `記録の保存に失敗しました。\n${error.message}`
      );

      return;
    }

    setAttemptCount(
      (current) => current + 1
    );

    // =========================
    // 復習モード
    // =========================

    if (
      reviewId &&
      currentReview &&
      insertedAttempt?.id
    ) {
      const reviewCompleted =
        await completeCurrentReview(
          result,
          insertedAttempt.id
        );

      if (!reviewCompleted) {
        setSaving(false);
        return;
      }

      setSavedResult(result);
      setSaved(true);
      setSaving(false);

      // 1か月後の復習なら、
      // 結果画面で「来月も復習する？」を出す
      if (
        currentReview.stage === "day30" ||
        currentReview.stage === "extra30"
      ) {
        return;
      }

      return;
    }

    // =========================
    // 通常モードの復習登録
    // =========================

    if (
      result === "correct" &&
      window.confirm(
        "この問題は復習が必要ですか？\nOKで7日後に復習登録します。"
      )
    ) {
      const {
        error: reviewError,
      } = await supabase
        .from("review_schedules")
        .insert({
          attempt_id:
            insertedAttempt?.id ?? null,
          book_id: bookId,
          unit_id: unitId,
          problem_number:
            problemNumber,
          review_type: "needed",
          review_round: 1,
          scheduled_date:
            new Date(
              Date.now() +
                7 * 86400000
            ).toLocaleDateString(
              "en-CA",
              {
                timeZone:
                  "Asia/Tokyo",
              }
            ),
          completed: false,
          stage: "day7",
        });

      if (reviewError) {
        console.error(
          "復習予定の登録に失敗しました:",
          reviewError
        );

        window.alert(
          `復習予定の登録に失敗しました。\n${reviewError.message}`
        );
      }
    }

    // =========================
    // 不正解・部分正解
    // =========================

    if (
      result === "wrong" ||
      result === "partial"
    ) {
      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("review_schedules")
        .select("id")
        .eq("book_id", bookId)
        .eq("unit_id", unitId)
        .eq(
          "problem_number",
          problemNumber
        )
        .eq("completed", false)
        .maybeSingle();

      if (existingError) {
        console.error(
          "復習予定の確認に失敗しました:",
          existingError
        );

        window.alert(
          `復習予定を確認できませんでした。\n${existingError.message}`
        );
      } else if (!existing) {
       const scheduledDate =
  new Date(
    Date.now() + 86400000
  ).toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "Asia/Tokyo",
    }
  );
        const {
          error: reviewInsertError,
        } = await supabase
          .from("review_schedules")
          .insert({
            attempt_id:
              insertedAttempt?.id ??
              null,
            book_id: bookId,
            unit_id: unitId,
            problem_number:
              problemNumber,
            review_type: result,
            review_round: 1,
            scheduled_date:
              scheduledDate,
            completed: false,
            stage: "day1",
          });

        if (reviewInsertError) {
          console.error(
            "復習予定の登録に失敗しました:",
            reviewInsertError
          );

          window.alert(
            `復習予定の登録に失敗しました。\n${reviewInsertError.message}`
          );
        } else {
          console.log(
            `復習予定を登録しました：${scheduledDate}`
          );
        }
      }
    }

    setSavedResult(result);
    setSaved(true);
    setSaving(false);

    if (
      continuousMode &&
      nextProblemHref &&
      !isBookComplete
    ) {
      const delay = isChapterClear
        ? Math.max(
            autoNextDelay,
            2.6
          )
        : autoNextDelay;

      window.setTimeout(
        () =>
          router.push(
            nextProblemHref
          ),
        delay * 1000
      );
    }
  }

  // =========================
  // 次の問題
  // =========================

  function goNext() {
    if (nextProblemHref) {
      router.push(nextProblemHref);
    }
  }

  function goBackToProblems() {
    router.push(
      `/books/${bookId}/units/${unitId}/chapters/${unitId}`
    );
  }

  // =========================
  // 復習完了画面
  // =========================

  if (reviewCompletedMessage) {
    return (
      <section className="result-screen chapter-complete">
        <div className="result-content">
          <p className="result-kicker">
            REVIEW COMPLETE
          </p>

          <div className="result-chapter-icon">
            ✓
          </div>

          <h2>今日の復習完了！</h2>

          <div className="chapter-clear-message">
            <strong>
              すべて解き終わりました
            </strong>

            <span>
              おつかれさまでした
            </span>
          </div>

          <button
            type="button"
            className="result-back-button"
            onClick={() =>
              router.push("/review")
            }
          >
            復習一覧へ戻る
          </button>
        </div>
      </section>
    );
  }

  // =========================
  // 1か月後の復習選択
  // =========================

  if (
    saved &&
    reviewChoiceNeeded &&
    currentReview
  ) {
    return (
      <section className="result-screen chapter-complete">
        <div className="result-content">
          <p className="result-kicker">
            REVIEW
          </p>

          <div className="result-chapter-icon">
            ✓
          </div>

          <h2>1か月後の復習完了</h2>

          <div className="chapter-clear-message">
            <strong>
              来月も復習する？
            </strong>

            <span>
              「はい」なら1か月後、
              「いいえ」なら3か月後です。
            </span>
          </div>

          <div className="result-actions">
            <button
              type="button"
              className="result-next-button"
              onClick={() =>
                chooseNextMonthReview(true)
              }
            >
              はい
            </button>

            <button
              type="button"
              className="result-back-button"
              onClick={() =>
                chooseNextMonthReview(false)
              }
            >
              いいえ → 3か月後
            </button>
          </div>
        </div>
      </section>
    );
  }

  // =========================
  // 結果画面
  // =========================

  if (saved) {
    // 一冊完走
    if (isBookComplete) {
      return (
        <section className="result-screen book-complete">
          <div className="celebration-glow" />

          <div className="confetti confetti-a">
            ✦
          </div>
          <div className="confetti confetti-b">
            ✦
          </div>
          <div className="confetti confetti-c">
            ✦
          </div>
          <div className="confetti confetti-d">
            ✦
          </div>

          <div className="result-content">
            <p className="result-kicker">
              BOOK COMPLETE
            </p>

            <div className="result-big-icon">
              🏆
            </div>

            <h2>一冊完走！</h2>

            <p className="result-book-name">
              {bookName}
            </p>

            <div className="book-complete-message">
              <strong>
                最後までやり切った！
              </strong>

              <span>
                この一冊を完全制覇しました。
              </span>
            </div>

            <div className="result-stars">
              ✦ ✦ ✦
            </div>

            <p className="next-problem-message">
              おつかれさまでした
            </p>

            <button
              type="button"
              className="result-back-button"
              onClick={goBackToProblems}
            >
              問題一覧へ戻る
            </button>
          </div>
        </section>
      );
    }

    // 章クリア
    if (isChapterClear) {
      return (
        <section className="result-screen chapter-complete">
          <div className="chapter-sparkle sparkle-a">
            ✦
          </div>

          <div className="chapter-sparkle sparkle-b">
            ✦
          </div>

          <div className="chapter-sparkle sparkle-c">
            ✦
          </div>

          <div className="result-content">
            <p className="result-kicker">
              CHAPTER CLEAR
            </p>

            <div className="result-chapter-icon">
              ✓
            </div>

            <h2>章クリア！</h2>

            <p className="result-book-name">
              {unitName}
            </p>

            <div className="chapter-clear-message">
              <strong>
                この章を完走しました
              </strong>

              <span>
                {continuousMode
                  ? "次の章へ進みます"
                  : "おつかれさまでした"}
              </span>
            </div>

            <div className="result-stars">
              ✦ ✦ ✦
            </div>

            {continuousMode ? (
              <p className="next-problem-message">
                {autoNextDelay === 0
                  ? "次の章へ進むボタンを押してください"
                  : "次の章へ…"}
              </p>
            ) : (
              <div className="result-actions">
                <button
                  type="button"
                  className="result-next-button"
                  onClick={goNext}
                >
                  次の章へ →
                </button>

                <button
                  type="button"
                  className="result-back-button"
                  onClick={goBackToProblems}
                >
                  問題一覧へ戻る
                </button>
              </div>
            )}
          </div>
        </section>
      );
    }

    // 復習モードなら次の復習へ
    if (reviewId) {
      const isLastReview =
        reviewQueue.length === 0 ||
        reviewQueue.indexOf(
          reviewId
        ) ===
          reviewQueue.length - 1;

      return (
        <section
          className={`result-screen result-${savedResult}`}
        >
          <div className="result-content">
            <div className="result-small-icon">
              {savedResult === "correct"
                ? "✓"
                : savedResult === "partial"
                  ? "＋"
                  : "↗"}
            </div>

            <h2>
              {savedResult === "correct"
                ? "正解！"
                : savedResult === "partial"
                  ? "あと一歩！"
                  : "もう一度復習しよう"}
            </h2>

            <p>
              {savedResult === "correct"
                ? "その調子！"
                : savedResult === "partial"
                  ? "考え方はかなり近いです"
                  : "次の復習で取り返そう"}
            </p>

            <strong className="result-time">
              {formatTime(seconds)}
            </strong>

            {isLastReview ? (
              <button
                type="button"
                className="result-next-button"
                onClick={() =>
                  setReviewCompletedMessage(
                    true
                  )
                }
              >
                復習完了
              </button>
            ) : (
              <button
                type="button"
                className="result-next-button"
                onClick={goToNextReview}
              >
                次の復習問題へ →
              </button>
            )}
          </div>
        </section>
      );
    }

    // 通常の問題終了
    const resultTitle =
      savedResult === "correct"
        ? "正解！"
        : savedResult === "partial"
          ? "あと一歩！"
          : "次で取り返そう";

    const resultMessage =
      savedResult === "correct"
        ? "その調子！"
        : savedResult === "partial"
          ? "考え方はかなり近いです"
          : "記録できたことが大事";

    return (
      <section
        className={`result-screen result-${savedResult}`}
      >
        <div className="result-content">
          <div className="result-small-icon">
            {savedResult === "correct"
              ? "✓"
              : savedResult === "partial"
                ? "＋"
                : "↗"}
          </div>

          <h2>{resultTitle}</h2>

          <p>{resultMessage}</p>

          <strong className="result-time">
            {formatTime(seconds)}
          </strong>

          {continuousMode &&
          nextProblemHref &&
          autoNextDelay > 0 ? (
            <p className="next-problem-message">
              {autoNextDelay}
              秒後に次の問題へ…
            </p>
          ) : (
            <div className="result-actions">
              {nextProblemHref && (
                <button
                  type="button"
                  className="result-next-button"
                  onClick={goNext}
                >
                  次の問題へ →
                </button>
              )}

              <button
                type="button"
                className="result-back-button"
                onClick={goBackToProblems}
              >
                問題一覧へ戻る
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // =========================
  // 問題を解いている画面
  // =========================

  return (
    <section className="problem-screen">
      {reviewId && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 12px",
            borderRadius: "10px",
            background: "#f1f6f2",
            color: "#53645a",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          復習モード
        </div>
      )}

      <div className="problem-heading-row">
        <div className="problem-previous">
          {previousAttempt && (
            <span
              className={`previous-result ${previousAttempt.result}`}
            >
              {resultSymbol[
                previousAttempt.result
              ]}

              {previousAttempt.result ===
                "partial" &&
              previousAttempt.partial_mistake
                ? ` ${previousAttempt.partial_mistake}`
                : ""}

              <span className="previous-duration">
                {formatTime(
                  previousAttempt.duration_seconds
                )}
              </span>
            </span>
          )}
        </div>

        <p className="problem-label">
          問題 {problemNumber}
        </p>

        <span className="problem-attempts">
          {attemptCount}回
        </span>
      </div>

      <div className="timer">
        {formatTime(seconds)}
      </div>

      <div className="timer-controls">
        <button
          type="button"
          className="pause-button"
          onClick={() =>
            setRunning(
              (current) => !current
            )
          }
        >
          {running
            ? "⏸ 一時停止"
            : "▶ 再開"}
        </button>

        <span className="timer-status">
          {running
            ? "計測中"
            : "一時停止中"}
        </span>
      </div>

      <div className="result-buttons">
        <button
          className="result-button correct"
          onClick={() =>
            saveResult("correct")
          }
          disabled={saving}
        >
          ○
        </button>

        <button
          className={`result-button partial ${
            showPartialMistakes
              ? "selected"
              : ""
          }`}
          onClick={() => {
            setShowPartialMistakes(true);

            window.setTimeout(
              () =>
                document
                  .getElementById(
                    "partial-mistakes"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  }),
              0
            );
          }}
          disabled={saving}
        >
          △
        </button>

        <button
          className="result-button wrong"
          onClick={() =>
            saveResult("wrong")
          }
          disabled={saving}
        >
          ×
        </button>
      </div>

      {showPartialMistakes && (
        <div
          id="partial-mistakes"
          className="partial-mistake-panel"
        >
          <p>
            △ 部分正解だった箇所
          </p>

          <div className="partial-choice-grid">
            {[1, 2, 3, 4, 5, 6].map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  className={
                    partialMistakes.includes(
                      number
                    )
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    togglePartialMistake(
                      number
                    )
                  }
                  disabled={saving}
                >
                  （{number}）
                </button>
              )
            )}
          </div>

          {partialMistakes.length >
            0 && (
            <small>
              選択中：
              {partialMistakeText([
                ...partialMistakes,
              ])}
            </small>
          )}

          <button
            type="button"
            className="partial-confirm-button"
            onClick={() =>
              saveResult("partial")
            }
            disabled={
              partialMistakes.length ===
                0 || saving
            }
          >
            確定
          </button>

          <button
            type="button"
            className="partial-cancel-button"
            onClick={() => {
              setShowPartialMistakes(
                false
              );
              setPartialMistakes([]);
            }}
            disabled={saving}
          >
            キャンセル
          </button>
        </div>
      )}

      <div className="problem-note timer-problem-note">
        <div className="problem-note-title-row">
          <h2>方針・考え方</h2>

          {noteSaved && (
            <small>
              保存しました
            </small>
          )}
        </div>

        <textarea
          value={problemNote}
          onChange={(event) => {
            setProblemNote(
              event.target.value
            );
            setNoteSaved(false);
          }}
          placeholder="この問題を解くときの方針・考え方を残す。前回の内容に追記・編集できます。"
        />

        <button
          type="button"
          className="small-button"
          onClick={saveProblemNote}
        >
          保存
        </button>
      </div>

      <div className="continuous-settings">
        <label className="continuous-toggle">
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(event) =>
              setContinuousMode(
                event.target.checked
              )
            }
          />

          <span>
            連続モード
          </span>
        </label>

        {continuousMode && (
          <div className="auto-next-setting">
            <label htmlFor="auto-next-delay">
              自動で次の問題へ
            </label>

            <select
              id="auto-next-delay"
              value={autoNextDelay}
              onChange={(event) =>
                setAutoNextDelay(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={0}>
                自動遷移しない
              </option>

              <option value={0.5}>
                0.5秒
              </option>

              <option value={1}>
                1秒
              </option>

              <option value={2}>
                2秒
              </option>

              <option value={3}>
                3秒
              </option>

              <option value={4}>
                4秒
              </option>

              <option value={5}>
                5秒
              </option>
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
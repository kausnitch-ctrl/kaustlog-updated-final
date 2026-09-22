"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import BottomNav from "../../../components/BottomNav";

type Exam = {
  id: string;
  name: string;
  exam_type: string | null;
  exam_date: string;
  scope: string | null;
  goal: string | null;
};

type ExamResult = {
  id: string;
  exam_id: string;
  subject: string;
  score: number | null;
  max_score: number | null;
  rank: number | null;
  deviation: number | null;
  judgment: string | null;
  memo: string | null;
  created_at: string;
};

type ExamWithResults = {
  id: string;
  name: string;
  exam_date: string;
  exam_type: string | null;
};

export default function ExamDetail() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [allExams, setAllExams] = useState<ExamWithResults[]>([]);

  const [subjectChoice, setSubjectChoice] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [rank, setRank] = useState("");
  const [deviation, setDeviation] = useState("");
  const [judgment, setJudgment] = useState("");
  const [memo, setMemo] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    const examResponse = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examResponse.error) {
      setError(
        `試験を読み込めませんでした：${examResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    setExam(examResponse.data as Exam);

    const resultResponse = await supabase
      .from("exam_results")
      .select("*")
      .eq("exam_id", examId)
      .order("created_at", { ascending: true });

    if (resultResponse.error) {
      setError(
        `成績を読み込めませんでした：${resultResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    setResults((resultResponse.data ?? []) as ExamResult[]);

    const examsResponse = await supabase
      .from("exams")
      .select("id,name,exam_date,exam_type")
      .order("exam_date", { ascending: true });

    if (examsResponse.error) {
      setError(
        `試験履歴を読み込めませんでした：${examsResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    setAllExams(
      (examsResponse.data ?? []) as ExamWithResults[]
    );

    const allResultsResponse = await supabase
      .from("exam_results")
      .select("*")
      .order("created_at", { ascending: true });

    if (allResultsResponse.error) {
      setError(
        `成績履歴を読み込めませんでした：${allResultsResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    setAllResults(
      (allResultsResponse.data ?? []) as ExamResult[]
    );

    setLoading(false);
  }

  useEffect(() => {
    if (examId) {
      load();
    }
  }, [examId]);

  async function addResult() {
    setError("");

    const actualSubject =
      subjectChoice === "その他"
        ? customSubject.trim()
        : subjectChoice;

    if (!actualSubject) {
      setError("科目を選択してください。");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("exam_results")
      .insert({
        exam_id: examId,
        subject: actualSubject,
        score: score ? Number(score) : null,
        max_score: maxScore ? Number(maxScore) : null,
        rank: rank ? Number(rank) : null,
        deviation: deviation
          ? Number(deviation)
          : null,
        judgment: judgment.trim() || null,
        memo: memo.trim() || null,
      });

    if (error) {
      setError(
        `成績を保存できませんでした：${error.message}`
      );
      setSaving(false);
      return;
    }

    setSubjectChoice("");
    setCustomSubject("");
    setScore("");
    setMaxScore("100");
    setRank("");
    setDeviation("");
    setJudgment("");
    setMemo("");

    setSaving(false);

    await load();
  }

  async function deleteResult(id: string) {
    const ok = window.confirm(
      "この成績を削除しますか？"
    );

    if (!ok) {
      return;
    }

    const { error } = await supabase
      .from("exam_results")
      .delete()
      .eq("id", id);

    if (error) {
      setError(
        `成績を削除できませんでした：${error.message}`
      );
      return;
    }

    await load();
  }

  const historySubject =
    subjectChoice === "その他"
      ? customSubject.trim()
      : subjectChoice;

  const subjectHistory = useMemo(() => {
    if (!historySubject) {
      return [];
    }

    return allResults
      .filter(
        (result) =>
          result.subject === historySubject &&
          result.score !== null
      )
      .map((result) => {
        const relatedExam = allExams.find(
          (item) => item.id === result.exam_id
        );

        return {
          ...result,
          examName:
            relatedExam?.name ?? "不明な試験",
          examDate:
            relatedExam?.exam_date ?? "",
          examType:
            relatedExam?.exam_type ?? null,
        };
      })
      .sort((a, b) =>
        a.examDate.localeCompare(b.examDate)
      );
  }, [
    historySubject,
    allResults,
    allExams,
  ]);

  if (loading) {
    return (
      <main className="app-shell">
        <section className="page-section">
          読み込み中…
        </section>

        <BottomNav current="plan" />
      </main>
    );
  }

  if (!exam) {
    return (
      <main className="app-shell">
        <header className="page-header">
          <Link href="/exams">←</Link>

          <div>
            <h1>試験</h1>
            <p>試験が見つかりません</p>
          </div>
        </header>

        <section className="page-section">
          {error || "試験が見つかりません。"}
        </section>

        <BottomNav current="plan" />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link href="/exams">←</Link>

        <div>
          <h1>{exam.name}</h1>

          <p>
            {exam.exam_date}
            {exam.exam_type
              ? ` ・ ${exam.exam_type}`
              : ""}
          </p>
        </div>
      </header>

      <section className="page-section">
        <div className="exam-detail-card">
          <strong>試験範囲</strong>

          <p>
            {exam.scope || "未設定"}
          </p>

          <strong>目標</strong>

          <p>
            {exam.goal || "未設定"}
          </p>
        </div>

        <div className="form-card">
          <h2>成績を追加</h2>

          <select
            value={subjectChoice}
            onChange={(e) =>
              setSubjectChoice(e.target.value)
            }
          >
            <option value="">
              科目を選択
            </option>

            <option value="国語">
              国語
            </option>

            <option value="数学">
              数学
            </option>

            <option value="英語">
              英語
            </option>

            <option value="物理">
              物理
            </option>

            <option value="化学">
              化学
            </option>

            <option value="その他">
              その他
            </option>
          </select>

          {subjectChoice === "その他" && (
            <input
              placeholder="科目名を入力"
              value={customSubject}
              onChange={(e) =>
                setCustomSubject(e.target.value)
              }
            />
          )}

          <div className="two-inputs">
  <input
    type="number"
    inputMode="numeric"
    placeholder="得点"
    value={score}
    onChange={(e) =>
      setScore(e.target.value)
    }
  />

  <input
    type="number"
    inputMode="numeric"
    placeholder="満点（任意）"
    value={maxScore}
    onChange={(e) =>
      setMaxScore(e.target.value)
    }
  />
</div>

<div className="two-inputs">
  <input
    type="number"
    inputMode="numeric"
    placeholder="順位（任意）"
    value={rank}
    onChange={(e) =>
      setRank(e.target.value)
    }
  />

  <input
    type="number"
    inputMode="decimal"
    step="0.1"
    placeholder="偏差値（任意）"
    value={deviation}
    onChange={(e) =>
      setDeviation(e.target.value)
    }
  />
</div>

          <input
            placeholder="判定（A、B、Cなど・任意）"
            value={judgment}
            onChange={(e) =>
              setJudgment(e.target.value)
            }
          />

          <textarea
            placeholder="メモ（任意）"
            value={memo}
            onChange={(e) =>
              setMemo(e.target.value)
            }
          />

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={addResult}
            disabled={saving}
          >
            {saving
              ? "保存中…"
              : "成績を保存"}
          </button>
        </div>

        <section className="record-card">
          <div className="card-title">
            <h2>この試験の成績</h2>

            <span>
              {results.length}科目
            </span>
          </div>

          {results.length === 0 ? (
            <p>
              まだ成績が登録されていません。
            </p>
          ) : (
            <div className="exam-result-table-wrap">
              <table className="exam-result-table">
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>得点</th>
                    <th>順位</th>
                    <th>偏差値</th>
                    <th>判定</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td>
                        <strong>
                          {result.subject}
                        </strong>
                      </td>

                      <td>
                        {result.score !== null
                          ? result.score
                          : "—"}

                        {result.max_score !==
                          null &&
                          ` / ${result.max_score}`}
                      </td>

                      <td>
                        {result.rank !== null
                          ? result.rank
                          : "—"}
                      </td>

                      <td>
                        {result.deviation !== null
                          ? result.deviation
                          : "—"}
                      </td>

                      <td>
                        {result.judgment || "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            deleteResult(
                              result.id
                            )
                          }
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {subjectHistory.length > 0 && (
          <section className="record-card">
            <div className="card-title">
              <h2>
                {historySubject}の成績推移
              </h2>

              <span>
                過去の試験
              </span>
            </div>

            <div className="exam-history-table-wrap">
              <table className="exam-result-table">
                <thead>
                  <tr>
                    <th>試験</th>
                    <th>タイプ</th>
                    <th>日付</th>
                    <th>得点</th>
                    <th>順位</th>
                    <th>偏差値</th>
                    <th>判定</th>
                  </tr>
                </thead>

                <tbody>
                  {subjectHistory.map(
                    (result) => (
                      <tr key={result.id}>
                        <td>
                          {result.examName}
                        </td>

                        <td>
                          {result.examType ||
                            "タイプなし"}
                        </td>

                        <td>
                          {result.examDate}
                        </td>

                        <td>
                          {result.score !== null
                            ? result.score
                            : "—"}

                          {result.max_score !==
                            null &&
                            ` / ${result.max_score}`}
                        </td>

                        <td>
                          {result.rank !== null
                            ? result.rank
                            : "—"}
                        </td>

                        <td>
                          {result.deviation !==
                          null
                            ? result.deviation
                            : "—"}
                        </td>

                        <td>
                          {result.judgment || "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>

      <BottomNav current="plan" />
    </main>
  );
}
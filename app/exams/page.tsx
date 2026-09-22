"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

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
};

export default function ExamsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);

  const [name, setName] = useState("");
  const [examType, setExamType] = useState("");
  const [date, setDate] = useState("");
  const [scope, setScope] = useState("");
  const [goal, setGoal] = useState("");

  const [selectedType, setSelectedType] = useState("すべて");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setError("");

    const [examResponse, resultResponse] = await Promise.all([
      supabase
        .from("exams")
        .select("*")
        .order("exam_date", { ascending: true }),

      supabase
        .from("exam_results")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    if (examResponse.error) {
      setError(
        `試験を読み込めませんでした：${examResponse.error.message}`
      );
      return;
    }

    if (resultResponse.error) {
      setError(
        `成績を読み込めませんでした：${resultResponse.error.message}`
      );
      return;
    }

    setRows((examResponse.data ?? []) as Exam[]);
    setResults((resultResponse.data ?? []) as ExamResult[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");

    if (!name.trim() || !date) {
      setError("試験名と実施日を入力してください。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("exams").insert({
      name: name.trim(),
      exam_type: examType.trim() || null,
      exam_date: date,
      scope: scope.trim() || null,
      goal: goal.trim() || null,
    });

    if (error) {
      setError(
        `試験を追加できませんでした：${error.message}`
      );
      setLoading(false);
      return;
    }

    setName("");
    setExamType("");
    setDate("");
    setScope("");
    setGoal("");

    setLoading(false);

    await load();
  }

  const types = useMemo(() => {
    const unique = Array.from(
      new Set(
        rows
          .map((exam) => exam.exam_type?.trim())
          .filter(
            (type): type is string =>
              Boolean(type)
          )
      )
    );

    return [
      "すべて",
      ...unique,
      "タイプなし",
    ];
  }, [rows]);

  const filteredExams = useMemo(() => {
    if (selectedType === "すべて") {
      return rows;
    }

    if (selectedType === "タイプなし") {
      return rows.filter(
        (exam) => !exam.exam_type?.trim()
      );
    }

    return rows.filter(
      (exam) =>
        exam.exam_type?.trim() === selectedType
    );
  }, [rows, selectedType]);

  const subjects = useMemo(() => {
    const filteredExamIds = new Set(
      filteredExams.map((exam) => exam.id)
    );

    const uniqueSubjects = new Set<string>();

    results.forEach((result) => {
      if (
        filteredExamIds.has(result.exam_id) &&
        result.subject.trim()
      ) {
        uniqueSubjects.add(result.subject.trim());
      }
    });

    return Array.from(uniqueSubjects);
  }, [filteredExams, results]);

  const resultMap = useMemo(() => {
    const map = new Map<string, ExamResult>();

    results.forEach((result) => {
      map.set(
        `${result.exam_id}__${result.subject}`,
        result
      );
    });

    return map;
  }, [results]);

  function openExam(examId: string) {
    router.push(`/exams/${examId}`);
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <h1>試験・模試</h1>
          <p>試験予定と成績をまとめて管理</p>
        </div>
      </header>

      <section className="page-content">
        <section className="form-panel">
          <h2>試験を追加</h2>

          <div className="form-grid">
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="試験名"
            />

            <input
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value)
              }
              placeholder="タイプ（任意）"
            />

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
            />

            <input
              value={scope}
              onChange={(e) =>
                setScope(e.target.value)
              }
              placeholder="範囲（任意）"
            />

            <input
              value={goal}
              onChange={(e) =>
                setGoal(e.target.value)
              }
              placeholder="目標（任意）"
            />
          </div>

          <button
            className="primary-button"
            onClick={add}
            disabled={loading}
          >
            {loading ? "追加中..." : "試験を追加"}
          </button>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}
        </section>

        <section className="exam-list-section">
          <div className="section-title-row">
            <h2>成績一覧</h2>
            <span>
              {filteredExams.length}件
            </span>
          </div>

          <div className="exam-type-filters">
            {types.map((type) => (
              <button
                key={type}
                className={`exam-type-filter ${
                  selectedType === type
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedType(type)
                }
              >
                {type}
              </button>
            ))}
          </div>

          {filteredExams.length === 0 ? (
            <div className="empty-panel">
              このタイプの試験はありません。
            </div>
          ) : (
            <div className="exam-table-wrap">
              <table className="exam-table">
                <thead>
                  <tr>
                    <th>試験</th>
                    <th>実施日</th>

                    {selectedType === "すべて" && (
                      <th>タイプ</th>
                    )}

                    {subjects.map((subject) => (
                      <th key={subject}>
                        {subject}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredExams.map((exam) => (
                    <tr
                      key={exam.id}
                      onClick={() =>
                        openExam(exam.id)
                      }
                      className="exam-table-row"
                    >
                      <td>
                        <strong>
                          {exam.name}
                        </strong>
                      </td>

                      <td>
                        {exam.exam_date}
                      </td>

                      {selectedType === "すべて" && (
                        <td>
                          {exam.exam_type?.trim() ||
                            "タイプなし"}
                        </td>
                      )}

                      {subjects.map((subject) => {
                        const result =
                          resultMap.get(
                            `${exam.id}__${subject}`
                          );

                        if (!result) {
                          return (
                            <td
                              key={subject}
                              className="empty-result"
                            >
                              —
                            </td>
                          );
                        }

                        return (
                          <td
                            key={subject}
                            className="result-cell"
                          >
                            {result.score !== null && (
                              <div className="score-line">
                                {result.score}
                                {result.max_score !==
                                  null &&
                                  ` / ${result.max_score}`}
                              </div>
                            )}

                            {result.deviation !==
                              null && (
                              <div>
                                偏差値{" "}
                                {result.deviation}
                              </div>
                            )}

                            {result.rank !==
                              null && (
                              <div>
                                順位{" "}
                                {result.rank}
                              </div>
                            )}

                            {result.judgment && (
                              <div>
                                判定{" "}
                                {result.judgment}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="exam-cards-section">
          <h2>試験</h2>

          <div className="exam-cards">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="exam-card"
                onClick={() =>
                  openExam(exam.id)
                }
              >
                <div className="exam-card-main">
                  <strong>{exam.name}</strong>

                  <span>
                    {exam.exam_date}
                  </span>

                  <small>
                    {exam.exam_type?.trim() ||
                      "タイプなし"}
                  </small>
                </div>

                <button
                  className="exam-result-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openExam(exam.id);
                  }}
                >
                  成績を見る
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>

      <BottomNav current="home" />
    </main>
  );
}
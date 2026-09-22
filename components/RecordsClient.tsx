"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { dateKeyFromTimestamp, formatDate } from "../lib/date";
import { accuracy, distinctProblemCount, seconds, latestByProblem } from "../lib/stats";
import type { Attempt, SubjectMistake } from "../types/database";
import BottomNav from "./BottomNav";
import CumulativeStudyTimeChart from "./CumulativeStudyTimeChart";

type Props = { books: { id: string; subject: string }[] };

export default function RecordsClient({ books }: Props) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [subject, setSubject] = useState("全体");
  const [mistakes, setMistakes] = useState<SubjectMistake[]>([]);
  const [mistakeText, setMistakeText] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("attempts").select("*").order("attempted_at");
      setAttempts((data ?? []) as Attempt[]);
    })();
  }, []);

  useEffect(() => {
    if (subject === "全体") {
      setMistakes([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("subject_mistakes")
        .select("*")
        .eq("subject", subject)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        setMistakes([]);
        return;
      }
      setMistakes((data ?? []) as SubjectMistake[]);
    })();
  }, [subject]);

  const map = useMemo(() => new Map(books.map((b) => [b.id, b.subject])), [books]);
  const subjects = ["全体", ...Array.from(new Set(books.map((b) => b.subject)))];
  const filtered = subject === "全体" ? attempts : attempts.filter((a) => a.book_id && map.get(a.book_id) === subject);
  const latest = latestByProblem(filtered);

  const daily = useMemo(() => {
    const m = new Map<string, { count: number; sec: number }>();
    for (const a of filtered) {
      const d = dateKeyFromTimestamp(a.attempted_at);
      const v = m.get(d) || { count: 0, sec: 0 };
      v.count += 1;
      v.sec += Number(a.duration_seconds || 0);
      m.set(d, v);
    }
    return [...m.entries()].sort() as [string, { count: number; sec: number }][];
  }, [filtered]);

  async function addMistake() {
    const content = mistakeText.trim();
    if (!content || subject === "全体") return;
    const { data, error } = await supabase
      .from("subject_mistakes")
      .insert({ subject, content })
      .select("*")
      .single();
    if (error) {
      console.error(error);
      return;
    }
    setMistakes((current) => [data as SubjectMistake, ...current]);
    setMistakeText("");
  }

  async function deleteMistake(id: string) {
    const { error } = await supabase.from("subject_mistakes").delete().eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setMistakes((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link href="/">←</Link>
        <div><h1>学習記録</h1><p>成績・学習量・成長</p></div>
      </header>

      <section className="records-content">
        <div className="subject-tabs">
          {subjects.map((item) => (
            <button key={item} className={item === subject ? "selected" : ""} onClick={() => setSubject(item)}>{item}</button>
          ))}
        </div>

        <section className="record-summary">
          <div><span>解いた問題</span><strong>{distinctProblemCount(filtered)}</strong><small>問</small></div>
          <div><span>挑戦回数</span><strong>{filtered.length}</strong><small>回</small></div>
          <div><span>正解率</span><strong>{accuracy(filtered)}</strong><small>%</small></div>
          <div><span>学習時間</span><strong>{Math.floor(seconds(filtered) / 3600)}</strong><small>時間</small></div>
          <div><span>苦手</span><strong>{[...latest.values()].filter((a) => a.result !== "correct").length}</strong><small>問</small></div>
        </section>

        {subject !== "全体" && (
          <section className="record-card subject-mistakes-card">
            <div className="card-title"><h2>間違い・注意点</h2><span>{subject}</span></div>
            <div className="subject-mistake-input">
              <input value={mistakeText} onChange={(event) => setMistakeText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMistake(); } }} placeholder="この教科で気をつけること" />
              <button type="button" className="small-button" onClick={addMistake}>追加</button>
            </div>
            {mistakes.length === 0 ? <p className="subject-mistakes-empty">まだ登録されていません。</p> : (
              <ul className="subject-mistake-list">
                {mistakes.map((mistake) => (
                  <li key={mistake.id}><span>・{mistake.content}</span><button type="button" onClick={() => deleteMistake(mistake.id)}>削除</button></li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="record-card">
          <div className="card-title"><h2>結果内訳</h2></div>
          <div className="result-bars">
            <Bar label="○ 正解" value={filtered.filter((a) => a.result === "correct").length} total={filtered.length} />
            <Bar label="△ 部分正解" value={filtered.filter((a) => a.result === "partial").length} total={filtered.length} />
            <Bar label="× 不正解" value={filtered.filter((a) => a.result === "wrong").length} total={filtered.length} />
          </div>
        </section>

                <CumulativeStudyTimeChart />
        <section className="record-card">
          <div className="card-title"><h2>日別記録</h2><span>最新20日</span></div>
          {daily.slice(-20).reverse().map(([d, v]) => <div className="daily-record-item" key={d}><span>{formatDate(d)}</span><strong>{v.count}回　{Math.floor(v.sec / 60)}分</strong></div>)}
          {!daily.length && <p>まだ記録がありません。</p>}
        </section>

        <section className="record-card">
          <div className="card-title"><h2>累計</h2><span>全期間</span></div>
          <div className="growth-stats">
            <div><span>累計時間</span><strong>{Math.floor(seconds(filtered) / 3600)}<small>時間</small>{Math.floor(seconds(filtered) % 3600 / 60)}<small>分</small></strong></div>
            <div><span>累計問題</span><strong>{distinctProblemCount(filtered)}<small>問</small></strong></div>
            <div><span>開始から</span><strong>{daily.length ? daysBetween(daily[0][0], new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })) + 1 : 0}<small>日</small></strong></div>
          </div>
        </section>
      </section>
      <BottomNav current="records" />
    </main>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  return <div className="stat-bar"><div><span>{label}</span><b>{value}</b></div><div><i style={{ width: `${total ? value / total * 100 : 0}%` }} /></div></div>;
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(`${b}T00:00:00+09:00`).getTime() - new Date(`${a}T00:00:00+09:00`).getTime()) / 86400000);
}

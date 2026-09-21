"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getToday } from "../../lib/date";

export default function ReflectionPage() {
  const [content, setContent] = useState("");
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReflection() {
      const { data, error } = await supabase.from("reflections").select("id, content").eq("reflection_date", getToday()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) console.error(error);
      if (data) { setReflectionId(data.id); setContent(data.content); }
      setLoading(false);
    }
    loadReflection();
  }, []);

  async function saveReflection() {
    const text = content.trim();
    if (!text) return;
    const today = getToday();
    let error;
    if (reflectionId) {
      ({ error } = await supabase.from("reflections").update({ content: text }).eq("id", reflectionId));
    } else {
      const result = await supabase.from("reflections").insert({ reflection_date: today, content: text }).select("id").single();
      error = result.error;
      if (result.data) setReflectionId(result.data.id);
    }
    if (error) { console.error(error); return; }
    setSaved(true);
  }

  if (loading) return <main className="app-shell"><section className="page-section">読み込み中...</section></main>;

  return <main className="app-shell">
    <header className="page-header"><Link href="/">←</Link><div><h1>振り返り</h1><p>今日の学習を振り返ろう</p></div></header>
    <section className="page-section"><textarea value={content} onChange={(e) => { setContent(e.target.value); setSaved(false); }} placeholder="今日できたこと、できなかったこと、明日やることなど" rows={10} className="reflection-input" /><button type="button" onClick={saveReflection} disabled={!content.trim()} className="primary-button">{reflectionId ? "更新する" : "保存する"}</button>{saved && <p className="save-message">保存しました</p>}</section>
    <BottomNavigation current="home" />
  </main>;
}

function BottomNavigation({ current }: { current: "home" | "records" | "books" }) {
  return <nav className="bottom-nav"><Link className={current === "home" ? "active" : ""} href="/"><span>⌂</span><small>ホーム</small></Link><Link className={current === "records" ? "active" : ""} href="/records"><span>▦</span><small>学習記録</small></Link><Link className={current === "books" ? "active" : ""} href="/books"><span>▤</span><small>本</small></Link></nav>;
}

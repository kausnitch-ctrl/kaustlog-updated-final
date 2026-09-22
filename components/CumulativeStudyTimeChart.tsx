"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type DayData = {
  date: string;
  seconds: number;
};

function formatHours(seconds: number) {
  const hours = seconds / 3600;

  if (hours < 10) {
    return `${hours.toFixed(1)}h`;
  }

  return `${Math.round(hours)}h`;
}

export default function CumulativeStudyTimeChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: attempts, error } = await supabase
        .from("attempts")
        .select("duration_seconds,attempted_at")
        .order("attempted_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const daily = new Map<string, number>();

      for (const attempt of attempts ?? []) {
        const date = new Date(attempt.attempted_at)
          .toISOString()
          .slice(0, 10);

        daily.set(
          date,
          (daily.get(date) ?? 0) +
            (attempt.duration_seconds ?? 0)
        );
      }

      let cumulative = 0;

      const result: DayData[] = Array.from(daily.entries()).map(
        ([date, seconds]) => {
          cumulative += seconds;

          return {
            date,
            seconds: cumulative,
          };
        }
      );

      setData(result);
      setLoading(false);
    })();
  }, []);

  const points = useMemo(() => {
    if (!data.length) return [];

    return data.map((item) => ({
      x: item.date,
      y: item.seconds,
    }));
  }, [data]);

  if (loading) {
    return (
      <section className="record-chart-card">
        <h3>累計学習時間</h3>
        <p className="record-chart-loading">読み込み中…</p>
      </section>
    );
  }

  if (!data.length) {
    return (
      <section className="record-chart-card">
        <h3>累計学習時間</h3>
        <p className="record-chart-empty">
          まだ学習記録がありません。
        </p>
      </section>
    );
  }

  const width = 700;
  const height = 260;
  const paddingLeft = 52;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 42;

  const max = Math.max(...points.map((point) => point.y), 3600);

  const x =
    (index: number) =>
      paddingLeft +
      (index / Math.max(points.length - 1, 1)) *
        (width - paddingLeft - paddingRight);

  const y = (value: number) =>
    height -
    paddingBottom -
    (value / max) * (height - paddingTop - paddingBottom);

  const polyline = points
    .map((point, index) => `${x(index)},${y(point.y)}`)
    .join(" ");

  const last = points.at(-1)!;

  return (
    <section className="record-chart-card">
      <div className="record-chart-header">
        <div>
          <h3>累計学習時間</h3>
          <p>これまでの学習時間の累計</p>
        </div>

        <strong>{formatHours(last.y)}</strong>
      </div>

      <div className="record-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="record-chart"
          preserveAspectRatio="none"
        >
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#dfe5e1"
          />

          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#dfe5e1"
          />

          <polyline
            points={polyline}
            fill="none"
            stroke="#4d8b68"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <circle
              key={`${point.x}-${index}`}
              cx={x(index)}
              cy={y(point.y)}
              r="3"
              fill="#4d8b68"
            >
              <title>
                {point.x}：{formatHours(point.y)}
              </title>
            </circle>
          ))}

          <text
            x={paddingLeft}
            y={height - 12}
            fontSize="11"
            fill="#89918c"
          >
            {points[0].x}
          </text>

          <text
            x={width - paddingRight}
            y={height - 12}
            textAnchor="end"
            fontSize="11"
            fill="#89918c"
          >
            {last.x}
          </text>
        </svg>
      </div>
    </section>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getInterviewHistory,
  type InterviewHistoryItem,
} from "../services/interviewApi";

interface AnalyticsPageProps {
  token: string;
}

export default function AnalyticsPage({ token }: AnalyticsPageProps) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) {
        setError("Please sign in to view analytics.");
        setLoading(false);
        return;
      }

      try {
        const data = await getInterviewHistory(token);

        if (active) {
          setHistory(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load interview analytics."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [token]);

  const completedInterviews = useMemo(
    () =>
      history.filter(
        (item) =>
          item.status === "completed" &&
          typeof item.evaluation?.percentage === "number"
      ),
    [history]
  );

  const scores = completedInterviews.map((item) =>
    Math.min(100, Math.max(0, item.evaluation?.percentage ?? 0))
  );

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((total, score) => total + score, 0) / scores.length
        )
      : 0;

  const categoryBreakdown = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();

    completedInterviews.forEach((item) => {
      const key = item.category;
      const score = Math.min(
        100,
        Math.max(0, item.evaluation?.percentage ?? 0)
      );
      const existing = groups.get(key) ?? { total: 0, count: 0 };

      groups.set(key, {
        total: existing.total + score,
        count: existing.count + 1,
      });
    });

    return [...groups.entries()]
      .map(([key, value]) => ({
        label: capitalize(key),
        average: Math.round(value.total / value.count),
        count: value.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [completedInterviews]);

  const difficultyBreakdown = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();

    completedInterviews.forEach((item) => {
      const key = item.difficulty;
      const score = Math.min(
        100,
        Math.max(0, item.evaluation?.percentage ?? 0)
      );
      const existing = groups.get(key) ?? { total: 0, count: 0 };

      groups.set(key, {
        total: existing.total + score,
        count: existing.count + 1,
      });
    });

    return [...groups.entries()]
      .map(([key, value]) => ({
        label: capitalize(key),
        average: Math.round(value.total / value.count),
        count: value.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [completedInterviews]);

  const trendData = useMemo(() => {
    const sorted = [...completedInterviews].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((item) => ({
      label: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: Math.min(
        100,
        Math.max(0, item.evaluation?.percentage ?? 0)
      ),
    }));
  }, [completedInterviews]);

  // SVG chart dimensions and plotting area.
  const chartMax = 100;
  const chartLeft = 42;
  const chartRight = 630;
  const chartTop = 10;
  const chartBottom = 150;
  const chartPlotWidth = chartRight - chartLeft;
  const chartPlotHeight = chartBottom - chartTop;

  const getChartX = (index: number) =>
    chartLeft +
    (chartPlotWidth / Math.max(trendData.length - 1, 1)) * index;

  const getChartY = (score: number) =>
    chartBottom -
    (Math.min(100, Math.max(0, score)) / chartMax) * chartPlotHeight;

  const trendPoints = trendData
    .map((point, index) => `${getChartX(index)},${getChartY(point.score)}`)
    .join(" ");

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-300">Loading analytics...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold">Analytics unavailable</h1>
          <p className="mt-3 text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const completionCounts = {
    completed: history.filter((item) => item.status === "completed").length,
    inProgress: history.filter((item) => item.status === "in_progress").length,
    pending: history.filter((item) => item.status === "pending").length,
  };

  if (completedInterviews.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Interview analytics
          </p>
          <h1 className="mt-4 text-3xl font-bold">
            No completed interview data yet
          </h1>
          <p className="mt-3 text-slate-400">
            Complete and evaluate a mock interview to start tracking your
            performance trend, score by category, and readiness signals.
          </p>
          <button
            type="button"
            onClick={() => navigate("/interview/setup")}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold"
          >
            Start an interview
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              InterviewIQ
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Performance analytics
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:border-indigo-400"
          >
            ← Dashboard
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Average score"
            value={`${averageScore}%`}
            detail="Across evaluated interviews"
          />
          <MetricCard
            label="Completed"
            value={String(completionCounts.completed)}
            detail="Interviews finished"
          />
          <MetricCard
            label="Current trend"
            value={`${trendData[trendData.length - 1]?.score ?? 0}%`}
            detail="Latest recorded score"
          />
          <MetricCard
            label="Practice count"
            value={String(history.length)}
            detail="Total interviews tracked"
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Performance over time</h2>
              <span className="text-sm text-slate-400">
                {trendData.length} evaluation
                {trendData.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <svg
                viewBox="0 0 640 180"
                className="h-52 w-full"
                role="img"
                aria-label="Performance trend over time"
              >
                <line
                  x1={chartLeft}
                  y1={chartBottom}
                  x2={chartRight}
                  y2={chartBottom}
                  stroke="#334155"
                />
                <line
                  x1={chartLeft}
                  y1={chartTop}
                  x2={chartLeft}
                  y2={chartBottom}
                  stroke="#334155"
                />

                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = getChartY(tick);

                  return (
                    <g key={tick}>
                      <line
                        x1={chartLeft}
                        y1={y}
                        x2={chartRight}
                        y2={y}
                        stroke="#1e293b"
                      />
                      <text
                        x="8"
                        y={y + 4}
                        fill="#94a3b8"
                        fontSize="10"
                      >
                        {tick}%
                      </text>
                    </g>
                  );
                })}

                {trendData.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={trendPoints}
                  />
                )}

                {trendData.map((point, index) => {
                  const x = getChartX(index);
                  const y = getChartY(point.score);

                  return (
                    <g key={`${point.label}-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#a5b4fc"
                      />
                      <text
                        x={x}
                        y="175"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                      >
                        {point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Session health</h2>
            <div className="mt-5 space-y-4">
              <StatusRow
                label="Completed"
                value={completionCounts.completed}
                tone="green"
              />
              <StatusRow
                label="In progress"
                value={completionCounts.inProgress}
                tone="amber"
              />
              <StatusRow
                label="Pending"
                value={completionCounts.pending}
                tone="slate"
              />
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <BarChartCard title="Scores by category" data={categoryBreakdown} />
          <BarChartCard
            title="Scores by difficulty"
            data={difficultyBreakdown}
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function BarChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; average: number; count: number }>;
}) {
  const max = 100;

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      {data.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">
          No evaluated interviews available for this breakdown yet.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                <span>{item.label}</span>
                <span>{item.average}%</span>
              </div>

              <div
                className="h-3 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label={`${item.label} average score`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.average}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                  style={{ width: `${(item.average / max) * 100}%` }}
                />
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                {item.count} assessment{item.count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "slate";
}) {
  const toneClasses = {
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    slate: "bg-slate-700/60 text-slate-300 border-slate-600",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
      <span className="text-slate-300">{label}</span>
      <span
        className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${toneClasses[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function capitalize(value: string) {
  const normalized = value.toLowerCase();

  const specialCases: Record<string, string> = {
    hr: "HR",
    coding: "Coding",
    situational: "Situational",
    mixed: "Mixed",
  };

  return (specialCases[normalized] ?? normalized).replace(
    /^./,
    (character) => character.toUpperCase()
  );
}
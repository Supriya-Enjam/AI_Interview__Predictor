
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getInterviewHistory,
  getInterviewReadiness,
  getSkillGaps,
  type InterviewHistoryItem,
  type InterviewReadinessSummary,
  type SkillGapSummary,
} from "../services/interviewApi";

interface AnalyticsPageProps {
  token: string;
}

export default function AnalyticsPage({ token }: AnalyticsPageProps) {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [readiness, setReadiness] =
    useState<InterviewReadinessSummary | null>(null);
  const [skillGaps, setSkillGaps] = useState<SkillGapSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const [skillGapError, setSkillGapError] = useState("");

  // =========================================================
  // LOAD ANALYTICS DATA
  // =========================================================

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      if (!token) {
        setError("Please sign in to view analytics.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setReadinessError("");
      setSkillGapError("");

      try {
        const results = await Promise.allSettled([
          getInterviewHistory(token),
          getInterviewReadiness(token),
          getSkillGaps(token),
        ]);

        if (!active) return;

        const [historyResult, readinessResult, skillGapResult] = results;

        // Interview history is the primary data source.
        if (historyResult.status === "rejected") {
          throw historyResult.reason;
        }

        setHistory(historyResult.value);

        // Readiness is independently loaded.
        if (readinessResult.status === "fulfilled") {
          setReadiness(readinessResult.value);
        } else {
          setReadiness(null);
          setReadinessError(
            readinessResult.reason instanceof Error
              ? readinessResult.reason.message
              : "Unable to load readiness information."
          );
        }

        // Skill gaps are independently loaded.
        if (skillGapResult.status === "fulfilled") {
          setSkillGaps(skillGapResult.value);
        } else {
          setSkillGaps([]);
          setSkillGapError(
            skillGapResult.reason instanceof Error
              ? skillGapResult.reason.message
              : "Unable to load skill-gap information."
          );
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

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [token]);

  // =========================================================
  // COMPLETED INTERVIEWS
  // =========================================================

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
    clampScore(item.evaluation?.percentage ?? 0)
  );

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((total, score) => total + score, 0) /
            scores.length
        )
      : 0;

  // =========================================================
  // SESSION COUNTS
  // =========================================================

  const completionCounts = {
    completed: history.filter(
      (item) => item.status === "completed"
    ).length,

    inProgress: history.filter(
      (item) => item.status === "in_progress"
    ).length,

    pending: history.filter(
      (item) => item.status === "pending"
    ).length,

    cancelled: history.filter(
      (item) => item.status === "cancelled"
    ).length,
  };

  // =========================================================
  // CATEGORY BREAKDOWN
  // =========================================================

  const categoryBreakdown = useMemo(() => {
    const groups = new Map<
      string,
      { total: number; count: number }
    >();

    completedInterviews.forEach((item) => {
      const key = item.category;
      const score = clampScore(
        item.evaluation?.percentage ?? 0
      );

      const existing = groups.get(key) ?? {
        total: 0,
        count: 0,
      };

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

  // =========================================================
  // DIFFICULTY BREAKDOWN
  // =========================================================

  const difficultyBreakdown = useMemo(() => {
    const groups = new Map<
      string,
      { total: number; count: number }
    >();

    completedInterviews.forEach((item) => {
      const key = item.difficulty;
      const score = clampScore(
        item.evaluation?.percentage ?? 0
      );

      const existing = groups.get(key) ?? {
        total: 0,
        count: 0,
      };

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

  // =========================================================
  // PERFORMANCE TREND
  // =========================================================

  const trendData = useMemo(() => {
    const sorted = [...completedInterviews].sort(
  (a, b) =>
    new Date(a.completedAt ?? a.createdAt).getTime() -
    new Date(b.completedAt ?? b.createdAt).getTime()
);

    return sorted.map((item) => ({
      label: new Date(item.createdAt).toLocaleDateString(
        undefined,
        {
          month: "short",
          day: "numeric",
        }
      ),
      score: clampScore(
        item.evaluation?.percentage ?? 0
      ),
    }));
  }, [completedInterviews]);

    // =========================================================
  // RECENT INTERVIEW HISTORY
  // =========================================================

  const recentInterviews = useMemo(() => {
    return [...history]
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt).getTime() -
          new Date(a.completedAt ?? a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [history]);
  // =========================================================
  // SVG CHART CONFIGURATION
  // =========================================================

  const chartMax = 100;
  const chartLeft = 42;
  const chartRight = 630;
  const chartTop = 10;
  const chartBottom = 150;

  const chartPlotWidth = chartRight - chartLeft;
  const chartPlotHeight = chartBottom - chartTop;

  const getChartX = (index: number) =>
    chartLeft +
    (chartPlotWidth / Math.max(trendData.length - 1, 1)) *
      index;

  const getChartY = (score: number) =>
    chartBottom -
    (clampScore(score) / chartMax) * chartPlotHeight;

  const trendPoints = trendData
    .map(
      (point, index) =>
        `${getChartX(index)},${getChartY(point.score)}`
    )
    .join(" ");

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-300">
            Loading your analytics...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold">
            Analytics unavailable
          </h1>

          <p className="mt-3 text-red-200">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              InterviewIQ
            </p>

            <h1 className="mt-2 text-3xl font-extrabold">
              Performance Analytics
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Track your interview performance and identify
              areas for improvement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:border-indigo-400"
          >
            ← Dashboard
          </button>
        </div>

        {/* ================================================= */}
        {/* OVERVIEW METRICS */}
        {/* ================================================= */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Average Score"
            value={`${averageScore}%`}
            detail="Across evaluated interviews"
          />

          <MetricCard
            label="Completed"
            value={String(completionCounts.completed)}
            detail="Interviews finished"
          />

          <MetricCard
            label="Current Trend"
            value={`${trendData[trendData.length - 1]?.score ?? 0}%`}
            detail="Latest recorded score"
          />

          <MetricCard
            label="Practice Count"
            value={String(history.length)}
            detail="Total interviews tracked"
          />
        </section>

        {/* ================================================= */}
        {/* READINESS AND STRONGEST SKILLS */}
        {/* ================================================= */}

        <section className="mt-8 grid gap-6 md:grid-cols-2">

          {/* READINESS SCORE */}

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Interview Readiness
            </h2>

            {readinessError ? (
              <p className="mt-4 text-sm text-amber-300">
                {readinessError}
              </p>
            ) : readiness ? (
              <>
                <div className="mt-5 flex items-center gap-5">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-8 border-indigo-500/30">
                    <span className="text-3xl font-extrabold text-indigo-300">
                      {readiness.score}%
                    </span>
                  </div>

                  <div>
                    <p className="text-lg font-bold">
                      {readiness.label}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {readiness.interviewCount} interviews analyzed
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  {readiness.summary}
                </p>

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <p className="text-sm text-slate-400">
                    Average Interview Score
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {readiness.averageInterviewScore}%
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                Readiness information is not available yet.
              </p>
            )}
          </article>

          {/* STRONGEST SKILLS */}

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Strongest Skills
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Skills where your performance is strongest.
            </p>

            {readinessError ? (
              <p className="mt-4 text-sm text-amber-300">
                {readinessError}
              </p>
            ) : readiness?.strongestSkills.length ? (
              <ul className="mt-5 space-y-3">
                {readiness.strongestSkills.map((skill, index) => (
                  <li
                    key={`${skill}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300"
                  >
                    <span className="font-bold">
                      ✓
                    </span>
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                Complete more interviews to identify your strongest skills.
              </p>
            )}

            {readiness?.improvementAreas &&
              readiness.improvementAreas.length > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-4">
                  <h3 className="font-semibold text-slate-200">
                    Improvement Areas
                  </h3>

                  <ul className="mt-3 space-y-2">
                    {readiness.improvementAreas.map(
                      (area, index) => (
                        <li
                          key={`${area}-${index}`}
                          className="text-sm text-amber-300"
                        >
                          • {area}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </article>
        </section>

        {/* ================================================= */}
        {/* SKILL GAP ANALYSIS */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold">
              Skill Gap Analysis
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Identify your weaker areas and follow recommended
              practice activities.
            </p>
          </div>

          {skillGapError ? (
            <p className="mt-5 text-sm text-amber-300">
              {skillGapError}
            </p>
          ) : skillGaps.length === 0 ? (
            <p className="mt-5 text-sm text-slate-400">
              No skill-gap information available yet.
              Complete more assessments to build your skill profile.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {skillGaps.map((gap, index) => (
                <article
                  key={`${gap.skill}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">
                      {gap.skill}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        gap.readiness === "Strong"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : gap.readiness === "Solid"
                            ? "bg-blue-500/10 text-blue-300"
                            : gap.readiness === "Developing"
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {gap.readiness}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Average Score
                    </span>

                    <span className="font-semibold">
                      {gap.averageScore}%
                    </span>
                  </div>

                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-label={`${gap.skill} average score`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={clampScore(gap.averageScore)}
                  >
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${clampScore(gap.averageScore)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {gap.assessments} assessment
                    {gap.assessments === 1 ? "" : "s"}
                  </p>

                  {gap.strongAreas.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-emerald-300">
                        Strong Areas
                      </h4>

                      <ul className="mt-2 space-y-1">
                        {gap.strongAreas.map((area, areaIndex) => (
                          <li
                            key={`${area}-${areaIndex}`}
                            className="text-sm text-slate-400"
                          >
                            • {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {gap.weakAreas.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-amber-300">
                        Areas to Improve
                      </h4>

                      <ul className="mt-2 space-y-1">
                        {gap.weakAreas.map((area, areaIndex) => (
                          <li
                            key={`${area}-${areaIndex}`}
                            className="text-sm text-slate-400"
                          >
                            • {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {gap.recommendedPractice.length > 0 && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <h4 className="text-sm font-semibold text-indigo-300">
                        Recommended Practice
                      </h4>

                      <ul className="mt-2 space-y-2">
                        {gap.recommendedPractice.map(
                          (practice, practiceIndex) => (
                            <li
                              key={`${practice}-${practiceIndex}`}
                              className="text-sm text-slate-400"
                            >
                              • {practice}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* PERFORMANCE TREND AND SESSION HEALTH */}
        {/* ================================================= */}

        <section className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">

          {/* PERFORMANCE CHART */}

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                Performance Over Time
              </h2>

              <span className="text-sm text-slate-400">
                {trendData.length} evaluation
                {trendData.length === 1 ? "" : "s"}
              </span>
            </div>

            {trendData.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">
                Complete and evaluate an interview to view your
                performance trend.
              </p>
            ) : (
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
            )}
          </article>

          {/* SESSION HEALTH */}

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Session Health
            </h2>

            <div className="mt-5 space-y-4">
              <StatusRow
                label="Completed"
                value={completionCounts.completed}
                tone="green"
              />

              <StatusRow
                label="In Progress"
                value={completionCounts.inProgress}
                tone="amber"
              />

              <StatusRow
                label="Pending"
                value={completionCounts.pending}
                tone="slate"
              />

              <StatusRow
                label="Cancelled"
                value={completionCounts.cancelled}
                tone="slate"
              />
            </div>
          </article>
        </section>

        {/* ================================================= */}
        {/* CATEGORY AND DIFFICULTY BREAKDOWN */}
        {/* ================================================= */}

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <BarChartCard
            title="Scores by Category"
            data={categoryBreakdown}
          />

          <BarChartCard
            title="Scores by Difficulty"
            data={difficultyBreakdown}
          />
        </section>

                {/* ================================================= */}
        {/* RECENT INTERVIEW HISTORY */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                Recent Interviews
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your five most recent interview sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/interview/history")}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-indigo-400"
            >
              View All
            </button>
          </div>

          {recentInterviews.length === 0 ? (
            <p className="mt-5 text-sm text-slate-400">
              No interview sessions available yet.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Difficulty</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Score</th>
                  </tr>
                </thead>

                <tbody>
                  {recentInterviews.map((item, index) => (
                    <tr
                      key={`${item.createdAt}-${index}`}
                      className="border-b border-slate-800/70 last:border-0"
                    >
                      <td className="px-3 py-4 font-medium text-slate-200">
                        {capitalize(item.category)}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {capitalize(item.difficulty)}
                      </td>

                      <td className="px-3 py-4 text-slate-400">
                        {new Date(
                          item.completedAt ?? item.createdAt
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {capitalize(item.status.replace("_", " "))}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-semibold text-indigo-300">
                        {typeof item.evaluation?.percentage === "number"
                          ? `${clampScore(item.evaluation.percentage)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* EMPTY HISTORY MESSAGE */}
        {/* ================================================= */}

        {history.length === 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-xl font-bold">
              No interviews yet
            </h2>

            <p className="mt-2 text-slate-400">
              Start a mock interview to begin tracking your
              performance.
            </p>

            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
            >
              Start an Interview
            </button>
          </section>
        )}

        {/* FOOTER ACTION */}

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => navigate("/interview/setup")}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            Start Another Interview
          </button>

          <button
  type="button"
  onClick={() => navigate("/interview/history")}
  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:border-indigo-400"
>
  View Interview History
</button>
        </div>
      </div>
    </main>
  );
}

// =========================================================
// METRIC CARD
// =========================================================

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

      <p className="mt-3 text-3xl font-extrabold">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}

// =========================================================
// BAR CHART CARD
// =========================================================

function BarChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{
    label: string;
    average: number;
    count: number;
  }>;
}) {
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
                aria-valuenow={clampScore(item.average)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                  style={{
                    width: `${clampScore(item.average)}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                {item.count} assessment
                {item.count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// =========================================================
// SESSION STATUS ROW
// =========================================================

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
    green:
      "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber:
      "bg-amber-500/10 text-amber-300 border-amber-500/20",
    slate:
      "bg-slate-700/60 text-slate-300 border-slate-600",
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

// =========================================================
// HELPERS
// =========================================================

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(100, Math.max(0, value));
}

function capitalize(value: string): string {
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

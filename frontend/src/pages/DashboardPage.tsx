
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileUser,
  History,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";

import {
  getMyProfile,
  type AuthUser,
} from "../services/authApi";

import {
  getInterviewHistory,
  getInterviewReadiness,
  getSkillGaps,
  type InterviewHistoryItem,
  type InterviewReadinessSummary,
  type SkillGapSummary,
} from "../services/interviewApi";

interface DashboardPageProps {
  token: string;
}

function formatDate(date?: string) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  return "text-rose-300";
}

export default function DashboardPage({ token }: DashboardPageProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [interviewHistory, setInterviewHistory] = useState<
    InterviewHistoryItem[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [readiness, setReadiness] =
    useState<InterviewReadinessSummary | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);

  const [skillGaps, setSkillGaps] = useState<SkillGapSummary[]>([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyProfile(token);
        if (!cancelled) setUser(result.user);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) {
      void loadProfile();
    } else {
      setError("Your session is missing. Please sign in again.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const result = await getInterviewHistory(token);
        if (!cancelled) setInterviewHistory(result);
      } catch (err: unknown) {
        if (!cancelled) {
          setHistoryError(
            err instanceof Error
              ? err.message
              : "Unable to load interview history."
          );
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    if (token) {
      void loadHistory();
    } else {
      setHistoryError("Please sign in again.");
      setHistoryLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      setReadinessLoading(true);

      try {
        const result = await getInterviewReadiness(token);
        if (!cancelled) setReadiness(result);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Unable to load readiness summary:", err);
        }
      } finally {
        if (!cancelled) setReadinessLoading(false);
      }
    }

    if (token) void loadReadiness();
    else setReadinessLoading(false);

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setSkillGapsLoading(true);

      try {
        const result = await getSkillGaps(token);
        if (!cancelled) setSkillGaps(result);
      } catch (err: unknown) {
        if (!cancelled) console.error("Unable to load skill gaps:", err);
      } finally {
        if (!cancelled) setSkillGapsLoading(false);
      }
    }

    if (token) void loadSkills();
    else setSkillGapsLoading(false);

    return () => {
      cancelled = true;
    };
  }, [token]);

  const completedInterviews = useMemo(
    () => interviewHistory.filter((item) => item.status === "completed"),
    [interviewHistory]
  );

  const scoredInterviews = useMemo(
    () =>
      completedInterviews
        .filter(
          (item) =>
            typeof item.evaluation?.percentage === "number"
        )
        .sort(
          (a, b) =>
            new Date(a.completedAt ?? a.createdAt).getTime() -
            new Date(b.completedAt ?? b.createdAt).getTime()
        ),
    [completedInterviews]
  );

  const averageScore = useMemo(() => {
    if (
      typeof readiness?.averageInterviewScore === "number"
    ) {
      return Math.round(readiness.averageInterviewScore);
    }

    if (!scoredInterviews.length) return 0;

    return Math.round(
      scoredInterviews.reduce(
        (sum, item) => sum + (item.evaluation?.percentage ?? 0),
        0
      ) / scoredInterviews.length
    );
  }, [readiness, scoredInterviews]);

  const latestInterview =
    [...completedInterviews].sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime()
    )[0] ?? null;

  const latestScore =
    typeof latestInterview?.evaluation?.percentage === "number"
      ? latestInterview.evaluation.percentage
      : null;

  const profileCompletion = user
    ? Math.round(
        ([user.name, user.email, user.targetRole].filter(
          (value) => Boolean(value?.trim())
        ).length /
          3) *
          100
      )
    : 0;

  const firstName =
    user?.name.trim().split(/\s+/)[0] || "Candidate";

  const chartItems = scoredInterviews.slice(-7);
  const chartHasScores = chartItems.length > 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-rose-500/20 bg-slate-900 p-8 text-center">
        <CircleAlert className="mx-auto mb-4 text-rose-300" size={36} />
        <h1 className="text-xl font-bold text-white">
          Unable to load dashboard
        </h1>
        <p className="mt-3 text-sm text-rose-200">
          {error || "Your profile could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          Return to login
        </button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">
              <Sparkles size={14} />
              YOUR AI PRACTICE WORKSPACE
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Welcome back, {firstName}
              <span className="text-indigo-300">!</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Build confidence, sharpen your answers, and prepare
              for your next opportunity with structured interview
              practice and performance feedback.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <BriefcaseBusiness size={16} className="text-indigo-300" />
              <span>Target role:</span>
              <span className="font-semibold text-slate-200">
                {user.targetRole?.trim() || "Not selected"}
              </span>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="ml-1 font-semibold text-indigo-300 hover:text-white"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400"
            >
              <Play size={17} />
              Start Mock Interview
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/resume-interview")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-violet-400/60 hover:bg-violet-500/10"
            >
              <FileUser size={17} />
              Practice with My Resume
            </button>
          </div>
        </div>
      </section>

      {/* Overview statistics */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">
              Performance overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A snapshot of your interview preparation
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/analytics")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 hover:text-white"
          >
            View analytics <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Interviews completed"
            value={historyLoading ? "…" : String(completedInterviews.length)}
            detail={
              historyLoading
                ? "Loading history"
                : `${interviewHistory.length} total attempts`
            }
            icon={<BrainCircuit size={20} />}
            iconStyle="bg-indigo-500/10 text-indigo-300"
          />

          <StatCard
            title="Average score"
            value={
              readinessLoading && !scoredInterviews.length
                ? "…"
                : `${averageScore}%`
            }
            detail={
              scoredInterviews.length
                ? `Based on ${scoredInterviews.length} scored interviews`
                : "Complete an interview to get a score"
            }
            icon={<Target size={20} />}
            iconStyle="bg-emerald-500/10 text-emerald-300"
          />

          <StatCard
            title="Latest score"
            value={latestScore === null ? "—" : `${latestScore}%`}
            detail={
              latestInterview
                ? formatDate(
                    latestInterview.completedAt ?? latestInterview.createdAt
                  )
                : "No completed interview yet"
            }
            icon={<TrendingUp size={20} />}
            iconStyle="bg-violet-500/10 text-violet-300"
          />

          <StatCard
            title="Profile completion"
            value={`${profileCompletion}%`}
            detail={
              profileCompletion === 100
                ? "Your basic profile is complete"
                : "Complete your candidate details"
            }
            icon={<UserRound size={20} />}
            iconStyle="bg-amber-500/10 text-amber-300"
            onClick={() => navigate("/profile")}
          />
        </div>
      </section>

      {/* Chart and readiness panel */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">
                Performance trend
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Scores from your latest completed interviews
              </p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-300">
              <BarChart3 size={20} />
            </div>
          </div>

          {chartHasScores ? (
            <div className="mt-7">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>Score (%)</span>
                <span>Latest {chartItems.length} scored attempts</span>
              </div>

              <div className="relative h-48 border-b border-l border-slate-700 pl-2">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {[100, 75, 50, 25, 0].map((tick) => (
                    <div
                      key={tick}
                      className="relative border-t border-dashed border-slate-800"
                    >
                      <span className="absolute -left-2 -translate-x-full -translate-y-1/2 text-[10px] text-slate-600">
                        {tick}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="absolute inset-0 flex items-end justify-around gap-2 px-3">
                  {chartItems.map((item, index) => {
                    const score = Math.max(
                      0,
                      Math.min(100, item.evaluation?.percentage ?? 0)
                    );

                    return (
                      <div
                        key={item.id ?? `${item.createdAt}-${index}`}
                        className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        title={`${score}% — ${formatDate(item.completedAt ?? item.createdAt)}`}
                      >
                        <span className="mb-2 text-xs font-bold text-indigo-200 opacity-80 group-hover:opacity-100">
                          {score}%
                        </span>
                        <div
                          className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-indigo-700 to-indigo-400 transition-all duration-300 group-hover:from-violet-600 group-hover:to-violet-300"
                          style={{ height: `${Math.max(score, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex justify-around gap-2">
                {chartItems.map((item, index) => (
                  <span
                    key={item.id ?? `${item.createdAt}-label-${index}`}
                    className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500"
                    title={formatDate(item.completedAt ?? item.createdAt)}
                  >
                    #{index + 1}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 text-center">
              <div className="mb-3 rounded-xl bg-indigo-500/10 p-3 text-indigo-300">
                <BarChart3 size={25} />
              </div>
              <p className="font-semibold text-slate-200">
                Your progress chart starts here
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Complete and evaluate your first mock interview to
                see your score trend here.
              </p>
              <button
                type="button"
                onClick={() => navigate("/interview/setup")}
                className="mt-4 text-sm font-semibold text-indigo-300 hover:text-white"
              >
                Start your first interview →
              </button>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">
                Readiness snapshot
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on available interview evaluations
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
              <Target size={20} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <div
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#818cf8 ${averageScore}%, #1e293b ${averageScore}% 100%)`,
              }}
              role="img"
              aria-label={`Readiness estimate ${averageScore} percent`}
            >
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-slate-900">
                <span className="text-2xl font-extrabold text-white">
                  {readinessLoading && !scoredInterviews.length
                    ? "…"
                    : `${averageScore}%`}
                </span>
                <span className="text-[10px] text-slate-500">
                  Average score
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-slate-100">
                {readiness?.label ??
                  (scoredInterviews.length
                    ? "Keep building consistency"
                    : "Ready when you are")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {scoredInterviews.length
                  ? "Review your improvement areas and practise them in your next session."
                  : "Start with a practice interview to establish your baseline."}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Priority improvement areas
            </p>

            {readiness?.improvementAreas?.length ? (
              <ul className="space-y-3">
                {readiness.improvementAreas.slice(0, 3).map((area) => (
                  <li key={area} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            ) : skillGaps.length ? (
              <ul className="space-y-3">
                {skillGaps.slice(0, 3).map((skill) => (
                  <li key={skill.skill} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
                    <span>{skill.skill}: {skill.readiness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                {skillGapsLoading
                  ? "Loading recommendations..."
                  : "Complete an interview to receive personalized practice recommendations."}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/analytics")}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:bg-indigo-500/5"
          >
            Explore analytics <ArrowRight size={16} />
          </button>
        </article>
      </section>

      {/* Recent interviews */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5 sm:p-6">
          <div>
            <h2 className="font-bold text-white">Recent interviews</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your latest practice sessions and results
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/interview/history")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-white"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Loading recent interviews...
          </div>
        ) : interviewHistory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
              <History size={22} />
            </div>
            <p className="font-semibold text-slate-200">
              No interviews yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your practice sessions will appear here after you start an interview.
            </p>
            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Start an interview
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {interviewHistory.slice(0, 5).map((interview, index) => {
              const score = interview.evaluation?.percentage;
              const completed = interview.status === "completed";
              const interviewId = interview.id;

              return (
                <div
                  key={interviewId ?? `${interview.createdAt}-${index}`}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                      <BrainCircuit size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-100">
                        {interview.targetRole || "Mock Interview"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatDate(interview.createdAt)}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {interview.category || "Interview"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        completed
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Clock3 size={13} />
                      )}
                      {completed ? "Completed" : interview.status.replace("_", " ")}
                    </span>

                    {typeof score === "number" && (
                      <span className={`text-sm font-bold ${scoreColor(score)}`}>
                        {score}%
                      </span>
                    )}

                    {interviewId && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            completed
                              ? `/interview/${interviewId}/results`
                              : `/interview/${interviewId}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-indigo-400 hover:text-white"
                      >
                        {completed ? "View results" : "Resume"}
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {historyError && (
          <p className="border-t border-slate-800 px-5 py-3 text-xs text-amber-300">
            History could not be fully refreshed: {historyError}
          </p>
        )}
      </section>

      {/* Skill analysis */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Skill gap analysis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Areas to strengthen based on available evaluations
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
            {skillGapsLoading ? "Loading..." : `${skillGaps.length} tracked areas`}
          </span>
        </div>

        {skillGapsLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Loading your skill breakdown...
          </p>
        ) : skillGaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 px-5 py-8 text-center">
            <Target size={24} className="mx-auto mb-3 text-slate-500" />
            <p className="font-medium text-slate-300">
              Your skill analysis will appear here
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Complete an evaluated interview to get skill-specific feedback.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {skillGaps.slice(0, 6).map((skill) => (
              <article
                key={skill.skill}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-100">
                    {skill.skill}
                  </h3>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
                    {skill.readiness}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <p className="text-2xl font-extrabold text-indigo-300">
                    {skill.averageScore}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {skill.assessments} assessment
                    {skill.assessments === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{
                      width: `${Math.max(0, Math.min(100, skill.averageScore))}%`,
                    }}
                  />
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  {skill.weakAreas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-300">
                        Improve next
                      </p>
                      <ul className="mt-1 space-y-1 text-slate-400">
                        {skill.weakAreas.slice(0, 2).map((area) => (
                          <li key={area}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {skill.recommendedPractice.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        Practice suggestion
                      </p>
                      <p className="mt-1 leading-5 text-slate-400">
                        {skill.recommendedPractice[0]}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Profile reminder */}
      {profileCompletion < 100 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-300">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-white">
                Complete your candidate profile
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Add your target role and profile details for a more focused practice experience.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-400/40 px-4 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10"
          >
            Update profile <ArrowRight size={15} />
          </button>
        </section>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  iconStyle: string;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  detail,
  icon,
  iconStyle,
  onClick,
}: StatCardProps) {
  return (
    <article
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-700 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className={`rounded-xl p-2.5 ${iconStyle}`}>{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

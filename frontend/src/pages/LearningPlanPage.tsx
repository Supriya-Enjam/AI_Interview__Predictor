
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Code2,
  MessageSquare,
  Target,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

import {
  getInterviewReadiness,
  getSkillGaps,
  type InterviewReadinessSummary,
  type SkillGapSummary,
} from "../services/interviewApi";

import {
  getLearningProgress,
  saveLearningProgress,
} from "../services/learningProgressApi";

const learningModules = [
  {
    title: "Technical Fundamentals",
    description:
      "Strengthen programming concepts, data structures, algorithms, and problem-solving.",
    icon: Code2,
    duration: "7 days",
    category: "technical",
    topics: [
      "Programming fundamentals",
      "Data structures and algorithms",
      "Time and space complexity",
      "Practice technical questions",
    ],
  },
  {
    title: "Communication Skills",
    description:
      "Improve answer clarity, structure, confidence, and professional communication.",
    icon: MessageSquare,
    duration: "5 days",
    category: "communication",
    topics: [
      "Structure answers clearly",
      "Explain technical concepts",
      "Practice concise responses",
      "Improve answer delivery",
    ],
  },
  {
    title: "Behavioral Interview Preparation",
    description:
      "Prepare structured responses for teamwork, leadership, and problem-solving questions.",
    icon: Brain,
    duration: "4 days",
    category: "behavioral",
    topics: [
      "Learn the STAR method",
      "Prepare teamwork examples",
      "Describe challenges and outcomes",
      "Practice HR questions",
    ],
  },
];

export default function LearningPlanPage() {
  const navigate = useNavigate();

  const [readiness, setReadiness] =
    useState<InterviewReadinessSummary | null>(null);

  const [skillGaps, setSkillGaps] = useState<SkillGapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [progressLoaded, setProgressLoaded] = useState(false);
  const [progressSaveError, setProgressSaveError] = useState("");

  // Progress is stored separately for each signed-in user.
  const [completedTopics, setCompletedTopics] = useState<string[]>(() => {
    try {
      const savedSession = sessionStorage.getItem("interviewiq_session");
      const session = savedSession
        ? (JSON.parse(savedSession) as {
            user?: { id?: string; _id?: string; email?: string };
          })
        : null;
      const userKey =
        session?.user?.id ??
        session?.user?._id ??
        session?.user?.email ??
        "default";
      const savedProgress = localStorage.getItem(
        `interviewiq_learning_progress_${userKey}`
      );
      const parsed: unknown = savedProgress ? JSON.parse(savedProgress) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });

  const getUserProgressKey = () => {
    try {
      const savedSession = sessionStorage.getItem("interviewiq_session");
      const session = savedSession
        ? (JSON.parse(savedSession) as {
            user?: { id?: string; _id?: string; email?: string };
          })
        : null;
      const userKey =
        session?.user?.id ??
        session?.user?._id ??
        session?.user?.email ??
        "default";
      return `interviewiq_learning_progress_${userKey}`;
    } catch {
      return "interviewiq_learning_progress_default";
    }
  };

  useEffect(() => {
  if (!progressLoaded) return;

  // Keep a browser copy for convenience and offline resilience.
  try {
    localStorage.setItem(
      getUserProgressKey(),
      JSON.stringify(completedTopics)
    );
  } catch {
    // Browser storage may be unavailable.
  }

  const savedSession = sessionStorage.getItem("interviewiq_session");
  const token = savedSession
    ? (JSON.parse(savedSession) as { token?: string }).token
    : undefined;

  if (!token) return;

  let active = true;

  const timeoutId = window.setTimeout(async () => {
    try {
      await saveLearningProgress(token, completedTopics);

      if (active) {
        setProgressSaveError("");
      }
    } catch (err) {
      if (active) {
        setProgressSaveError(
          err instanceof Error
            ? err.message
            : "Unable to save learning progress."
        );
      }
    }
  }, 400);

  return () => {
    active = false;
    window.clearTimeout(timeoutId);
  };
}, [completedTopics, progressLoaded]);

  const totalTopics = learningModules.reduce(
    (total, module) => total + module.topics.length,
    0
  );
  const completedCount = completedTopics.filter((topicId) =>
    learningModules.some((module) =>
      module.topics.some(
        (topic) => `${module.category}:${topic}` === topicId
      )
    )
  ).length;
  const progressPercent =
    totalTopics === 0 ? 0 : Math.round((completedCount / totalTopics) * 100);

  function toggleTopic(topicId: string) {
    setCompletedTopics((current) =>
      current.includes(topicId)
        ? current.filter((item) => item !== topicId)
        : [...current, topicId]
    );
  }

  useEffect(() => {
    let active = true;

    async function loadLearningData() {
      setLoading(true);
      setError("");

      try {
        const savedSession = sessionStorage.getItem(
          "interviewiq_session"
        );

        const token = savedSession
          ? (JSON.parse(savedSession) as { token?: string })?.token
          : undefined;

        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

       const [readinessResult, skillGapsResult, progressResult] =
  await Promise.all([
    getInterviewReadiness(token),
    getSkillGaps(token),
    getLearningProgress(token),
  ]);

if (!active) return;

setReadiness(readinessResult);
setSkillGaps(skillGapsResult);

// Use database progress when available.
// Otherwise, keep existing browser progress.
const serverTopics = progressResult.completedTopics;

if (serverTopics.length > 0) {
  setCompletedTopics(serverTopics);
}

setProgressLoaded(true);

      } catch (err) {
  if (active) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to load your learning recommendations."
    );

    setProgressLoaded(true);
  }
} finally {
  if (active) setLoading(false);
}
    }

    void loadLearningData();

    return () => {
      active = false;
    };
  }, []);

  const recommendedGaps = [...skillGaps].sort((a, b) => {
    const priority: Record<SkillGapSummary["readiness"], number> = {
  "Needs work": 0,
  Developing: 1,
  Solid: 2,
  Strong: 3,
};

return priority[a.readiness] - priority[b.readiness];
  });

  function getModuleForSkill(skill: string) {
    const value = skill.toLowerCase();

    if (
      /communication|clarity|relevance|confidence|speaking|language/.test(
        value
      )
    ) {
      return "communication";
    }

    if (
      /behavior|hr|leadership|teamwork|situational|conflict/.test(value)
    ) {
      return "behavioral";
    }

    return "technical";
  }

  function getModuleRecommendation(category: string) {
    return (
      learningModules.find((module) => module.category === category) ??
      learningModules[0]
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8 dark:bg-slate-950 dark:text-white">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-6 text-white shadow-xl sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Target size={25} />
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Your personal growth journey
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Your Interview Learning Plan
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-indigo-100">
            Build your interview skills through focused learning,
            consistent practice, and measurable progress.
          </p>

          <button
            onClick={() => navigate("/interview/setup")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Start practicing
            <ArrowRight size={18} />
          </button>
        </div>

        <BookOpen
          size={180}
          className="absolute -bottom-10 -right-8 hidden text-white/10 sm:block"
        />
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="mb-3 text-indigo-500" size={23} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Learning modules
          </p>
          <p className="mt-1 text-3xl font-bold">
            {learningModules.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <TrendingUp className="mb-3 text-emerald-500" size={23} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Recommended duration
          </p>
          <p className="mt-1 text-3xl font-bold">16 days</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 className="mb-3 text-violet-500" size={23} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interview readiness
          </p>
          <p className="mt-1 text-3xl font-bold">
            {loading
              ? "..."
              : readiness
                ? `${readiness.score}%`
                : "Not available"}
          </p>
        </div>
      </section>

      {/* Overall learning progress */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Your learning progress</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Mark each topic complete as you work through your plan.
            </p>
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {progressPercent}%
          </p>
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label="Learning plan completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
       <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
  {completedCount} of {totalTopics} topics completed
</p>

{progressSaveError && (
  <p
    role="alert"
    className="mt-3 text-sm text-red-600 dark:text-red-400"
  >
    Progress could not be saved to your account: {progressSaveError}
  </p>
)}

{!progressSaveError && progressLoaded && (
  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
    Your learning progress syncs with your account.
  </p>
)}
      </section>

      {/* Readiness and skill-gap analysis */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Your interview readiness
            </h2>
            <TrendingUp className="text-indigo-500" size={22} />
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">
              Loading your readiness score...
            </p>
          ) : error ? (
            <p className="mt-4 text-sm text-amber-600">{error}</p>
          ) : readiness ? (
            <>
              <p className="mt-4 text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                {readiness.score}%
              </p>

              <p className="mt-2 font-semibold">{readiness.label}</p>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {readiness.summary}
              </p>

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Assessments completed: {readiness.interviewCount}
              </p>

              {readiness.strongestSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Your strengths</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {readiness.strongestSkills.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Complete a mock interview to start measuring your readiness.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Priority improvement areas</h2>
            <Brain className="text-violet-500" size={22} />
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">
              Analyzing your skill gaps...
            </p>
          ) : error ? (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
            >
              <RefreshCw size={16} />
              Reload recommendations
            </button>
          ) : recommendedGaps.length > 0 ? (
            <div className="mt-4 space-y-5">
              {recommendedGaps.slice(0, 4).map((gap) => {
                const module = getModuleRecommendation(
                  getModuleForSkill(gap.skill)
                );

                return (
                  <div key={gap.skill}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{gap.skill}</p>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        {gap.readiness}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {gap.recommendedPractice.length > 0
                        ? gap.recommendedPractice.slice(0, 2).join(" • ")
                        : "Practice this skill in your next mock interview."}
                    </p>

                    <button
                      onClick={() => navigate("/interview/setup")}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      Practice {module.category}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your personalized skill recommendations will appear when
              assessment data is available. You can start with any learning
              module below.
            </p>
          )}
        </div>
      </section>

      {/* Learning modules */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold">Recommended learning path</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Follow these modules and prioritize the areas identified in your
            assessment results.
          </p>
        </div>

        <div className="space-y-5">
          {learningModules.map((module, index) => {
            const Icon = module.icon;

            const matchingGaps = recommendedGaps.filter(
              (gap) => getModuleForSkill(gap.skill) === module.category
            );
            const moduleCompletedCount = module.topics.filter((topic) =>
              completedTopics.includes(`${module.category}:${topic}`)
            ).length;
            const moduleProgressPercent =
              module.topics.length === 0
                ? 0
                : Math.round((moduleCompletedCount / module.topics.length) * 100);

            return (
              <article
                key={module.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Icon size={27} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Module {index + 1}
                      </span>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {module.duration}
                      </span>

                      {matchingGaps.some(
                        (gap) =>
                          gap.readiness === "Needs work" ||
                          gap.readiness === "Developing"
                      ) && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          Recommended priority
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-bold">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {module.description}
                    </p>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Module progress
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {moduleCompletedCount}/{module.topics.length} topics · {moduleProgressPercent}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                        role="progressbar"
                        aria-label={`${module.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={moduleProgressPercent}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
                          style={{ width: `${moduleProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    {matchingGaps.length > 0 && (
                      <div className="mt-4 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-500/10">
                        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                          Based on your results
                        </p>
                        <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-200">
                          Focus on:{" "}
                          {matchingGaps
                            .slice(0, 3)
                            .map((gap) => gap.skill)
                            .join(", ")}
                        </p>
                      </div>
                    )}

                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {module.topics.map((topic) => {
                        const topicId = `${module.category}:${topic}`;
                        const isCompleted = completedTopics.includes(topicId);

                        return (
                          <li key={topicId}>
                            <label
                              className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                                isCompleted
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                                  : "border-slate-200 text-slate-600 hover:border-indigo-200 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => toggleTopic(topicId)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                              />
                              <span className={isCompleted ? "line-through" : ""}>
                                {topic}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex items-center sm:self-start">
                    <button
                      onClick={() => navigate("/interview/setup")}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                    >
                      Practice now
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Next steps */}
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <h2 className="text-lg font-bold">Your next step</h2>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Use your assessment feedback to identify what needs the most
          attention. Complete a mock interview, review the results, and
          return to this plan to decide what to practice next.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/interview/setup")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            Start mock interview
            <ArrowRight size={17} />
          </button>

          <button
            onClick={() => navigate("/analytics")}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
          >
            View analytics
            <TrendingUp size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

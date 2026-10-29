
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../services/authApi";
import {
  createInterview,
  getQuestionBankPreview,
  type QuestionBankPreviewEntry,
} from "../services/interviewApi";

interface InterviewSetupPageProps {
  token: string;
}

type InterviewCategory =
  | "technical"
  | "behavioral"
  | "mixed"
  | "hr"
  | "situational"
  | "coding";
type InterviewDifficulty = "beginner" | "intermediate" | "advanced";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function InterviewSetupPage({
  token,
}: InterviewSetupPageProps) {
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState("");
  const [category, setCategory] =
    useState<InterviewCategory>("technical");
  const [difficulty, setDifficulty] =
    useState<InterviewDifficulty>("intermediate");
  const [duration, setDuration] = useState("15");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [previewQuestions, setPreviewQuestions] = useState<QuestionBankPreviewEntry[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTargetRole() {
      try {
        const result = await getMyProfile(token);

        if (!cancelled) {
          setTargetRole(result.user.targetRole || "");
        }
      } catch {
        if (!cancelled) {
          setError(
            "We couldn't load your saved profile. You can still enter your job role manually."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    if (!token) {
      setLoadingProfile(false);
      setError("Your session is missing. Please sign in again.");
      return;
    }

    void loadTargetRole();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!token) {
        return;
      }

      setPreviewLoading(true);

      try {
        const preview = await getQuestionBankPreview(token, {
          category,
          difficulty,
          targetRole: targetRole.trim() || "product engineer",
        });

        if (!cancelled) {
          setPreviewQuestions(preview.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setPreviewQuestions([]);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [category, difficulty, targetRole, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedRole = targetRole.trim();

    if (trimmedRole.length < 2 || trimmedRole.length > 100) {
      setError("Enter a job role between 2 and 100 characters.");
      return;
    }

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSubmitting(true);

    try {
      const interview = await createInterview(token, {
        targetRole: trimmedRole,
        category,
        difficulty,
        duration: Number(duration) as 10 | 15 | 30 | 45,
      });

      sessionStorage.setItem(
        "interviewiq_setup_draft",
        JSON.stringify({
          targetRole: trimmedRole,
          category,
          difficulty,
          duration: Number(duration),
        })
      );

      sessionStorage.setItem(
        "interviewiq_current_interview",
        JSON.stringify(interview)
      );

      navigate(`/interview/${encodeURIComponent(interview.id)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your interview. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading your interview preferences...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-xl font-extrabold"
          >
            Interview<span className="text-indigo-400">IQ</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-indigo-400"
          >
            ← Dashboard
          </button>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            Mock interview
          </p>

          <h1 className="mt-3 text-3xl font-extrabold">
            Set up your interview
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Customize your practice session to match your career
            goals and experience level.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="targetRole" className="text-sm font-semibold">
                Target job role
              </label>
              <input
                id="targetRole"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                minLength={2}
                maxLength={100}
                required
                placeholder="e.g. Software Engineer"
                className={inputClass}
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="category" className="text-sm font-semibold">
                Interview category
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as InterviewCategory)
                }
                className={inputClass}
                disabled={submitting}
              >
                <option value="technical">Technical interview</option>
                <option value="behavioral">Behavioral interview</option>
                <option value="hr">HR interview</option>
                <option value="situational">Situational interview</option>
                <option value="coding">Coding &amp; problem solving</option>
                <option value="mixed">Mixed interview</option>
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="text-sm font-semibold">
                Difficulty level
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as InterviewDifficulty)
                }
                className={inputClass}
                disabled={submitting}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="duration" className="text-sm font-semibold">
                Interview duration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">
                  Sample questions preview
                </h2>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {previewLoading ? "Loading..." : `${previewQuestions.length} sample(s)`}
                </span>
              </div>

              {previewQuestions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {previewLoading
                    ? "Loading question ideas..."
                    : "No preview questions are available for this configuration yet."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {previewQuestions.map((question, index) => (
                    <li
                      key={`${question.questionText}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        <span>{question.category}</span>
                        <span>•</span>
                        <span>{question.difficulty}</span>
                      </div>
                      <p className="leading-6">{question.questionText}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating interview..." : "Start Interview"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

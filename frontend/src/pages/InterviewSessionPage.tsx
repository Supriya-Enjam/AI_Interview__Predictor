
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  completeInterview,
  getInterview,
  saveInterviewAnswer,
  type InterviewSession,
} from "../services/interviewApi";

interface InterviewSessionPageProps {
  token: string;
}

export default function InterviewSessionPage({
  token,
}: InterviewSessionPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [interview, setInterview] = useState<InterviewSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInterview() {
      if (!token || !id) {
        setError("Your interview session is missing. Please return to setup.");
        setLoading(false);
        return;
      }

      try {
        const result = await getInterview(token, id);

        if (cancelled) return;

        if (result.questions.length === 0) {
          setError("This interview has no questions available.");
          return;
        }

        if (result.status === "completed") {
          setInterview(result);
          setCompleted(true);
          return;
        }

        setInterview(result);

        const savedAnswers = sessionStorage.getItem(
          `interviewiq_answers_${id}`
        );

        if (savedAnswers) {
          try {
            const parsed = JSON.parse(savedAnswers) as Record<
              string,
              string
            >;

            setAnswers(parsed);
          } catch {
            sessionStorage.removeItem(`interviewiq_answers_${id}`);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your interview."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInterview();

    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const questions = interview?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.questionId] ?? ""
    : "";

  const answeredCount = questions.filter(
    (question) =>
      Boolean(answers[question.questionId]?.trim())
  ).length;

  function updateAnswer(value: string) {
    if (!currentQuestion) return;

    const updatedAnswers = {
      ...answers,
      [currentQuestion.questionId]: value,
    };

    setAnswers(updatedAnswers);
    setError("");

    if (id) {
      try {
        sessionStorage.setItem(
          `interviewiq_answers_${id}`,
          JSON.stringify(updatedAnswers)
        );
      } catch {
        // The answer can still be submitted to the backend.
      }
    }
  }

  async function saveCurrentAnswer(): Promise<boolean> {
    if (!interview || !id || !currentQuestion) return false;

    const answer = currentAnswer.trim();

    if (!answer) {
      setError("Please enter your answer before continuing.");
      return false;
    }

    setSaving(true);
    setError("");

    try {
      await saveInterviewAnswer(
        token,
        id,
        currentQuestion.questionId,
        answer
      );

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your answer."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    const saved = await saveCurrentAnswer();

    if (saved) {
      setCurrentIndex((index) =>
        Math.min(index + 1, questions.length - 1)
      );
    }
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!interview || !id) return;

    const allAnswered = questions.every((question) => {
      if (question.questionId === currentQuestion?.questionId) {
        return Boolean(currentAnswer.trim());
      }

      return Boolean(answers[question.questionId]?.trim());
    });

    if (!allAnswered) {
      setError("Please answer every question before completing the interview.");
      return;
    }

    const saved = await saveCurrentAnswer();

    if (!saved) return;

    setSaving(true);
    setError("");

    try {
     await completeInterview(token, id);

try {
  sessionStorage.removeItem(`interviewiq_answers_${id}`);
} catch {
  // The interview has already been completed.
}

navigate(`/interview/${encodeURIComponent(id)}/results`);
return;

      try {
        sessionStorage.removeItem(`interviewiq_answers_${id}`);
      } catch {
        // Completion has already been saved by the backend.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete your interview."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading your interview...
      </main>
    );
  }

  if (completed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <section className="w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl text-emerald-300">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-extrabold">
            Interview completed!
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Your answers have been submitted and your interview session
            has been marked as completed.
          </p>

          <p className="mt-4 text-sm text-slate-300">
            {questions.length} questions in total
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            Return to dashboard
          </button>
        </section>
      </main>
    );
  }

  if (!interview || !currentQuestion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-slate-100">
        <p className="text-red-300">
          {error || "Interview session could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/interview/setup")}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
        >
          Back to interview setup
        </button>
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

          <span className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300">
            {interview.targetRole}
          </span>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
              Mock interview
            </span>

            <span className="text-sm text-slate-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={currentIndex + 1}
            aria-label="Interview question progress"
          >
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-indigo-300">
              {interview.category}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
              {interview.difficulty}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
              {interview.duration} minutes
            </span>
          </div>

          <form onSubmit={handleComplete} className="mt-8">
            <p className="text-sm font-medium text-slate-400">
              Question {currentQuestion.order} · {currentQuestion.category}
            </p>

            <h1 className="mt-3 text-2xl font-bold leading-relaxed sm:text-3xl">
              {currentQuestion.questionText}
            </h1>

            <label
              htmlFor="answer"
              className="mt-8 block text-sm font-semibold"
            >
              Your answer
            </label>

            <textarea
              id="answer"
              value={currentAnswer}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="Explain your approach and provide examples where possible..."
              rows={8}
              maxLength={10000}
              required
              disabled={saving}
              className="mt-3 w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            />

            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Answers are saved to your interview session.</span>
              <span>{currentAnswer.length}/10000</span>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setCurrentIndex((index) => Math.max(index - 1, 0));
                }}
                disabled={currentIndex === 0 || saving}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving answer..." : "Save & Next →"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Submitting..."
                    : "Complete Interview"}
                </button>
              )}
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              {answeredCount} of {questions.length} questions answered in this browser
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

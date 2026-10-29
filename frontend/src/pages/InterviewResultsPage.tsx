
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  evaluateInterview,
  getInterview,
  type InterviewSession,
} from "../services/interviewApi";

interface InterviewResultsPageProps {
  token: string;
}

export default function InterviewResultsPage({
  token,
}: InterviewResultsPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInterview() {
      if (!token || !id) {
        setError("Interview or authentication information is missing.");
        setLoading(false);
        return;
      }

      try {
        const result = await getInterview(token, id);

        if (!active) return;

        if (result.status === "completed" && !result.evaluation) {
          try {
            const evaluation = await evaluateInterview(token, id);

            if (active) {
              setInterview({
                ...result,
                evaluation,
              });
            }
            return;
          } catch (evaluationError) {
            if (active) {
              setError(
                evaluationError instanceof Error
                  ? evaluationError.message
                  : "Unable to generate an interview evaluation."
              );
            }
            return;
          }
        }

        if (active) {
          setInterview(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load interview results."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInterview();

    return () => {
      active = false;
    };
  }, [token, id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p>Loading interview results...</p>
      </main>
    );
  }

  if (error || !interview) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Unable to load results</h1>
        <p className="text-slate-300 text-center">
          {error || "Interview details could not be found."}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const answeredCount = interview.questions.filter(
    (question) => Boolean(question.answer?.trim())
  ).length;

  const completed =
    interview.status === "completed" &&
    answeredCount === interview.questions.length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-indigo-300 hover:text-indigo-200"
        >
          ← Back to Dashboard
        </button>

        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            InterviewIQ · Interview Summary
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            {completed ? "Interview Completed!" : "Interview Review"}
          </h1>

          <p className="mt-3 text-slate-300">
            Review your interview questions and submitted answers below.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Target Role" value={interview.targetRole} />
            <SummaryItem
              label="Category"
              value={capitalize(interview.category)}
            />
            <SummaryItem
              label="Difficulty"
              value={capitalize(interview.difficulty)}
            />
            <SummaryItem
              label="Duration"
              value={`${interview.duration} minutes`}
            />
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryItem
            label="Interview Status"
            value={capitalize(interview.status.replace("_", " "))}
          />
          <SummaryItem
            label="Questions Answered"
            value={`${answeredCount} / ${interview.questions.length}`}
          />
          <SummaryItem
            label="Completion Date"
            value={
              interview.completedAt
                ? new Date(interview.completedAt).toLocaleString()
                : "Not completed"
            }
          />
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">Question & Answer Review</h2>

          <div className="mt-4 space-y-5">
            {interview.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((question, index) => (
                <article
                  key={question.questionId}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5 md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-indigo-300">
                      Question {index + 1}
                    </p>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {capitalize(question.category)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold leading-relaxed">
                    {question.questionText}
                  </h3>

                  <div className="mt-5 rounded-xl bg-slate-800/70 p-4">
                    <p className="text-sm font-semibold text-slate-300">
                      Your Answer
                    </p>

                    {question.answer?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-100">
                        {question.answer}
                      </p>
                    ) : (
                      <p className="mt-2 italic text-amber-300">
                        No saved answer for this question.
                      </p>
                    )}
                  </div>

                  {question.answeredAt && (
                    <p className="mt-3 text-xs text-slate-400">
                      Saved: {new Date(question.answeredAt).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
          </div>
        </section>

        {interview.evaluation && (
          <section className="mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-indigo-200">
                Performance Evaluation
              </h2>
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-indigo-200">
                {interview.evaluation.percentage}%
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SummaryItem
                label="Overall score"
                value={`${interview.evaluation.overallScore}/${interview.evaluation.maxScore}`}
              />
              <SummaryItem
                label="Method"
                value={capitalize(interview.evaluation.evaluationMethod)}
              />
              <SummaryItem
                label="Evaluated"
                value={new Date(interview.evaluation.evaluatedAt).toLocaleString()}
              />
            </div>

            <p className="mt-5 text-base leading-7 text-slate-200">
              {interview.evaluation.summary}
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
                  Strengths
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(interview.evaluation.strengths.length > 0
                    ? interview.evaluation.strengths
                    : ["No clear strengths were identified in this rubric."]
                  ).map((strength) => (
                    <li key={strength}>• {strength}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-300">
                  Improvements
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(interview.evaluation.improvements.length > 0
                    ? interview.evaluation.improvements
                    : ["This evaluation did not identify specific improvement areas."]
                  ).map((improvement) => (
                    <li key={improvement}>• {improvement}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {interview.evaluation.questionEvaluations.map((result, index) => (
                <article
                  key={result.questionId}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-indigo-300">
                      Question {index + 1}
                    </p>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {result.score}/{result.maxScore}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-200">
                    {result.feedback}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/interview/setup")}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            Start Another Interview
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-800"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-words font-semibold text-white">{value}</p>
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

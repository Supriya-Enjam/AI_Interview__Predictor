
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

        if (result.status !== "completed") {
          setInterview(result);
          return;
        }

        if (!result.evaluation) {
          const evaluation = await evaluateInterview(token, id);

          if (!active) return;

          setInterview({
            ...result,
            evaluation,
          });
        } else {
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
          <p className="mt-5 text-slate-300">
            Generating your interview results...
          </p>
        </div>
      </main>
    );
  }

  if (error || !interview) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">Unable to load results</h1>
        <p className="max-w-lg text-center text-slate-300">
          {error || "Interview details could not be found."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const questions = interview.questions
    .slice()
    .sort((a, b) => a.order - b.order);

  const answeredCount = questions.filter((question) =>
    Boolean(question.answer?.trim())
  ).length;

  const skippedCount = questions.length - answeredCount;
  const completed = interview.status === "completed";
  const evaluation = interview.evaluation;

  const percentage = evaluation
    ? Math.max(0, Math.min(100, evaluation.percentage))
    : 0;

  const allExpectedConcepts = questions.reduce(
    (total, question) =>
      total + (question.expectedConcepts?.length ?? 0),
    0
  );

  const questionResults = evaluation?.questionEvaluations ?? [];

  const matchedConceptCount = questionResults.reduce(
    (total, result) => total + (result.matchedConcepts?.length ?? 0),
    0
  );

  const missingConceptCount = questionResults.reduce(
    (total, result) => total + (result.missingConcepts?.length ?? 0),
    0
  );

  const overallConceptCoverage =
    matchedConceptCount + missingConceptCount > 0
      ? (matchedConceptCount /
          (matchedConceptCount + missingConceptCount)) *
        100
      : 0;

      // KEYWORD ANALYSIS

const matchedKeywordCount = questionResults.reduce(
  (total, result) => total + (result.matchedKeywords?.length ?? 0),
  0
);

const missingKeywordCount = questionResults.reduce(
  (total, result) => total + (result.missingKeywords?.length ?? 0),
  0
);

const overallKeywordCoverage =
  matchedKeywordCount + missingKeywordCount > 0
    ? (matchedKeywordCount /
        (matchedKeywordCount + missingKeywordCount)) *
      100
    : 0;

   return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      
      <style>{`
  @media print {
    @page {
      size: A4;
      margin: 12mm;
    }

    html,
    body {
      background: #ffffff !important;
      color: #111827 !important;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    body {
      margin: 0 !important;
    }

    /* Main report container */
    main {
      min-height: auto !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
    }

    main > div {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }

    /* Remove dark website backgrounds */
    main [class*="bg-slate-950"],
    main [class*="bg-slate-900"],
    main [class*="bg-slate-800"],
    main [class*="bg-slate-700"] {
      background: #ffffff !important;
    }

    /* Make report text readable */
    main h1,
    main h2,
    main h3,
    main h4,
    main p,
    main span,
    main li {
      color: #111827 !important;
    }

    /* Keep colored borders subtle */
    main section,
    main article,
    main header,
    main [class*="border-"] {
      border-color: #d1d5db !important;
      box-shadow: none !important;
    }

    /* Hide website navigation and floating elements */
    main header button,
    main button,
    .print\\:hidden,
    .fixed,
    .sticky {
      display: none !important;
    }

    /* Prevent headings from being separated from their content */
    h1,
    h2,
    h3,
    h4 {
      break-after: avoid-page;
      page-break-after: avoid;
    }

    /* Allow long question sections to flow naturally */
    section,
    article {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    /* Avoid splitting smaller report cards */
    main section > div,
    main article > div {
      box-shadow: none !important;
    }

    /* Remove unnecessary transitions and animations */
    * {
      animation: none !important;
      transition: none !important;
    }

    /* Keep report footer readable */
    footer {
      background: #ffffff !important;
      color: #111827 !important;
    }
  }
`}</style>

      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
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

        {/* INTERVIEW SUMMARY */}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            InterviewIQ · Interview Summary
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            {completed ? "Interview Completed!" : "Interview Review"}
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Review your interview performance, answers, and evaluation.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>

        {/* INTERVIEW STATUS */}

        {/* INTERVIEW STATUS */}

<section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <SummaryItem
    label="Interview Status"
    value={capitalize(interview.status.replace("_", " "))}
  />

  <SummaryItem
    label="Questions Answered"
    value={`${answeredCount} / ${questions.length}`}
  />

  <SummaryItem
    label="Questions Skipped"
    value={String(skippedCount)}
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

        {!completed && (
          <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="text-xl font-bold text-amber-300">
              Interview not completed
            </h2>

            <p className="mt-2 leading-7 text-slate-300">
  You can submit an interview after answering at least one question.
  Unanswered questions will be marked as skipped. Complete your remaining
  questions whenever you are ready.
</p>

            <button
              type="button"
              onClick={() =>
                navigate(`/interview/${encodeURIComponent(interview.id)}`)
              }
              className="mt-5 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-500"
            >
              Continue Interview
            </button>
          </section>
        )}

        {/* OVERALL EVALUATION */}

        {completed && evaluation && (
          <>
            <section className="mt-8 rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
                    Performance Evaluation
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold">
                    Your Overall Performance
                  </h2>
                </div>

                <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-lg font-bold text-indigo-300">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row">
                <div className="flex h-44 w-44 shrink-0 flex-col items-center justify-center rounded-full border-8 border-indigo-500/30 bg-indigo-500/10">
                  <span className="text-4xl font-extrabold text-white">
                    {evaluation.overallScore}
                  </span>

                  <span className="mt-1 text-xs text-slate-400">
                    {evaluation.questionEvaluations.length} questions evaluated
                  </span>

                  <span className="mt-1 text-sm text-slate-400">
                    out of {evaluation.maxScore}
                  </span>

                  <span className="mt-2 text-xs font-semibold text-indigo-300">
                    Overall Score
                  </span>
                </div>

                <div className="w-full">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-300">
                      Performance Progress
                    </span>

                    <span className="text-indigo-300">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="mt-5 leading-7 text-slate-300">
                    {evaluation.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-800 px-3 py-2">
                      Method: {capitalize(evaluation.evaluationMethod)}
                    </span>

                    <span className="rounded-full bg-slate-800 px-3 py-2">
                      Evaluated:{" "}
                      {new Date(evaluation.evaluatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* EXPECTED CONCEPT OVERVIEW */}

            <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                Technical Knowledge Analysis
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                Expected Concept Coverage
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                This analysis compares the concepts identified in your answers
                with the expected concepts configured for your interview
                questions.
              </p>

              {allExpectedConcepts === 0 ? (
                <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  No expected concepts were configured for these questions.
                  Create a new interview with expected concepts to use this
                  analysis.
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <ConceptSummary
                      label="Expected Concepts"
                      value={allExpectedConcepts}
                      color="text-cyan-300"
                    />

                    <ConceptSummary
                      label="Matched Concepts"
                      value={matchedConceptCount}
                      color="text-emerald-300"
                    />

                    <ConceptSummary
                      label="Missing Concepts"
                      value={missingConceptCount}
                      color="text-amber-300"
                    />
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-300">
                        Overall Concept Coverage
                      </span>

                      <span className="font-bold text-cyan-300">
                        {overallConceptCoverage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                        style={{
                          width: `${overallConceptCoverage}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* KEYWORD ANALYSIS OVERVIEW */}

<section className="mt-8 rounded-3xl border border-violet-500/20 bg-slate-900 p-6 sm:p-8">
  <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
    Answer Keyword Analysis
  </p>

  <h2 className="mt-2 text-2xl font-extrabold">
    Keyword Coverage Overview
  </h2>

  <p className="mt-2 text-sm leading-6 text-slate-400">
    Review the important keywords detected in your answers and identify
    keywords that were missing compared with the expected concepts for
    each interview question.
  </p>

  {matchedKeywordCount + missingKeywordCount === 0 ? (
    <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
      No keyword analysis is available for this interview.
      Complete a new interview to generate keyword analysis.
    </div>
  ) : (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ConceptSummary
          label="Matched Keywords"
          value={matchedKeywordCount}
          color="text-emerald-300"
        />

        <ConceptSummary
          label="Missing Keywords"
          value={missingKeywordCount}
          color="text-amber-300"
        />

        <ConceptSummary
          label="Keyword Coverage"
          value={Number(overallKeywordCoverage.toFixed(1))}
          color="text-violet-300"
        />
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-slate-300">
            Overall Keyword Coverage
          </span>

          <span className="font-bold text-violet-300">
            {overallKeywordCoverage.toFixed(1)}%
          </span>
        </div>

        <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-700"
            style={{ width: `${overallKeywordCoverage}%` }}
          />
        </div>
      </div>
    </>
  )}
</section>

            {/* STRENGTHS AND IMPROVEMENTS */}

            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-900 p-6">
                <h2 className="text-lg font-bold text-emerald-300">
                  Your Strengths
                </h2>

                <ul className="mt-5 space-y-3">
                  {(evaluation.strengths.length > 0
                    ? evaluation.strengths
                    : ["No specific strengths were identified."]
                  ).map((strength, index) => (
                    <li
                      key={`${strength}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-slate-300"
                    >
                      <span className="text-emerald-400">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-slate-900 p-6">
                <h2 className="text-lg font-bold text-amber-300">
                  Areas for Improvement
                </h2>

                <ul className="mt-5 space-y-3">
                  {(evaluation.improvements.length > 0
                    ? evaluation.improvements
                    : ["No specific improvement areas were identified."]
                  ).map((improvement, index) => (
                    <li
                      key={`${improvement}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-slate-300"
                    >
                      <span className="text-amber-400">!</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* QUESTION-WISE EVALUATION */}

            <section className="mt-8">
              <h2 className="text-2xl font-extrabold">
                Question-wise Evaluation
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Review your scores, expected concepts, matched concepts, and
                areas for improvement for every question.
              </p>

              <div className="mt-5 space-y-4">
                {evaluation.questionEvaluations.map((result, index) => {
                  const question = questions.find(
                    (item) => item.questionId === result.questionId
                  );

                  const matched = result.matchedConcepts ?? [];
                  const missing = result.missingConcepts ?? [];
                  const rubricItems = [
  {
    label: "Completeness",
    score: result.rubric?.completeness ?? 0,
    maxScore: 4,
    color: "bg-blue-500",
  },
  {
    label: "Structure",
    score: result.rubric?.structure ?? 0,
    maxScore: 3,
    color: "bg-cyan-500",
  },
  {
    label: "Specificity",
    score: result.rubric?.specificity ?? 0,
    maxScore: 3,
    color: "bg-violet-500",
  },
  {
    label: "Relevance",
    score: result.rubric?.relevance ?? 0,
    maxScore: 5,
    color: "bg-emerald-500",
  },
  {
    label: "Communication",
    score: result.rubric?.communication ?? 0,
    maxScore: 5,
    color: "bg-amber-500",
  },
];

const hasRubric = Boolean(result.rubric);
                  const coverage = Math.max(
                    0,
                    Math.min(100, result.conceptCoverage ?? 0)
                  );

                  // Question-wise keyword analysis

const matchedKeywords = result.matchedKeywords ?? [];
const missingKeywords = result.missingKeywords ?? [];

const keywordCoverage = Math.max(
  0,
  Math.min(100, result.keywordCoverage ?? 0)
);

                  return (
                    <article
                      key={result.questionId}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold text-indigo-300">
                          Question {index + 1}
                        </h3>

                        <div className="text-right">
                          <span className="rounded-full bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-300">
                            {result.score}/{result.maxScore}
                          </span>

                          <p className="mt-2 text-xs text-slate-400">
                            {result.maxScore > 0
                              ? Math.round(
                                  (result.score / result.maxScore) * 100
                                )
                              : 0}
                            % score
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 font-semibold leading-7 text-white">
                        {question?.questionText ?? `Question ${index + 1}`}
                      </p>

                      {/* CONCEPT COVERAGE */}

                      <div className="mt-5 rounded-xl border border-cyan-500/20 bg-slate-800/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-cyan-300">
                            Expected Concept Coverage
                          </p>

                          <span className="text-sm font-bold text-cyan-300">
                            {coverage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                            style={{ width: `${coverage}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>
                            Matched: {matched.length}
                          </span>
                          <span>
                            Missing: {missing.length}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <ConceptList
                            title="Matched Concepts"
                            concepts={matched}
                            emptyMessage="No expected concepts were matched."
                            type="matched"
                          />

                          <ConceptList
                            title="Missing Concepts"
                            concepts={missing}
                            emptyMessage="No missing concepts identified."
                            type="missing"
                          />
                        </div>

                        {question?.expectedConcepts &&
                          question.expectedConcepts.length > 0 && (
                            <div className="mt-5 border-t border-slate-700 pt-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Configured Expected Concepts
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {question.expectedConcepts.map(
                                  (concept, conceptIndex) => (
                                    <span
                                      key={`${concept}-${conceptIndex}`}
                                      className="rounded-full bg-slate-700 px-3 py-1.5 text-xs text-slate-200"
                                    >
                                      {concept}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
{/* KEYWORD COVERAGE */}

<div className="mt-5 rounded-xl border border-violet-500/20 bg-slate-800/50 p-4">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <p className="text-sm font-semibold text-violet-300">
      Keyword Coverage
    </p>

    <span className="text-sm font-bold text-violet-300">
      {keywordCoverage.toFixed(1)}%
    </span>
  </div>

  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
    <div
      className="h-full rounded-full bg-violet-500 transition-all duration-700"
      style={{ width: `${keywordCoverage}%` }}
    />
  </div>

  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
    <span>Matched: {matchedKeywords.length}</span>
    <span>Missing: {missingKeywords.length}</span>
  </div>

  <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <ConceptList
      title="Matched Keywords"
      concepts={matchedKeywords}
      emptyMessage="No keywords were matched."
      type="matched"
    />

    <ConceptList
      title="Missing Keywords"
      concepts={missingKeywords}
      emptyMessage="No missing keywords identified."
      type="missing"
    />
  </div>
</div>

{/* RUBRIC PERFORMANCE BREAKDOWN */}

<div className="mt-5 rounded-xl border border-indigo-500/20 bg-slate-800/50 p-4">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <h4 className="font-semibold text-indigo-300">
      Performance Breakdown
    </h4>

    {hasRubric && (
      <span className="text-sm font-bold text-indigo-300">
        {result.rubric.total}/20
      </span>
    )}
  </div>

  {hasRubric ? (
    <div className="mt-5 space-y-5">
      {rubricItems.map((item) => {
        const scorePercentage =
          (item.score / item.maxScore) * 100;

        return (
          <div key={item.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-300">
                {item.label}
              </span>

              <span className="font-semibold text-white">
                {item.score}/{item.maxScore}
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-700`}
                style={{
                  width: `${Math.max(0, Math.min(100, scorePercentage))}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="mt-3 text-sm text-amber-300">
      Rubric breakdown is unavailable for this previously saved evaluation.
      Complete a new interview to generate the detailed scores.
    </p>
  )}
</div>
                      {/* FEEDBACK */}

                      <div className="mt-4 rounded-xl bg-slate-800/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Feedback
                        </p>

                        <p className="mt-2 text-sm leading-7 text-slate-200">
                          {result.feedback}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold text-emerald-300">
                            Strengths
                          </p>

                          <ul className="mt-2 space-y-2 text-sm text-slate-400">
                            {(result.strengths.length > 0
                              ? result.strengths
                              : ["No specific strengths identified."]
                            ).map((item, itemIndex) => (
                              <li key={`${item}-${itemIndex}`}>✓ {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-amber-300">
                            Improvements
                          </p>

                          <ul className="mt-2 space-y-2 text-sm text-slate-400">
                            {(result.improvements.length > 0
                              ? result.improvements
                              : ["No specific improvements identified."]
                            ).map((item, itemIndex) => (
                              <li key={`${item}-${itemIndex}`}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* QUESTION AND ANSWER REVIEW */}

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold">
            Question & Answer Review
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Review all your submitted interview answers.
          </p>

          <div className="mt-5 space-y-5">
            {questions.map((question, index) => (
              <article
                key={question.questionId}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
  <p className="text-sm font-semibold text-indigo-300">
    Question {index + 1}
  </p>

  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
      {capitalize(question.category)}
    </span>

    {question.answer?.trim() ? (
      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
        Answered
      </span>
    ) : (
      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
        Skipped
      </span>
    )}
  </div>
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
                  <p className="mt-3 text-xs text-slate-500">
                    Saved: {new Date(question.answeredAt).toLocaleString()}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ACTION BUTTONS */}

        {/* ACTION BUTTONS */}

<div className="mt-10 flex flex-wrap gap-3 print:hidden">
  <button
    type="button"
    onClick={() => window.print()}
    disabled={!completed || !evaluation}
    className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
  >
    ↓ Download Performance Report
  </button>

  <button
    type="button"
    onClick={() => navigate("/interview/setup")}
    className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500"
  >
    Start Another Interview
  </button>

  <button
    type="button"
    onClick={() => navigate("/dashboard")}
    className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-indigo-400"
  >
    Go to Dashboard
  </button>

        </div>
      </div>
    </main>
  );
}

// =========================================================
// REUSABLE SUMMARY ITEM
// =========================================================

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

// =========================================================
// CONCEPT SUMMARY
// =========================================================

function ConceptSummary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

// =========================================================
// CONCEPT LIST
// =========================================================

function ConceptList({
  title,
  concepts,
  emptyMessage,
  type,
}: {
  title: string;
  concepts: string[];
  emptyMessage: string;
  type: "matched" | "missing";
}) {
  const isMatched = type === "matched";

  return (
    <div>
      <p
        className={`text-sm font-semibold ${
          isMatched ? "text-emerald-300" : "text-amber-300"
        }`}
      >
        {title}
      </p>

      {concepts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {concepts.map((concept, index) => (
            <li
              key={`${concept}-${index}`}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                isMatched
                  ? "bg-emerald-500/10 text-emerald-200"
                  : "bg-amber-500/10 text-amber-200"
              }`}
            >
              <span>{isMatched ? "✓" : "!"}</span>
              <span>{concept}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm italic text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

// =========================================================
// TEXT FORMATTING
// =========================================================

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

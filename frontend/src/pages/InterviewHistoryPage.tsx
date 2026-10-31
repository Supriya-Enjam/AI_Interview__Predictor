
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getInterviewHistory,
  type InterviewHistoryItem,
} from "../services/interviewApi";

interface InterviewHistoryPageProps {
  token: string;
}

export default function InterviewHistoryPage({
  token,
}: InterviewHistoryPageProps) {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [categoryFilter, setCategoryFilter] = useState("all");
const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) {
        setError("Please sign in to view your interview history.");
        setLoading(false);
        return;
      }

      try {
        const history = await getInterviewHistory(token);

        if (active) setInterviews(history);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load interview history."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
    }, [token]);

  // Search, filter and sort interview history.
  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((item) => {
        const matchesSearch = (item.targetRole || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase().trim());

        const matchesStatus =
          statusFilter === "all" ||
          item.status === statusFilter;

        const matchesCategory =
          categoryFilter === "all" ||
          (item.category || "").toLowerCase() === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();

        return sortOrder === "newest"
          ? dateB - dateA
          : dateA - dateB;
      });
  }, [interviews, searchTerm, statusFilter, categoryFilter, sortOrder]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-indigo-300 hover:text-indigo-200"
        >
          ← Back to Dashboard
        </button>

        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            InterviewIQ
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Interview History
          </h1>
          <p className="mt-3 text-slate-400">
            Review your previous practice sessions and reopen completed results.
          </p>
        </header>

        {loading && (
          <p className="mt-8 text-slate-300">Loading your interviews...</p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {!loading && !error && interviews.length === 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-xl font-bold">No interviews yet</h2>
            <p className="mt-2 text-slate-400">
              Start a practice interview to see it listed here.
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

        {!loading && !error && interviews.length > 0 && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <SummaryCard
    label="Total Interviews"
    value={interviews.length}
  />

  <SummaryCard
    label="Completed"
    value={
      interviews.filter((item) => item.status === "completed").length
    }
  />

  <SummaryCard
    label="In Progress / Pending"
    value={
      interviews.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "in_progress"
      ).length
    }
  />

  <SummaryCard
    label="Questions Skipped"
    value={interviews.reduce(
      (total, item) =>
        total +
        Math.max(0, item.totalQuestions - item.answeredQuestions),
      0
    )}
  />
</div>
                        <section className="mt-8 space-y-4">

              {/* Search and filters */}
              <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-4">

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by target role..."
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                >
                  <option value="all">All categories</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="hr">HR</option>
                  <option value="mixed">Mixed</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              <p className="text-sm text-slate-400">
                Showing {filteredInterviews.length} of {interviews.length} interviews
              </p>

              {filteredInterviews.map((item) => {
                const isCompleted = item.status === "completed";

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h2 className="text-xl font-bold">
                          {item.targetRole}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                          {capitalize(item.category)} ·{" "}
                          {capitalize(item.difficulty)} · {item.duration} min
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          Created: {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-2">
                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-300"
                              : item.status === "in_progress"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {capitalize(item.status.replace("_", " "))}
                        </span>

                        {isCompleted && typeof item.evaluation?.percentage === "number" && (
                          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
                            Score: {item.evaluation.percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
  <span className="text-emerald-300">
    Answered: {item.answeredQuestions}
  </span>

  <span className="text-amber-300">
    Skipped:{" "}
    {Math.max(0, item.totalQuestions - item.answeredQuestions)}
  </span>

  <span className="text-slate-400">
    Total: {item.totalQuestions}
  </span>
</div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            isCompleted
                              ? `/interview/${encodeURIComponent(item.id)}/results`
                              : `/interview/${encodeURIComponent(item.id)}`
                          )
                        }
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold hover:bg-indigo-500"
                      >
                        {isCompleted ? "View Results" : "Open Interview"}
                      </button>
                    </div>
                  </article>
                );
                            })}

              {filteredInterviews.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="font-semibold text-slate-200">
                    No matching interviews found
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Try changing your search or filters.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
                      setSortOrder("newest");
                    }}
                    className="mt-4 text-sm font-semibold text-indigo-300 hover:text-white"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              className="mt-8 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
            >
              Start Another Interview
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
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

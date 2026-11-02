
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  addQuestionToBank,
  deleteQuestionFromBank,
  exportQuestionBank,
  getQuestionBank,
  getQuestionBankStats,
  updateQuestionInBank,
  type QuestionBankAdminItem,
  type QuestionBankStats,
   type QuestionBankPagination,
} from "../services/adminApi";

interface AdminQuestionBankPageProps {
  token: string;
}

export default function AdminQuestionBankPage({
  token,
}: AdminQuestionBankPageProps) {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionBankAdminItem[]>([]);
  const [stats, setStats] = useState<QuestionBankStats | null>(null);
  const [pagination, setPagination] =
  useState<QuestionBankPagination | null>(null);

const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "uploaded" | "manual"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );

  const [category, setCategory] = useState("technical");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [questionText, setQuestionText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [conceptText, setConceptText] = useState("");
  const [roleContext, setRoleContext] = useState("");

  useEffect(() => {
    let active = true;

    async function loadQuestions() {
      if (!token) {
        setError("Admin access is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [data, bankStats] = await Promise.all([
          getQuestionBank(token, {
  category: filterCategory,
  difficulty: filterDifficulty,
  search: searchQuery,
  source: sourceFilter,
  page: currentPage,
  limit: pageSize,
}),
          getQuestionBankStats(token),
        ]);

        if (active) {
          setQuestions(data.questions);
          setPagination(data.pagination);
          setStats(bankStats);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the question bank."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadQuestions();

    return () => {
      active = false;
    };
  }, [
    filterCategory,
    filterDifficulty,
    searchQuery,
    sourceFilter,
    currentPage,
    pageSize,
    token,
  ]);

  function resetForm() {
    setEditingQuestionId(null);
    setQuestionText("");
    setSkillsText("");
    setConceptText("");
    setRoleContext("");
    setCategory("technical");
    setDifficulty("intermediate");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!questionText.trim()) {
      setError("Enter a question before submitting it to the bank.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        category,
        difficulty,
        questionText: questionText.trim(),
        skills: skillsText
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        expectedConcepts: conceptText
          .split(",")
          .map((concept) => concept.trim())
          .filter(Boolean),
        roleContext: roleContext.trim() || undefined,
      };

      if (editingQuestionId) {
        const question = await updateQuestionInBank(
          token,
          editingQuestionId,
          payload
        );

        setQuestions((current) =>
          current.map((item) =>
            item._id === editingQuestionId ? question : item
          )
        );
      } else {
        const question = await addQuestionToBank(token, payload);
        setQuestions((current) => [question, ...current]);
      }

      const refreshedStats = await getQuestionBankStats(token);
      setStats(refreshedStats);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the question to the bank."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditQuestion(question: QuestionBankAdminItem) {
    if (question.sourceDatasetId) {
      setError(
        "Uploaded dataset questions cannot be edited manually. Update the source dataset instead."
      );
      return;
    }

    setEditingQuestionId(question._id);
    setCategory(question.category);
    setDifficulty(question.difficulty);
    setQuestionText(question.questionText);
    setSkillsText(question.skills.join(", "));
    setConceptText(question.expectedConcepts.join(", "));
    setRoleContext(question.roleContext ?? "");
    setError("");
  }

  async function handleDeleteQuestion(question: QuestionBankAdminItem) {
    if (question.sourceDatasetId) {
      setError(
        "Uploaded dataset questions cannot be deleted manually. Deactivate or delete the source dataset instead."
      );
      return;
    }

    const confirmed = window.confirm(
      "Remove this question from the bank?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteQuestionFromBank(token, question._id);

      setQuestions((current) =>
        current.filter((item) => item._id !== question._id)
      );

      const refreshedStats = await getQuestionBankStats(token);
      setStats(refreshedStats);

      if (editingQuestionId === question._id) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove the question from the bank."
      );
    }
  }

  async function handleExport() {
    try {
      const exported = await exportQuestionBank(token);

      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = "interviewiq-question-bank.json";
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to export the question bank."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Question bank
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 font-semibold text-emerald-200 hover:bg-emerald-500/15"
            >
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:border-indigo-400"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* STATISTICS */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Total
            </p>
            <p className="mt-3 text-3xl font-extrabold text-white">
              {stats?.totalQuestions ?? questions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Categories
            </p>
            <p className="mt-3 text-lg font-bold text-indigo-200">
              {Object.keys(stats?.byCategory ?? {}).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Difficulty mix
            </p>
            <p className="mt-3 text-lg font-bold text-emerald-200">
              {Object.keys(stats?.byDifficulty ?? {}).join(" / ") || "-"}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Search
              </label>
              <input
                value={searchQuery}
                onChange={(event) => {
  setSearchQuery(event.target.value);
  setCurrentPage(1);
}}
                placeholder="Search questions or skills"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(event) => {
  setFilterCategory(event.target.value);
  setCurrentPage(1);
}}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              >
                <option value="all">All categories</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="hr">HR</option>
                <option value="situational">Situational</option>
                <option value="coding">Coding</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Difficulty
              </label>
              <select
                value={filterDifficulty}
                onChange={(event) => {
  setFilterDifficulty(event.target.value);
  setCurrentPage(1);
}}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Question source
              </label>
              <select
                value={sourceFilter}
                onChange={(event) => {
  setSourceFilter(
    event.target.value as "all" | "uploaded" | "manual"
  );
  setCurrentPage(1);
}}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              >
                <option value="all">All sources</option>
                <option value="uploaded">Uploaded datasets</option>
                <option value="manual">Manually created</option>
              </select>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
          {/* ADD / EDIT FORM */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              {editingQuestionId ? "Edit question" : "Add a question"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="hr">HR</option>
                  <option value="situational">Situational</option>
                  <option value="coding">Coding</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Question text
                </label>
                <textarea
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  placeholder="Enter a role-specific interview question..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Skills (comma-separated)
                </label>
                <input
                  value={skillsText}
                  onChange={(event) => setSkillsText(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  placeholder="Problem solving, communication"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Expected concepts (comma-separated)
                </label>
                <input
                  value={conceptText}
                  onChange={(event) => setConceptText(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  placeholder="trade-offs, stakeholder management"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Role context</label>
                <input
                  value={roleContext}
                  onChange={(event) => setRoleContext(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  placeholder="Optional context, e.g. backend engineer"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving
                    ? editingQuestionId
                      ? "Updating question..."
                      : "Saving question..."
                    : editingQuestionId
                      ? "Update question"
                      : "Add question"}
                </button>

                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:border-slate-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* QUESTION LIST */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Current bank</h2>
              <span className="text-sm text-slate-400">
                {questions.length} entries
              </span>
            </div>

            {loading ? (
              <p className="mt-5 text-slate-300">
                Loading question bank...
              </p>
            ) : questions.length === 0 ? (
              <p className="mt-5 text-slate-400">
                No saved questions match these filters.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {questions.map((question) => {
                  const isUploaded = Boolean(question.sourceDatasetId);

                  return (
                    <article
                      key={question._id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-200">
                          {question.category}
                        </span>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                          {question.difficulty}
                        </span>

                        {isUploaded ? (
                          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
                            Uploaded dataset
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                            Manual question
                          </span>
                        )}
                      </div>

                      {isUploaded && (
                        <p className="mt-2 text-xs text-sky-300">
                          Source dataset:{" "}
                          <span className="font-semibold">
                            {question.sourceDatasetName || "Dataset name unavailable"}
                          </span>
                        </p>
                      )}

                      <p className="mt-3 leading-6 text-slate-200">
                        {question.questionText}
                      </p>

                      {question.roleContext && (
                        <p className="mt-2 text-xs text-slate-400">
                          Context: {question.roleContext}
                        </p>
                      )}

                      {question.skills.length > 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          Skills: {question.skills.join(", ")}
                        </p>
                      )}

                      {question.expectedConcepts.length > 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          Concepts: {question.expectedConcepts.join(", ")}
                        </p>
                      )}

                      {isUploaded ? (
                        <p className="mt-4 text-xs text-slate-500">
                          This question is managed through its source dataset.
                          Edit or delete the source dataset to change its imported questions.
                        </p>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(question)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-400"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(question)}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
                            </div>
            )}

            {/* PAGINATION */}
            {!loading && pagination && (
              <div className="mt-6 border-t border-slate-800 pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    Showing{" "}
                    {pagination.totalQuestions === 0
                      ? 0
                      : (pagination.page - 1) * pagination.limit + 1}
                    {"–"}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.totalQuestions
                    )}{" "}
                    of {pagination.totalQuestions} questions
                  </p>

                                   <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      Questions per page:

                      <select
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage((page) => page - 1)
                      }
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>

                    <span className="text-sm text-slate-300">
                      Page {pagination.page} of{" "}
                      {pagination.totalPages || 1}
                    </span>

                    <button
                      type="button"
                      disabled={
                        currentPage >= pagination.totalPages
                      }
                      onClick={() =>
                        setCurrentPage((page) => page + 1)
                      }
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

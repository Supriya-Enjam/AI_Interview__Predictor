
import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  ClipboardList,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";

import {
  getAdminCandidates,
  type AdminCandidate,
  type CandidatePagination,
} from "../services/adminApi";

interface AdminCandidatesPageProps {
  token: string;
}

const AdminCandidatesPage: React.FC<AdminCandidatesPageProps> = ({
  token,
}) => {
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [pagination, setPagination] = useState<CandidatePagination | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminCandidates(token, {
        page,
        limit: 10,
        search,
      });

      setCandidates(result.candidates);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load candidate information."
      );
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const formatDate = (date?: string) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalCandidates = pagination?.totalCandidates ?? candidates.length;

  const totalInterviews = candidates.reduce(
    (total, candidate) => total + candidate.totalInterviews,
    0
  );

  const completedInterviews = candidates.reduce(
    (total, candidate) => total + candidate.completedInterviews,
    0
  );

  const statistics = [
    {
      title: "Total Candidates",
      value: totalCandidates,
      icon: Users,
      color: "text-blue-600",
      background: "bg-blue-100 dark:bg-blue-950",
    },
    {
      title: "Interviews on This Page",
      value: totalInterviews,
      icon: ClipboardList,
      color: "text-violet-600",
      background: "bg-violet-100 dark:bg-violet-950",
    },
    {
      title: "Completed on This Page",
      value: completedInterviews,
      icon: CheckCircle,
      color: "text-emerald-600",
      background: "bg-emerald-100 dark:bg-emerald-950",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-500">
            ADMINISTRATION
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Candidate Management
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View registered candidates and monitor their interview activity.
          </p>
        </div>

        <button
          onClick={() => void loadCandidates()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Candidate Directory
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Review candidate registrations, target job roles, interview
              participation and recent assessment results.
            </p>
          </div>

          <Users className="h-14 w-14 text-indigo-200 opacity-80" />
        </div>
      </div>

      {/* Statistics */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Candidate Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statistics.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.title}
                  </p>

                  <div className={`rounded-lg p-2 ${item.background}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                  {item.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Interview totals are calculated for the currently displayed page.
        </p>
      </section>

      {/* Search */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Search Candidates
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search by candidate name, email address or target job role.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search candidates..."
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5" />
            Unable to load candidates
          </div>

          <p className="mt-2 text-sm">{error}</p>

          <button
            onClick={() => void loadCandidates()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Candidate table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Registered Candidates
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Candidate registration and interview records
            </p>
          </div>

          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {totalCandidates} candidates
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
            Loading candidates...
          </div>
        ) : !error && candidates.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />

            <h3 className="mt-4 font-semibold text-slate-800 dark:text-white">
              No candidates found
            </h3>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {search
                ? "Try another name, email address or job role."
                : "Registered candidates will appear here."}
            </p>
          </div>
        ) : !error ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Candidate</th>
                    <th className="px-5 py-4 font-semibold">Target Role</th>
                    <th className="px-5 py-4 font-semibold">Registered</th>
                    <th className="px-5 py-4 font-semibold">Interviews</th>
                    <th className="px-5 py-4 font-semibold">Completed</th>
                    <th className="px-5 py-4 font-semibold">Latest Score</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {candidate.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {candidate.name}
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Mail className="h-3 w-3 shrink-0" />
                              {candidate.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                          <Target className="h-4 w-4 text-indigo-500" />
                          {candidate.targetRole || "Not specified"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                          <Calendar className="h-4 w-4" />
                          {formatDate(candidate.registeredAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {candidate.totalInterviews}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          {candidate.completedInterviews}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {candidate.latestInterview?.percentage != null ? (
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {candidate.latestInterview.percentage}%
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not evaluated
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Latest interview details */}
            <div className="border-t border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Latest Interview Activity
              </h3>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {candidates
                  .filter((candidate) => candidate.latestInterview)
                  .map((candidate) => {
                    const interview = candidate.latestInterview!;

                    return (
                      <div
                        key={candidate.id}
                        className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">
                          {candidate.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {interview.targetRole}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {interview.category}
                          </span>

                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {interview.difficulty}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(interview.createdAt)}
                          </span>

                          <span className="font-medium capitalize">
                            {interview.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {candidates.every((candidate) => !candidate.latestInterview) && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No interview activity is available for these candidates yet.
                </p>
              )}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
                {" · "}
                {pagination?.totalCandidates ?? candidates.length} candidates
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination?.totalPages ?? current, current + 1)
                    )
                  }
                  disabled={
                    loading ||
                    page >= (pagination?.totalPages ?? 1)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default AdminCandidatesPage;

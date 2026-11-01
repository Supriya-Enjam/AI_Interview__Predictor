
import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Filter,
} from "lucide-react";

import {
  getAdminInterviews,
  type AdminInterview,
  type AdminInterviewStats,
  type AdminInterviewStatus,
} from "../services/adminApi";

interface AdminInterviewManagementPageProps {
  token: string;
  onToast?: (message: string) => void;
}

const emptyStats: AdminInterviewStats = {
  totalInterviews: 0,
  pendingInterviews: 0,
  inProgressInterviews: 0,
  completedInterviews: 0,
  cancelledInterviews: 0,
};

const statusStyles: Record<AdminInterviewStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const formatStatus = (status: string) =>
  status.replace("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );

export const AdminInterviewManagementPage: React.FC<
  AdminInterviewManagementPageProps
> = ({ token, onToast }) => {
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [stats, setStats] = useState<AdminInterviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminInterviewStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getAdminInterviews(token, {
        page,
        limit: 10,
        search,
        status,
        category,
        difficulty,
      });

      setInterviews(response.interviews);
      setStats(response.stats);
      setTotalPages(response.pagination.totalPages || 1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load interviews.";

      onToast?.(message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, status, category, difficulty, onToast]);

  useEffect(() => {
    void loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    setPage(1);
  }, [search, status, category, difficulty]);

  const statCards = [
    {
      label: "Total Interviews",
      value: stats.totalInterviews,
      icon: ClipboardList,
      color: "text-indigo-600",
      background: "bg-indigo-50",
    },
    {
      label: "Pending",
      value: stats.pendingInterviews,
      icon: Clock,
      color: "text-amber-600",
      background: "bg-amber-50",
    },
    {
      label: "In Progress",
      value: stats.inProgressInterviews,
      icon: PlayCircle,
      color: "text-blue-600",
      background: "bg-blue-50",
    },
    {
      label: "Completed",
      value: stats.completedInterviews,
      icon: CheckCircle,
      color: "text-green-600",
      background: "bg-green-50",
    },
    {
      label: "Cancelled",
      value: stats.cancelledInterviews,
      icon: XCircle,
      color: "text-red-600",
      background: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor candidate interviews, progress, and performance.
          </p>
        </div>

        <button
          onClick={() => void loadInterviews()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>

                <div className={`rounded-lg p-3 ${card.background}`}>
                  <Icon className={card.color} size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={17} />
          Search and Filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate or role..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminInterviewStatus | "all")
            }
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="mixed">Mixed</option>
            <option value="hr">HR</option>
            <option value="situational">Situational</option>
            <option value="coding">Coding</option>
          </select>

          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Interview Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Candidate Interviews
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Interview records matching your selected filters.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading interview records...
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList
              size={36}
              className="mx-auto mb-3 text-gray-300"
            />
            <p className="font-medium text-gray-700">
              No interviews found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Target Role</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Difficulty</th>
                    <th className="px-5 py-3">Questions</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {interview.candidate?.name || "Unknown candidate"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {interview.candidate?.email || "No email available"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {interview.targetRole || "Not specified"}
                      </td>

                      <td className="px-5 py-4 capitalize text-gray-700">
                        {interview.category}
                      </td>

                      <td className="px-5 py-4 capitalize text-gray-700">
                        {interview.difficulty}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {interview.answeredQuestionCount}/
                        {interview.questionCount}
                      </td>

                      <td className="px-5 py-4">
                        {interview.percentage !== null &&
                        interview.percentage !== undefined ? (
                          <span className="font-semibold text-gray-900">
                            {interview.percentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusStyles[interview.status]
                          }`}
                        >
                          {formatStatus(interview.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminInterviewManagementPage;

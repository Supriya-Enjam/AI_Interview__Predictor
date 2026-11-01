
import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle,
  ClipboardList,
  Database,
  Gauge,
  RefreshCw,
  Users,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getModelMonitoring,
  type ModelMonitoringData,
} from "../services/adminApi";

interface AdminDashboardPageProps {
  token: string;
}

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  token,
}) => {
  const navigate = useNavigate();

  const [data, setData] = useState<ModelMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getModelMonitoring(token);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load administrator dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [token]);

  const adminPages = [
    {
      title: "Candidate Management",
      description: "View and manage registered candidates.",
      icon: Users,
      path: "/admin/candidates",
    },
    {
      title: "Question Bank",
      description: "Manage technical, HR and behavioral questions.",
      icon: ClipboardList,
      path: "/admin/questions",
    },
    {
      title: "Model Monitoring",
      description: "Monitor evaluation scores and rubric performance.",
      icon: Gauge,
      path: "/admin/model-monitoring",
    },
    {
      title: "Dataset Management",
      description: "Manage interview datasets for future model training.",
      icon: Database,
      path: "/admin/datasets",
    },
    {
      title: "Interview Management",
      description: "Review interview sessions and evaluation activity.",
      icon: Activity,
      path: "/admin/interviews",
    },
    {
      title: "Platform Analytics",
      description: "Explore overall platform usage and trends.",
      icon: BrainCircuit,
      path: "/admin/analytics",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-500">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
        Loading administrator dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          Unable to load dashboard
        </div>

        <p className="mt-2 text-sm">
          {error || "Dashboard data is unavailable."}
        </p>

        <button
          onClick={() => void loadDashboard()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const statistics = [
    {
      title: "Total Candidates",
      value: data.activity.totalUsers,
      icon: Users,
      color: "text-blue-600",
      background: "bg-blue-100 dark:bg-blue-950",
    },
    {
      title: "Total Interviews",
      value: data.activity.totalInterviews,
      icon: ClipboardList,
      color: "text-violet-600",
      background: "bg-violet-100 dark:bg-violet-950",
    },
    {
      title: "Completed Interviews",
      value: data.activity.completedInterviews,
      icon: CheckCircle,
      color: "text-emerald-600",
      background: "bg-emerald-100 dark:bg-emerald-950",
    },
    {
      title: "Evaluated Answers",
      value: data.activity.evaluatedAnswers,
      icon: Activity,
      color: "text-orange-600",
      background: "bg-orange-100 dark:bg-orange-950",
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
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage InterviewIQ and monitor overall platform activity.
          </p>
        </div>

        <button
          onClick={() => void loadDashboard()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Welcome to InterviewIQ Administration
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Manage candidates, interview questions, datasets and evaluation
              performance from one central workspace.
            </p>
          </div>

          <BrainCircuit className="h-14 w-14 text-indigo-200 opacity-80" />
        </div>
      </div>

      {/* Statistics */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Platform Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      {/* Evaluation overview */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Gauge className="h-6 w-6" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Evaluation Overview
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Current evaluation activity
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Evaluated Interviews
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {data.activity.evaluatedInterviews}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Average Answer Score
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {data.performance.averageAnswerScore}
                <span className="text-sm font-medium text-slate-400">
                  {" "}/ {data.performance.averageMaximumScore}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/model-monitoring")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View Model Monitoring
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Evaluation System
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {data.system.name}
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Evaluation type
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {data.system.type}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Evaluation method
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {data.system.evaluationMethod}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Trained ML model
              </span>
              <span className="text-sm font-semibold text-amber-600">
                {data.system.trainedMachineLearningModel ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Admin modules */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Administration Modules
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {adminPages.map((page) => {
            const Icon = page.icon;

            return (
              <button
                key={page.title}
                onClick={() => navigate(page.path)}
                className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <div className="rounded-lg bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {page.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {page.description}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Open module
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Metrics clarification */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>Evaluation note:</strong> {data.metricsNote}
      </div>
    </div>
  );
};

export default AdminDashboardPage;

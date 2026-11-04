
import React, { useEffect, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle,
  ClipboardList,
  Users,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Database,
  AlertTriangle,
} from "lucide-react";

import {
  getModelMonitoring,
  getDatasetQualityReport,
  type ModelMonitoringData,
  type DatasetQualityReport,
} from "../services/adminApi";

interface AdminModelMonitoringPageProps {
  token: string;
}

const rubricLabels = [
  { key: "completeness", label: "Completeness", max: 5 },
  { key: "structure", label: "Structure", max: 5 },
  { key: "specificity", label: "Specificity", max: 5 },
  { key: "relevance", label: "Relevance", max: 5 },
  { key: "communication", label: "Communication", max: 5 },
] as const;

export const AdminModelMonitoringPage: React.FC<
  AdminModelMonitoringPageProps
> = ({ token }) => {
  const [monitoring, setMonitoring] =
    useState<ModelMonitoringData | null>(null);

  const [datasetQuality, setDatasetQuality] =
    useState<DatasetQualityReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [datasetQualityError, setDatasetQualityError] = useState("");

  // =========================================================
  // LOAD MONITORING AND DATASET QUALITY
  // =========================================================

  const loadMonitoring = async () => {
    try {
      setLoading(true);
      setError("");
      setDatasetQualityError("");

      // Load existing model monitoring information.
      const result = await getModelMonitoring(token);
      setMonitoring(result);

      // Load dataset quality report independently.
      // Failure here will not break the existing monitoring dashboard.
      try {
        const qualityResult = await getDatasetQualityReport(token);
        setDatasetQuality(qualityResult);
      } catch (qualityErr) {
        setDatasetQuality(null);

        setDatasetQualityError(
          qualityErr instanceof Error
            ? qualityErr.message
            : "Unable to load dataset quality report."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load model monitoring data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMonitoring();
  }, [token]);

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-500">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
        Loading model monitoring...
      </div>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================

  if (error || !monitoring) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          Unable to load monitoring dashboard
        </div>

        <p className="mt-2 text-sm">
          {error || "Monitoring data is unavailable."}
        </p>

        <button
          onClick={() => void loadMonitoring()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // =========================================================
  // ACTIVITY STATISTICS
  // =========================================================

  const statCards = [
    {
      label: "Total Candidates",
      value: monitoring.activity.totalUsers,
      icon: Users,
    },
    {
      label: "Total Interviews",
      value: monitoring.activity.totalInterviews,
      icon: ClipboardList,
    },
    {
      label: "Completed Interviews",
      value: monitoring.activity.completedInterviews,
      icon: CheckCircle,
    },
    {
      label: "Evaluated Answers",
      value: monitoring.activity.evaluatedAnswers,
      icon: Activity,
    },
  ];

  // =========================================================
  // DATASET QUALITY CALCULATIONS
  // =========================================================

  const missingValueCount = datasetQuality
    ? Object.values(datasetQuality.missingValues || {}).reduce(
        (total, count) => total + Number(count || 0),
        0
      )
    : 0;

  const datasetProgress = datasetQuality
    ? Math.min(
        100,
        datasetQuality.minimumTrainingRecords > 0
          ? (datasetQuality.totalRecords /
              datasetQuality.minimumTrainingRecords) *
              100
          : 0
      )
    : 0;

  // =========================================================
  // DISTRIBUTION COMPONENT
  // =========================================================

  const renderDistribution = (
    title: string,
    distribution: Record<string, number>
  ) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">{title}</h3>

      {Object.keys(distribution || {}).length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No distribution data available.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {Object.entries(distribution).map(([name, count]) => {
            const percentage =
              datasetQuality && datasetQuality.totalRecords > 0
                ? (count / datasetQuality.totalRecords) * 100
                : 0;

            return (
              <div key={name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="capitalize">
                    {name.replace(/_/g, " ")}
                  </span>

                  <span className="text-slate-500 dark:text-slate-400">
                    {count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, percentage))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Page heading and refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Model Monitoring</h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor InterviewIQ evaluation activity and rubric performance.
          </p>
        </div>

        <button
          onClick={() => void loadMonitoring()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Evaluation system information */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Brain className="h-6 w-6" />
          </div>

          <div>
            <h2 className="font-semibold">{monitoring.system.name}</h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {monitoring.system.type}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Method: {monitoring.system.evaluationMethod}
              </span>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
  Rubric evaluator uses ML:{" "}
  {monitoring.system.trainedMachineLearningModel
    ? "Yes"
    : "No"}
</span>
            </div>
          </div>
        </div>
      </section>

      {/* Activity statistics */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">System Activity</h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>

                  <Icon className="h-5 w-5 text-indigo-500" />
                </div>

                <p className="mt-3 text-3xl font-bold">
                  {card.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Evaluation performance */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Evaluation Performance</h2>

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Average answer score
          </p>

          <p className="mt-1 text-3xl font-bold">
            {monitoring.performance.averageAnswerScore}

            <span className="text-lg font-medium text-slate-400">
              {" "}/ {monitoring.performance.averageMaximumScore}
            </span>
          </p>

          <div className="mt-5 space-y-3">
            {rubricLabels.map((item) => {
              const score =
                monitoring.performance.rubricAverages[item.key] ?? 0;

              const percentage = Math.min(
                100,
                Math.max(0, (score / item.max) * 100)
              );

              return (
                <div key={item.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.label}</span>

                    <span className="text-slate-500 dark:text-slate-400">
                      {score.toFixed(2)} / {item.max}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Evaluation Summary</h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Evaluated interviews
              </span>

              <strong>{monitoring.activity.evaluatedInterviews}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Completed interviews
              </span>

              <strong>{monitoring.activity.completedInterviews}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Evaluation methods recorded
              </span>

              <strong>{monitoring.evaluationMethods.length}</strong>
            </div>

            {monitoring.evaluationMethods.map((item) => (
              <div
                key={item.method || "unknown"}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-500 dark:text-slate-400">
                  {item.method || "Unspecified"}
                </span>

                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent evaluations */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 p-5 dark:border-slate-800">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold">Recent Evaluations</h2>
        </div>

        {monitoring.recentEvaluations.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No evaluated interviews are available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Target Role</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Difficulty</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Evaluated At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monitoring.recentEvaluations.map((item) => (
                  <tr key={item._id}>
                    <td className="px-5 py-4">
                      {item.targetRole || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {item.category || "—"}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {item.difficulty || "—"}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {typeof item.evaluation?.percentage === "number"
                        ? `${item.evaluation.percentage.toFixed(1)}%`
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {item.evaluation?.evaluatedAt
                        ? new Date(
                            item.evaluation.evaluatedAt
                          ).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          DATASET QUALITY REPORT
      ===================================================== */}

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Database className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Dataset Quality Report
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review training data quality, distributions and readiness.
            </p>
          </div>
        </div>

        {datasetQualityError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-5 w-5" />
              Unable to load dataset quality report
            </div>

            <p className="mt-2">{datasetQualityError}</p>
          </div>
        )}

        {!datasetQuality && !datasetQualityError && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Dataset quality information is not available.
          </div>
        )}

        {datasetQuality && (
          <>
            {/* Quality summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Training Records",
                  value: datasetQuality.totalRecords,
                  icon: Database,
                },
                {
                  label: "Minimum Required",
                  value: datasetQuality.minimumTrainingRecords,
                  icon: ClipboardList,
                },
                {
                  label: "Duplicate Pairs",
                  value: datasetQuality.duplicateQuestionAnswerPairs,
                  icon: AlertTriangle,
                },
                {
                  label: "Missing Values",
                  value: missingValueCount,
                  icon: AlertCircle,
                },
              ].map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {card.label}
                      </p>

                      <Icon className="h-5 w-5 text-indigo-500" />
                    </div>

                    <p className="mt-3 text-3xl font-bold">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Training readiness */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Training Readiness</h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Preliminary dataset quality checks
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    datasetQuality.trainingReady
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {datasetQuality.trainingReady
                    ? "Basic checks passed"
                    : "Not ready"}
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Record progress
                  </span>

                  <strong>
                    {datasetQuality.totalRecords} /{" "}
                    {datasetQuality.minimumTrainingRecords}
                  </strong>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${datasetProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dataset distributions */}
            <div className="grid gap-4 lg:grid-cols-3">
              {renderDistribution(
                "Role Distribution",
                datasetQuality.roleDistribution
              )}

              {renderDistribution(
                "Category Distribution",
                datasetQuality.categoryDistribution
              )}

              {renderDistribution(
                "Difficulty Distribution",
                datasetQuality.difficultyDistribution
              )}
            </div>

            {/* Score statistics */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="font-semibold">Score Statistics</h3>
              </div>

              {Object.keys(datasetQuality.scoreStatistics || {}).length ===
              0 ? (
                <p className="p-5 text-sm text-slate-500 dark:text-slate-400">
                  No score statistics available.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-medium">Score</th>
                        <th className="px-5 py-3 font-medium">Minimum</th>
                        <th className="px-5 py-3 font-medium">Maximum</th>
                        <th className="px-5 py-3 font-medium">Average</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(
                        datasetQuality.scoreStatistics
                      ).map(([name, stats]) => (
                        <tr key={name}>
                          <td className="px-5 py-3 capitalize">
                            {name.replace(/([A-Z])/g, " $1")}
                          </td>

                          <td className="px-5 py-3">
                            {stats.minimum ?? "—"}
                          </td>

                          <td className="px-5 py-3">
                            {stats.maximum ?? "—"}
                          </td>

                          <td className="px-5 py-3">
                            {stats.average !== null
                              ? stats.average.toFixed(2)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dataset warnings */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
              <h3 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                Dataset Warnings
              </h3>

              {datasetQuality.warnings.length === 0 ? (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                  No dataset warnings were reported.
                </p>
              ) : (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-800 dark:text-amber-300">
                  {datasetQuality.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              These are preliminary dataset quality checks. Passing them
              does not prove that the dataset is representative or that a
              machine-learning model has been trained or validated.
            </p>
          </>
        )}
      </section>

      {/* Metrics explanation */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>Metrics note:</strong> {monitoring.metricsNote}
      </div>
    </div>
  );
};

export default AdminModelMonitoringPage;

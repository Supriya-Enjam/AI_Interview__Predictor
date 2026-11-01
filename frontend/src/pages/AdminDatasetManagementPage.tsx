
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAdminDataset,
  getAdminDatasets,
  updateAdminDatasetStatus,
  uploadAdminDataset,
  type AdminDataset,
  type DatasetStats,
  type DatasetStatus,
} from "../services/adminApi";

interface AdminDatasetManagementPageProps {
  token: string;
}

const initialStats: DatasetStats = {
  totalDatasets: 0,
  activeDatasets: 0,
  inactiveDatasets: 0,
  totalRecords: 0,
};

export default function AdminDatasetManagementPage({
  token,
}: AdminDatasetManagementPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<AdminDataset[]>([]);
  const [stats, setStats] = useState<DatasetStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    DatasetStatus | "all"
  >("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadDatasets() {
    if (!token) {
      setError("Admin access is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getAdminDatasets(token, {
        page,
        limit: 8,
        search: searchQuery,
        status: statusFilter,
      });

      setDatasets(response.datasets);
      setStats(response.stats);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load datasets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDatasets();
    // loadDatasets is intentionally triggered when these filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, searchQuery, statusFilter]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "csv" && extension !== "json") {
      setError("Only CSV and JSON files are supported.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function resetUploadForm() {
    setName("");
    setDescription("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Enter a dataset name.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a CSV or JSON file to upload.");
      return;
    }

    setSaving(true);

    try {
      await uploadAdminDataset(token, {
        name: name.trim(),
        description: description.trim(),
        file: selectedFile,
      });

      setSuccess("Dataset uploaded successfully.");
      resetUploadForm();
      setPage(1);

      const response = await getAdminDatasets(token, {
        page: 1,
        limit: 8,
        search: searchQuery,
        status: statusFilter,
      });

      setDatasets(response.datasets);
      setStats(response.stats);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload the dataset."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(dataset: AdminDataset) {
    const nextStatus: DatasetStatus =
      dataset.status === "active" ? "inactive" : "active";

    setError("");
    setSuccess("");
    setUpdatingId(dataset.id);

    try {
      await updateAdminDatasetStatus(token, dataset.id, nextStatus);

      setSuccess(
        `Dataset "${dataset.name}" is now ${nextStatus}.`
      );

      await loadDatasets();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update dataset status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(dataset: AdminDataset) {
    const confirmed = window.confirm(
      `Permanently delete "${dataset.name}" and its uploaded file? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(dataset.id);

    try {
      await deleteAdminDataset(token, dataset.id);

      setSuccess(`Dataset "${dataset.name}" deleted successfully.`);

      const response = await getAdminDatasets(token, {
        page,
        limit: 8,
        search: searchQuery,
        status: statusFilter,
      });

      if (
        response.datasets.length === 0 &&
        page > 1
      ) {
        setPage((current) => current - 1);
      } else {
        setDatasets(response.datasets);
        setStats(response.stats);
        setTotalPages(Math.max(1, response.pagination.totalPages));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the dataset."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getUploaderName(dataset: AdminDataset) {
    if (
      typeof dataset.uploadedBy === "object" &&
      dataset.uploadedBy !== null
    ) {
      return dataset.uploadedBy.name || dataset.uploadedBy.email || "Admin";
    }

    return "Admin";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Dataset management
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Upload, organize and manage interview evaluation datasets.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:border-indigo-400"
          >
            ← Dashboard
          </button>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Total datasets
            </p>
            <p className="mt-3 text-3xl font-extrabold text-white">
              {stats.totalDatasets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Active datasets
            </p>
            <p className="mt-3 text-3xl font-extrabold text-emerald-300">
              {stats.activeDatasets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Inactive datasets
            </p>
            <p className="mt-3 text-3xl font-extrabold text-amber-300">
              {stats.inactiveDatasets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Total records
            </p>
            <p className="mt-3 text-3xl font-extrabold text-indigo-300">
              {stats.totalRecords.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Upload form */}
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Upload a dataset</h2>
            <p className="mt-1 text-sm text-slate-400">
              Supported formats: CSV and JSON. Maximum file size: 5 MB.
            </p>
          </div>

          <form onSubmit={handleUpload} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Dataset name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="e.g. Technical Interview Questions"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Description
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                placeholder="Briefly describe this dataset"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-semibold">
                Dataset file
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileChange}
                className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-500"
              />

              {selectedFile && (
                <p className="mt-2 text-xs text-emerald-300">
                  Selected: {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Uploading dataset..." : "Upload dataset"}
              </button>

              <button
                type="button"
                onClick={resetUploadForm}
                disabled={saving}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:border-slate-500 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        {/* Dataset list */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Uploaded datasets</h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage dataset availability and stored files.
              </p>
            </div>

            <span className="text-sm text-slate-400">
              {datasets.length} shown
            </span>
          </div>

          {/* Filters */}
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Search
              </label>
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search dataset name or filename"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as DatasetStatus | "all");
                  setPage(1);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-300">
              Loading datasets...
            </p>
          ) : datasets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
              <p className="font-semibold text-slate-200">
                No datasets found
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Upload a CSV or JSON dataset, or adjust your search filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <article
                  key={dataset.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {dataset.name}
                        </h3>

                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-indigo-200">
                          {dataset.fileType}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                            dataset.status === "active"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {dataset.status}
                        </span>
                      </div>

                      {dataset.description && (
                        <p className="mt-2 text-sm text-slate-300">
                          {dataset.description}
                        </p>
                      )}

                      <p className="mt-2 break-all text-xs text-slate-400">
                        File: {dataset.originalFileName}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                        <span>
                          Records:{" "}
                          <strong className="text-slate-200">
                            {dataset.recordCount.toLocaleString("en-IN")}
                          </strong>
                        </span>
                        <span>
                          Uploaded: {formatDate(dataset.createdAt)}
                        </span>
                        <span>
                          By: {getUploaderName(dataset)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(dataset)}
                        disabled={
                          updatingId === dataset.id ||
                          deletingId === dataset.id
                        }
                        className="rounded-lg border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/10 disabled:opacity-50"
                      >
                        {updatingId === dataset.id
                          ? "Updating..."
                          : dataset.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(dataset)}
                        disabled={
                          deletingId === dataset.id ||
                          updatingId === dataset.id
                        }
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === dataset.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
              <p className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

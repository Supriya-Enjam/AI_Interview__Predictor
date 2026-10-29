
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyProfile,
  updateMyProfile,
  type AuthUser,
} from "../services/authApi";

interface ProfilePageProps {
  token: string;
}

export default function ProfilePage({ token }: ProfilePageProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const result = await getMyProfile(token);

        if (!cancelled) {
          setUser(result.user);
          setName(result.user.name);
          setTargetRole(result.user.targetRole ?? "");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!token) {
      setError("Your session is missing. Please sign in again.");
      setLoading(false);
    } else {
      void loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (name.trim().length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    if (targetRole.trim().length > 100) {
      setError("Your target role cannot exceed 100 characters.");
      return;
    }

    setSaving(true);

    try {
      const result = await updateMyProfile(token, {
        name: name.trim(),
        targetRole: targetRole.trim(),
      });

      setUser(result.user);
      setName(result.user.name);
      setTargetRole(result.user.targetRole ?? "");
      setSuccess("Your profile has been updated successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading your profile...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Profile unavailable</h1>
          <p className="mt-4 text-sm text-red-300">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold"
          >
            Return to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xl font-extrabold"
          >
            Interview<span className="text-indigo-400">IQ</span>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-indigo-400"
          >
            ← Dashboard
          </button>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            Candidate account
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">
            My profile
          </h1>
          <p className="mt-3 leading-7 text-slate-400">
            Keep your details up to date so your interview
            preparation can be tailored to your career goals.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={user.email}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-slate-400"
              />
              <p className="mt-2 text-xs text-slate-500">
                Your email is read-only on this page.
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-role"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Target job role
              </label>
              <input
                id="profile-role"
                type="text"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                maxLength={100}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. Software Engineer, Data Analyst"
              />
              <p className="mt-2 text-xs text-slate-500">
                Enter the role you want to prepare for.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          InterviewIQ · Your information is associated with your account.
        </p>
      </div>
    </main>
  );
}

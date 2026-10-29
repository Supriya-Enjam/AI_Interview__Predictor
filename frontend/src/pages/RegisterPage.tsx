
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, Eye, EyeOff } from "lucide-react";
import { registerUser } from "../services/authApi";

interface RegisterPageProps {
  onRegisterSuccess: (
    token: string,
    user: {
      id: string;
      name: string;
      email: string;
      role: "candidate" | "admin";
      targetRole: string;
    }
  ) => void;
}

export default function RegisterPage({
  onRegisterSuccess,
}: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      onRegisterSuccess(result.token, result.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-10 md:grid-cols-2">
        <section className="hidden md:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500 p-3">
              <BrainCircuit size={28} />
            </div>
            <span className="text-2xl font-bold">InterviewIQ</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight">
            Your next interview starts with
            <span className="block text-indigo-400">better preparation.</span>
          </h1>

          <p className="mt-5 max-w-md text-slate-400">
            Create your account to practise interview questions, evaluate
            your answers, and track your preparation progress.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-2 font-bold md:hidden">
            <BrainCircuit className="text-indigo-400" />
            InterviewIQ
          </div>

          <h2 className="text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-sm text-slate-400">
            Start preparing for your next interview.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm">
                Password
              </label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-indigo-400">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="px-4 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

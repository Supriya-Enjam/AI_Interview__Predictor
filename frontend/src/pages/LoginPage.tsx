
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  GoogleLogin,
  type CredentialResponse,
} from "@react-oauth/google";
import {
  loginUser,
  verifyLoginOtp,
  loginWithGoogle,
} from "../services/authApi";

interface LoginPageProps {
  onLoginSuccess: (
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

export default function LoginPage({
  onLoginSuccess,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await loginUser({
        email: email.trim(),
        password,
      });

      if (result.requiresOtp && result.challengeId) {
        setChallengeId(result.challengeId);
        setOtp("");
        setOtpStep(true);
        setMessage(
          result.message ||
            "A verification code has been sent to your email."
        );
      } else {
        setError(
          "The server did not return an OTP challenge. Please try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const result = await verifyLoginOtp(challengeId, otp);
      onLoginSuccess(result.token, result.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify the code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(
    response: CredentialResponse
  ) {
    setError("");
    setMessage("");

    if (!response.credential) {
      setError(
        "Google did not return a valid credential. Please try again."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await loginWithGoogle(response.credential);
      onLoginSuccess(result.token, result.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in with Google."
      );
    } finally {
      setLoading(false);
    }
  }

  function returnToLogin() {
    setOtpStep(false);
    setChallengeId("");
    setOtp("");
    setError("");
    setMessage("");
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
            Turn practice into
            <span className="block text-indigo-400">
              interview confidence.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-slate-400">
            Practice interview questions, understand your strengths,
            and prepare for your target role with AI-powered feedback.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 md:hidden">
            <div className="flex items-center gap-2 font-bold">
              <BrainCircuit className="text-indigo-400" />
              InterviewIQ
            </div>
          </div>

          {otpStep ? (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                <ShieldCheck size={30} />
              </div>

              <h2 className="text-3xl font-bold">Verify your email</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter the six-digit code sent to{" "}
                <span className="font-medium text-slate-200">
                  {email.trim()}
                </span>
                . The code expires in five minutes.
              </p>

              <form
                onSubmit={handleVerifyOtp}
                className="mt-8 space-y-5"
              >
                <div>
                  <label htmlFor="otp" className="mb-2 block text-sm">
                    Email verification code
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-indigo-400"
                  />
                </div>

                {message && (
                  <p
                    role="status"
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                  >
                    {message}
                  </p>
                )}

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
                  disabled={loading || otp.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify and sign in"}
                  {!loading && <ArrowRight size={18} />}
                </button>

                <button
                  type="button"
                  onClick={returnToLogin}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Back to login
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold">Welcome back</h2>

              <p className="mt-2 text-sm text-slate-400">
                Sign in to continue your interview preparation.
              </p>

              {/* Google sign-in button */}
              <div className="mt-6">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() =>
                      setError(
                        "Google sign-in was unsuccessful. Please try again."
                      )
                    }
                    text="continue_with"
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    width="320"
                  />
                </div>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-700" />
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Or continue with email
                  </span>
                  <div className="h-px flex-1 bg-slate-700" />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              <form onSubmit={handleLogin} className="mt-4 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm">
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm">
                    Password
                  </label>

                  <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-indigo-400">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="px-4 text-slate-400 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending verification code..." : "Continue"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            {!otpStep && (
              <>
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Create account
                </Link>
              </>
            )}
          </p>

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            {otpStep ? (
              <>
                <Mail size={14} />
                Check your inbox and spam folder.
              </>
            ) : (
              "Your interview preparation journey starts here."
            )}
          </p>
        </section>
      </div>
    </main>
  );
}

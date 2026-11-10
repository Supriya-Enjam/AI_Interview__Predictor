
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Sun, Moon } from "lucide-react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import InterviewSetupPage from "./pages/InterviewSetupPage";
import InterviewSessionPage from "./pages/InterviewSessionPage";
import InterviewResultsPage from "./pages/InterviewResultsPage";
import InterviewHistoryPage from "./pages/InterviewHistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminQuestionBankPage from "./pages/AdminQuestionBankPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminCandidatesPage from "./pages/AdminCandidatesPage";
import AdminModelMonitoringPage from "./pages/AdminModelMonitoringPage";
import AdminDatasetManagementPage from "./pages/AdminDatasetManagementPage";
import AdminInterviewManagementPage from "./pages/AdminInterviewManagementPage";
import ResumeInterviewPage from "./pages/ResumeInterviewPage";
import DashboardLayout from "./components/DashboardLayout";
import LearningPlanPage from "./pages/LearningPlanPage";

import CookieConsent from "./components/CookieConsent";

import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";

import {
  refreshSession,
  logoutUser,
} from "./services/authApi";

// =====================================================
// SESSION TIMEOUT SETTINGS
// =====================================================

const IDLE_TIMEOUT = 15 * 1000; // 10 seconds for testing, change to 15 * 60 * 1000 for 15 minutes 
const WARNING_DURATION = 30; // 30 seconds countdown for testing, change to 60 for 1 minute

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "admin";
  targetRole: string;
}

interface AuthSession {
  token: string;
  user: AuthUser;
}

interface ProtectedLayoutProps {
  session: AuthSession | null;
  onLogout: () => void;
}

function ProtectedLayout({
  session,
  onLogout,
}: ProtectedLayoutProps) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout
      userName={session.user.name}
      userRole={session.user.role}
      onLogout={onLogout}
    />
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  // Global theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const savedTheme = localStorage.getItem("interviewiq_theme");
      return savedTheme === "dark" ? "dark" : "light";
    } catch (error) {
      console.error("Could not read theme preference:", error);
      return "light";
    }
  });

  // Apply theme across the entire website
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");

    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem("interviewiq_theme", theme);
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) =>
      previous === "light" ? "dark" : "light"
    );
  };

  const [showSessionWarning, setShowSessionWarning] = useState(false);
const [remainingSeconds, setRemainingSeconds] = useState(
  WARNING_DURATION
);

const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(
  null
);

  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const saved = sessionStorage.getItem("interviewiq_session");
      return saved ? (JSON.parse(saved) as AuthSession) : null;
    } catch {
      sessionStorage.removeItem("interviewiq_session");
      return null;
    }
  });

 function handleAuthSuccess(token: string, user: AuthUser) {
  const newSession: AuthSession = { token, user };

  sessionStorage.setItem(
    "interviewiq_session",
    JSON.stringify(newSession)
  );

  setSession(newSession);
  setShowSessionWarning(false);

  navigate(
    user.role === "admin" ? "/admin/dashboard" : "/dashboard",
    { replace: true }
  );
}

  async function handleLogout() {
  const currentToken = session?.token;

  // Clear timers immediately to prevent repeated logout attempts.
  clearSessionTimers();

  try {
    if (currentToken) {
      await logoutUser(currentToken);
    }
  } catch (error) {
    console.error("Backend logout failed:", error);
  } finally {
    sessionStorage.removeItem("interviewiq_session");
    sessionStorage.removeItem("interviewiq_current_interview");

    setShowSessionWarning(false);
    setSession(null);

    navigate("/login", { replace: true });
  }
}

  const clearSessionTimers = useCallback(() => {
  if (idleTimerRef.current) {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }

  if (countdownTimerRef.current) {
    clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
  }
}, []);

const startIdleTimer = useCallback(() => {
  clearSessionTimers();

  setShowSessionWarning(false);
  setRemainingSeconds(WARNING_DURATION);

  idleTimerRef.current = setTimeout(() => {
    setShowSessionWarning(true);
    setRemainingSeconds(WARNING_DURATION);
  }, IDLE_TIMEOUT);
}, [clearSessionTimers]);

const stayLoggedIn = useCallback(async () => {
  if (!session?.token) {
    await handleLogout();
    return;
  }

  try {
    await refreshSession(session.token);

    // Restart the idle timer only after backend confirmation.
    startIdleTimer();
  } catch (error) {
    console.error("Session refresh failed:", error);
    await handleLogout();
  }
}, [session, startIdleTimer]);

useEffect(() => {
  if (!session) {
    clearSessionTimers();
    setShowSessionWarning(false);
    return;
  }

  // Do not restart the idle timer while the warning is visible.
  if (showSessionWarning) {
    return;
  }

  const activityEvents = [
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
  ];

  const handleActivity = () => {
    startIdleTimer();
  };

  activityEvents.forEach((event) => {
    window.addEventListener(event, handleActivity);
  });

  // Start the initial idle timer.
  startIdleTimer();

  return () => {
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleActivity);
    });

    // Clear only the idle timer.
    // Do not clear the warning countdown here.
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };
}, [
  session,
  showSessionWarning,
  startIdleTimer,
  clearSessionTimers,
]);

useEffect(() => {
  if (!showSessionWarning) return;

  countdownTimerRef.current = setInterval(() => {
    setRemainingSeconds((previous) => {
      if (previous <= 1) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }

        handleLogout();
        return 0;
      }

      return previous - 1;
    });
  }, 1000);

  return () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };
}, [showSessionWarning]);

    return (
        <>
      <Routes>
      {/* Public pages */}
      <Route
        path="/"
        element={
          session ? (
  <Navigate
    to={session.user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
    replace
  />
) : (
  <LandingPage />
)
        }
      />

      <Route
        path="/login"
        element={
          session ? (
  <Navigate
    to={session.user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
    replace
  />
) : (
  <LoginPage onLoginSuccess={handleAuthSuccess} />
)
        }
      />

      <Route
        path="/register"
        element={
          session ? (
            <Navigate
  to={session.user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
  replace
/>
          ) : (
            <RegisterPage onRegisterSuccess={handleAuthSuccess} />
          )
        }
      />

      <Route
        path="/forgot-password"
        element={
          session ? (
            <Navigate
  to={session.user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
  replace
/>
          ) : (
            <ForgotPasswordPage />
          )
        }
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      <Route
  path="/privacy-policy"
  element={<PrivacyPolicyPage />}
/>

<Route
  path="/terms-and-conditions"
  element={<TermsAndConditionsPage />}
/>

      {/* Protected application with shared sidebar */}
      <Route
        element={
          <ProtectedLayout
            session={session}
            onLogout={handleLogout}
          />
        }
      >
        <Route
  path="/admin/dashboard"
  element={
    session?.user.role === "admin" ? (
      <AdminDashboardPage token={session.token} />
    ) : (
      <Navigate to="/dashboard" replace />
    )
  }
/>
       <Route
  path="/dashboard"
  element={
    session?.user.role === "admin" ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <DashboardPage token={session?.token ?? ""} />
    )
  }
/>

        <Route
          path="/profile"
          element={<ProfilePage token={session?.token ?? ""} />}
        />

        <Route
          path="/interview/setup"
          element={
            <InterviewSetupPage token={session?.token ?? ""} />
          }
        />

        <Route
          path="/resume-interview"
          element={
            <ResumeInterviewPage token={session?.token ?? ""} />
          }
        />

        <Route
          path="/interview/history"
          element={
            <InterviewHistoryPage token={session?.token ?? ""} />
          }
        />

        <Route
          path="/analytics"
          element={<AnalyticsPage token={session?.token ?? ""} />}
        />
        <Route
          path="/learning-plan"
          element={<LearningPlanPage />}
        />
        <Route
          path="/interview/:id/results"
          element={
            <InterviewResultsPage token={session?.token ?? ""} />
          }
        />

        <Route
          path="/interview/:id"
          element={
            <InterviewSessionPage token={session?.token ?? ""} />
          }
        />

        <Route
          path="/admin/questions"
          element={
            session?.user.role === "admin" ? (
              <AdminQuestionBankPage token={session.token} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
  path="/admin/candidates"
  element={
    session?.user.role === "admin" ? (
      <AdminCandidatesPage token={session.token} />
    ) : (
      <Navigate to="/dashboard" replace />
    )
  }
/>
<Route
  path="/admin/model-monitoring"
  element={
    session?.user.role === "admin" ? (
      <AdminModelMonitoringPage token={session.token} />
    ) : (
      <Navigate to="/dashboard" replace />
    )
  }
/>

<Route
  path="/admin/datasets"
  element={
    session?.user.role === "admin" ? (
      <AdminDatasetManagementPage token={session.token} />
    ) : (
      <Navigate to="/dashboard" replace />
    )
  }
/>

<Route
  path="/admin/interviews"
  element={
    session?.user.role === "admin" ? (
      <AdminInterviewManagementPage token={session.token} />
    ) : (
      <Navigate to="/dashboard" replace />
    )
  }
/>

      </Route>
      

      {/* Unknown URLs */}
          <Route
        path="*"
        element={
          <Navigate
            to={
              session
                ? session.user.role === "admin"
                  ? "/admin/dashboard"
                  : "/dashboard"
                : "/"
            }
            replace
          />
        }
      />
           </Routes>

      {/* Global Cookie Consent Banner */}
      <CookieConsent />

      {/* Global Light / Dark Theme Toggle */}
<button
  type="button"
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  aria-pressed={theme === "dark"}
  className="theme-toggle fixed bottom-6 right-6 z-[180] flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105"
>
  {theme === "light" ? (
    <Moon size={22} />
  ) : (
    <Sun size={22} />
  )}
</button>

      {/* Session expiration warning popup */}
      {session && showSessionWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-warning-title"
            className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center text-white shadow-2xl"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <span className="text-3xl">⏱</span>
            </div>

            <h2
              id="session-warning-title"
              className="text-2xl font-bold"
            >
              Your session is about to expire
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              You have been inactive. For your security, you will
              automatically be logged out when the countdown reaches zero.
            </p>

            <div className="my-7">
              <p className="text-5xl font-bold tabular-nums text-amber-400">
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Time remaining
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={stayLoggedIn}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400"
              >
                Stay Logged In
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6">
          <h1 className="text-xl font-bold">
            Google configuration missing
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Add VITE_GOOGLE_CLIENT_ID to frontend/.env,
            then restart the frontend development server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}


import { useState } from "react";
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
import ResumeInterviewPage from "./pages/ResumeInterviewPage";
import DashboardLayout from "./components/DashboardLayout";
import LearningPlanPage from "./pages/LearningPlanPage";

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

  navigate(
    user.role === "admin" ? "/admin/dashboard" : "/dashboard",
    { replace: true }
  );
}

  function handleLogout() {
    sessionStorage.removeItem("interviewiq_session");
    sessionStorage.removeItem("interviewiq_current_interview");
    setSession(null);
    navigate("/login", { replace: true });
  }

  return (
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
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLoginSuccess={handleAuthSuccess} />
          )
        }
      />

      <Route
        path="/register"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage onRegisterSuccess={handleAuthSuccess} />
          )
        }
      />

      <Route
        path="/forgot-password"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <ForgotPasswordPage />
          )
        }
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
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
          element={<DashboardPage token={session?.token ?? ""} />}
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

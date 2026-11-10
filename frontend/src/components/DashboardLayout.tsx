
import { useState } from "react";
import ChatbotWidget from "./ChatbotWidget";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  BarChart3,
  BrainCircuit,
  Database,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileUser,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";

interface DashboardLayoutProps {
  userName: string;
  userRole: "candidate" | "admin";
  onLogout: () => void;
}

const candidateNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Mock Interview",
    path: "/interview/setup",
    icon: BrainCircuit,
  },
  {
    label: "Resume-Based Interview",
    path: "/resume-interview",
    icon: FileUser,
  },
  {
    label: "Interview History",
    path: "/interview/history",
    icon: History,
  },
  {
    label: "Analytics & Progress",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Learning Plan",
    path: "/learning-plan",
    icon: Target,
  },
  {
    label: "My Profile",
    path: "/profile",
    icon: UserRound,
  },
];


const adminNavigation = [
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Candidate Management",
    path: "/admin/candidates",
    icon: Users,
  },

    {
    label: "Interview Management",
    path: "/admin/interviews",
    icon: ClipboardList,
  },
  {
    label: "Question Bank",
    path: "/admin/questions",
    icon: ShieldCheck,
  },
  {
    label: "Model Monitoring",
    path: "/admin/model-monitoring",
    icon: Gauge,
  },
    {
    label: "Dataset Management",
    path: "/admin/datasets",
    icon: Database,
  },
  {
    label: "My Profile",
    path: "/profile",
    icon: UserRound,
  },
];

export default function DashboardLayout({
  userName,
  userRole,
  onLogout,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  // Display navigation according to the logged-in user's role.
  const navigation =
    userRole === "admin"
      ? adminNavigation
      : candidateNavigation;

  // Identify the current page.
  const currentPage =
    navigation.find((item) =>
      item.end
        ? location.pathname === item.path
        : location.pathname === item.path ||
          location.pathname.startsWith(`${item.path}/`)
    )?.label ??
    (location.pathname.startsWith("/interview/") &&
    !location.pathname.startsWith("/interview/history")
      ? "Interview Session"
      : location.pathname.startsWith("/admin/model-monitoring")
        ? "Model Monitoring"
       : location.pathname.startsWith("/admin/candidates")
  ? "Candidate Management"
  : location.pathname.startsWith("/admin/model-monitoring")
    ? "Model Monitoring"
   : location.pathname.startsWith("/admin/datasets")
  ? "Dataset Management"
  : location.pathname.startsWith("/admin/questions")
    ? "Question Bank"
      : location.pathname.startsWith("/admin")
        ? "Admin Dashboard"
        : "InterviewIQ");

  const initials =
    userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const linkClass = (active: boolean) =>
    `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-950/20"
        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  return (
    <div className="min-h-screen bg-[#FAF9FF] text-[#1F1633]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#1F1633]/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#E9DDF7] bg-white shadow-sm transition-all duration-300 ${
          mobileOpen
            ? "translate-x-0 w-72"
            : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-20" : "md:w-72"} w-72`}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-[#E9DDF7] px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <BrainCircuit size={23} className="text-white" />
          </div>

          {(!collapsed || mobileOpen) && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                <span className="text-[#1F1633]">Interview</span><span className="text-indigo-600">IQ</span>
              </h1>
              <p className="text-[10px] tracking-wide text-slate-500">
                AI INTERVIEW PLATFORM
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-600 hover:bg-indigo-50 md:hidden"
            aria-label="Close menu"
          >
            <X size={19} />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p
            className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 ${
              collapsed && !mobileOpen
                ? "md:text-center md:px-0"
                : ""
            }`}
          >
            {collapsed && !mobileOpen
              ? "MENU"
              : userRole === "admin"
                ? "Administration"
                : "Workspace"}
          </p>

          <nav
            className="space-y-1.5"
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  title={
                    collapsed && !mobileOpen
                      ? item.label
                      : undefined
                  }
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    linkClass(isActive)
                  }
                >
                  <Icon size={19} className="shrink-0" />

                  {(!collapsed || mobileOpen) && (
                    <span className="flex-1">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Support */}
          <div className="my-6 border-t border-[#E9DDF7]" />

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {collapsed && !mobileOpen ? "MORE" : "Support"}
          </p>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "mailto:support@interviewiq.com";
              }}
              title={
                collapsed && !mobileOpen
                  ? "Help & Support"
                  : undefined
              }
              className={linkClass(false) + " w-full"}
            >
              <CircleHelp size={19} className="shrink-0" />

              {(!collapsed || mobileOpen) && (
                <span>Help & Support</span>
              )}
            </button>
          </div>
        </div>

        {/* User profile and logout */}
        <div className="shrink-0 border-t border-[#E9DDF7] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-indigo-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-indigo-700 ring-1 ring-indigo-200">
              {initials}
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {userName}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-600">
                  {userRole}
                </p>
              </div>
            )}

            {(!collapsed || mobileOpen) && (
              <NavLink
                to="/profile"
                onClick={() => setMobileOpen(false)}
                title="Profile settings"
                className="rounded-lg p-2 text-slate-600 hover:bg-white hover:text-indigo-700"
              >
                <Settings size={17} />
              </NavLink>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
            title={collapsed && !mobileOpen ? "Log out" : undefined}
          >
            <LogOut size={19} className="shrink-0" />

            {(!collapsed || mobileOpen) && (
              <span>Log out</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          collapsed ? "md:pl-20" : "md:pl-72"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E9DDF7] bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#E9DDF7] p-2 text-slate-700 hover:bg-indigo-50 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {currentPage}
              </p>
              <p className="hidden text-xs text-slate-600 sm:block">
                Welcome back, {userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              <span className="text-xs font-medium text-indigo-800">
                {userRole === "admin"
                  ? "Administration Workspace"
                  : "AI Practice Workspace"}
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-800">
              {initials}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

               <footer className="border-t border-[#E9DDF7] px-6 py-5 text-center text-xs text-slate-600">
          InterviewIQ · AI-powered interview preparation
        </footer>
      </div>

      {/* AI Chatbot - available throughout the dashboard */}
      <ChatbotWidget />
    </div>
  );
}


import { useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileUser,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  X,
} from "lucide-react";

interface DashboardLayoutProps {
  userName: string;
  userRole: "candidate" | "admin";
  onLogout: () => void;
}

const navigation = [
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

export default function DashboardLayout({
  userName,
  userRole,
  onLogout,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentPage =
    navigation.find(
      (item) =>
        item.end
          ? location.pathname === item.path
          : location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`)
    )?.label ??
    (location.pathname.startsWith("/interview/") &&
    !location.pathname.startsWith("/interview/history")
      ? "Interview Session"
      : location.pathname.startsWith("/admin")
        ? "Question Bank"
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
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 ${
          mobileOpen
            ? "translate-x-0 w-72"
            : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-20" : "md:w-72"} w-72`}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/40">
            <BrainCircuit size={23} className="text-white" />
          </div>

          {(!collapsed || mobileOpen) && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Interview<span className="text-indigo-400">IQ</span>
              </h1>
              <p className="text-[10px] tracking-wide text-slate-500">
                AI INTERVIEW PLATFORM
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 md:hidden"
            aria-label="Close menu"
          >
            <X size={19} />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:block"
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

        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p
            className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 ${
              collapsed && !mobileOpen ? "md:text-center md:px-0" : ""
            }`}
          >
            {collapsed && !mobileOpen ? "MENU" : "Workspace"}
          </p>

          <nav className="space-y-1.5" aria-label="Main navigation">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  <Icon size={19} className="shrink-0" />

                  {(!collapsed || mobileOpen) && (
                    <span className="flex-1">{item.label}</span>
                  )}
                </NavLink>
              );
            })}

            {userRole === "admin" && (
              <NavLink
                to="/admin/questions"
                onClick={() => setMobileOpen(false)}
                title={collapsed && !mobileOpen ? "Question Bank" : undefined}
                className={({ isActive }) => linkClass(isActive)}
              >
                <ShieldCheck size={19} className="shrink-0" />
                {(!collapsed || mobileOpen) && (
                  <span className="flex-1">Question Bank</span>
                )}
              </NavLink>
            )}
          </nav>

          <div className="my-6 border-t border-slate-800" />

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {collapsed && !mobileOpen ? "MORE" : "Support"}
          </p>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                window.location.href = "mailto:support@interviewiq.com";
              }}
              title={collapsed && !mobileOpen ? "Help & Support" : undefined}
              className={linkClass(false) + " w-full"}
            >
              <CircleHelp size={19} className="shrink-0" />
              {(!collapsed || mobileOpen) && (
                <span>Help & Support</span>
              )}
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300 ring-1 ring-indigo-400/30">
              {initials}
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {userName}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-400">
                  {userRole}
                </p>
              </div>
            )}

            {(!collapsed || mobileOpen) && (
              <NavLink
                to="/profile"
                onClick={() => setMobileOpen(false)}
                title="Profile settings"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <Settings size={17} />
              </NavLink>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            title={collapsed && !mobileOpen ? "Log out" : undefined}
          >
            <LogOut size={19} className="shrink-0" />
            {(!collapsed || mobileOpen) && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          collapsed ? "md:pl-20" : "md:pl-72"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800 md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {currentPage}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Welcome back, {userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                AI Practice Workspace
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-indigo-300">
              {initials}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-800/70 px-6 py-5 text-center text-xs text-slate-500">
          InterviewIQ · AI-powered interview preparation
        </footer>
      </div>
    </div>
  );
}

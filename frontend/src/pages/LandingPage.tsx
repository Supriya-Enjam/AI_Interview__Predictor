
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  Code2,
  MessageSquareText,
  Mic,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "AI-powered evaluation",
    description:
      "Analyze your practice answers and receive actionable feedback on relevance, clarity, and technical accuracy.",
  },
  {
    icon: Target,
    title: "Personalized preparation",
    description:
      "Practice questions tailored to your target role, experience level, and learning goals.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Performance insights",
    description:
      "Track practice scores, identify skill gaps, and understand where to focus next.",
  },
  {
    icon: Mic,
    title: "Realistic mock interviews",
    description:
      "Prepare for technical, behavioral, and HR interviews with text and voice practice.",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose your target role",
    description: "Tell us which position you are preparing for.",
  },
  {
    number: "02",
    title: "Practice interview questions",
    description: "Answer role-specific questions at your own pace.",
  },
  {
    number: "03",
    title: "Review your performance",
    description: "Get feedback and recommendations for improvement.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <BrainCircuit size={24} />
            </div>

            <div>
              <span className="block text-lg font-extrabold tracking-tight">
                InterviewIQ
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                AI Preparation
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-indigo-600">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600">
              How it works
            </a>
            <a href="#benefits" className="hover:text-indigo-600">
              Benefits
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
          <div className="absolute right-0 top-10 -z-10 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                <ShieldCheck size={16} />
                Your next opportunity starts here
              </div>

              <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Turn interview practice into{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  interview confidence.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Practice smarter with AI-assisted feedback, role-specific
                questions, and performance insights designed to help you
                prepare for your next interview.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  Start preparing <ArrowRight size={18} />
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  Explore features
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Role-specific practice
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Personalized feedback
                </span>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 to-violet-200/60 blur-2xl" />

              <div className="relative rounded-3xl border border-white bg-white p-5 shadow-2xl shadow-indigo-200/50 sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Your practice workspace
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      Interview overview
                    </h2>
                  </div>

                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                    <TrendingUp size={23} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MessageSquareText size={17} />
                      Practice sessions
                    </div>
                    <p className="mt-3 text-3xl font-extrabold">—</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your activity appears here
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <Target size={17} />
                      Readiness score
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-indigo-700">
                      —
                    </p>
                    <p className="mt-1 text-xs text-indigo-600">
                      Calculated after practice
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Your next practice
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Technical interview
                      </p>
                    </div>
                    <Code2 size={25} className="text-indigo-600" />
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Preview of your practice workspace
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                  <div className="rounded-xl bg-white p-2 text-emerald-600">
                    <BrainCircuit size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Feedback that helps you improve
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Discover strengths and areas to work on.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Everything you need
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Prepare with purpose. Improve with insight.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Build interview skills through structured practice and
              meaningful performance feedback.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                Simple process
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                From preparation to progress
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-slate-200 bg-white p-7"
                >
                  <span className="text-sm font-extrabold tracking-widest text-indigo-600">
                    STEP {step.number}
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section
          id="benefits"
          className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
        >
          <div className="grid items-center gap-10 rounded-3xl bg-slate-950 p-8 text-white sm:p-12 lg:grid-cols-2 lg:p-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-300">
                Your preparation, your progress
              </p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
                Make every practice session count.
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                Understand your performance, identify improvement areas, and
                build a more focused interview preparation routine.
              </p>

              <Link
                to="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400"
              >
                Get started <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Technical skill analysis",
                "Communication feedback",
                "Interview history",
                "Personalized study plans",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <CheckCircle2
                    size={20}
                    className="shrink-0 text-indigo-300"
                  />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="font-semibold text-slate-700">
            InterviewIQ · AI Interview Performance Predictor
          </p>
          <p>Practice with purpose. Prepare with confidence.</p>
        </div>
      </footer>
    </div>
  );
}

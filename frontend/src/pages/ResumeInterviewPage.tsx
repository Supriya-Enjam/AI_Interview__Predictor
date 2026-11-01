
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Upload,
  LoaderCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Copy,
  Play,
} from "lucide-react";

import {
  generateResumeQuestions,
  createResumeInterview,
  analyzeResume,
  type ResumeInterviewConfig,
  type ResumeAnalysis,
} from "../services/resumeApi";

interface ResumeInterviewPageProps {
  token: string;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

export default function ResumeInterviewPage({
  token,
}: ResumeInterviewPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [fileType, setFileType] = useState<"pdf" | "docx" | null>(null);
  const [characterCount, setCharacterCount] = useState(0);

  const [targetRole, setTargetRole] = useState("");

  const [category, setCategory] =
    useState<ResumeInterviewConfig["category"]>("technical");

  const [difficulty, setDifficulty] =
    useState<ResumeInterviewConfig["difficulty"]>("intermediate");

  const [duration, setDuration] =
    useState<ResumeInterviewConfig["duration"]>(15);

  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setError("");
    setSuccess("");
    setQuestions([]);
    setAnalysis(null);
    setFileType(null);
    setCharacterCount(0);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name.toLowerCase().split(".").pop();

    if (!["pdf", "docx"].includes(extension ?? "")) {
      setFile(null);
      setError("Please choose a PDF or DOCX resume.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("The resume must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleAnalyzeResume() {
    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    if (!token) {
      setError("Your session is missing. Please log in again.");
      return;
    }

    if (targetRole.trim().length < 2 || targetRole.trim().length > 100) {
      setError("Enter a job role between 2 and 100 characters.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setSuccess("");
    setAnalysis(null);

    try {
      const response = await analyzeResume(
        token,
        file,
        targetRole.trim()
      );

      setAnalysis(response.data.analysis);
      setFileType(response.data.fileType);
      setCharacterCount(response.data.characterCount);
      setSuccess(response.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze your resume."
      );
    } finally {
      setAnalyzing(false);
    }
  }

async function handleGenerateQuestions() {
  if (!file) {
    setError("Please select your resume first.");
    return;
  }

  if (!token) {
    setError("Your session is missing. Please log in again.");
    return;
  }

  if (targetRole.trim().length < 2 || targetRole.trim().length > 100) {
    setError("Enter a job role between 2 and 100 characters.");
    return;
  }

  setLoading(true);
  setError("");
  setSuccess("");
  setQuestions([]);

  try {
    const response = await generateResumeQuestions(token, file, {
      targetRole: targetRole.trim(),
      category,
      difficulty,
    });

    setQuestions(response.data.questions);
    setFileType(response.data.fileType);
    setCharacterCount(response.data.characterCount);
    setSuccess(response.message);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to generate resume questions."
    );
  } finally {
    setLoading(false);
  }
}

  async function handleStartInterview() {
    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    if (!token) {
      setError("Your session is missing. Please log in again.");
      return;
    }

    if (targetRole.trim().length < 2 || targetRole.trim().length > 100) {
      setError("Enter a job role between 2 and 100 characters.");
      return;
    }

    setStarting(true);
    setError("");
    setSuccess("");

    try {
      const interview = await createResumeInterview(token, file, {
        targetRole: targetRole.trim(),
        category,
        difficulty,
        duration,
      });

      sessionStorage.setItem(
        "interviewiq_setup_draft",
        JSON.stringify({
          targetRole: targetRole.trim(),
          category,
          difficulty,
          duration,
          source: "resume",
        })
      );

      sessionStorage.setItem(
        "interviewiq_current_interview",
        JSON.stringify(interview)
      );

      navigate(`/interview/${encodeURIComponent(interview.id)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start your resume interview."
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleCopyQuestions() {
    try {
      await navigator.clipboard.writeText(
        questions
          .map((question, index) => `${index + 1}. ${question}`)
          .join("\n\n")
      );

      setSuccess("Questions copied to your clipboard.");
    } catch {
      setError(
        "Could not copy the questions. Please select and copy them manually."
      );
    }
  }

  function renderSkillTags(
  skills: Array<string | { name: string; relatedConcepts?: string[] }>,
  emptyMessage: string,
  color: "green" | "amber" | "violet" | "slate"
) {
  const colorClasses = {
    green:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-200",
    violet:
      "border-violet-500/30 bg-violet-500/10 text-violet-200",
    slate: "border-slate-700 bg-slate-800 text-slate-200",
  };

  if (!skills || skills.length === 0) {
    return (
      <p className="text-sm text-slate-400">{emptyMessage}</p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {skills.map((skill, index) => {
        const skillName =
          typeof skill === "string" ? skill : skill.name;

        return (
          <span
            key={`${skillName}-${index}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${colorClasses[color]}`}
          >
            {skillName}
          </span>
        );
      })}
    </div>
  );
}
  const resumeSections: {
    heading: string;
    items: string[];
  }[] = analysis
    ? [
        {
          heading: "Education",
          items: analysis.sections.education,
        },
        {
          heading: "Experience",
          items: analysis.sections.experience,
        },
        {
          heading: "Projects",
          items: analysis.sections.projects,
        },
        {
          heading: "Certifications",
          items: analysis.sections.certifications,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <header className="mt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-sm text-violet-200">
            <Sparkles size={15} />
            Personalized interview preparation
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Resume-Based Interview
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Upload your resume, analyze your skills, choose your interview
            preferences, and practice answering questions generated from
            your experience.
          </p>
        </header>

        {/* Resume upload and configuration */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-8">
          <h2 className="text-lg font-semibold">
            1. Upload your resume
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Supported formats: PDF and DOCX. Maximum file size: 5 MB.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || starting || analyzing}
            className="mt-6 flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-6 text-center transition hover:border-violet-400 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={30} className="text-violet-300" />

            <span className="mt-3 font-semibold">
              {file ? "Choose a different resume" : "Select your resume"}
            </span>

            <span className="mt-2 text-sm text-slate-400">
              Click here to browse files on your computer
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select a PDF or DOCX resume"
          />

          {file && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <FileText
                className="shrink-0 text-violet-300"
                size={26}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <CheckCircle2
                size={20}
                className="shrink-0 text-emerald-400"
              />
            </div>
          )}

          <h2 className="mt-8 text-lg font-semibold">
            2. Configure your interview
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-300">
              Target job role

              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="e.g. Full Stack Developer"
                maxLength={100}
                className={inputClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-300">
              Interview category

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as ResumeInterviewConfig["category"]
                  )
                }
                className={inputClass}
              >
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="mixed">Mixed</option>
                <option value="hr">HR</option>
                <option value="situational">Situational</option>
                <option value="coding">Coding</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-300">
              Difficulty

              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value as ResumeInterviewConfig["difficulty"]
                  )
                }
                className={inputClass}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-300">
              Duration

              <select
                value={duration}
                onChange={(event) =>
                  setDuration(
                    Number(event.target.value) as ResumeInterviewConfig["duration"]
                  )
                }
                className={inputClass}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
              </select>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
              />
              <span>{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void handleAnalyzeResume()}
              disabled={
                !file || loading || starting || analyzing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/50 px-5 py-3.5 font-semibold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Sparkles size={19} />
                  Analyze Resume
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleGenerateQuestions()}
              disabled={
                !file || loading || starting || analyzing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/50 px-5 py-3.5 font-semibold text-violet-200 transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                  Processing Resume...
                </>
              ) : (
                <>
                  <Sparkles size={19} />
                  Generate Questions
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleStartInterview()}
              disabled={
                !file || loading || starting || analyzing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                  Creating Interview...
                </>
              ) : (
                <>
                  <Play size={19} />
                  Start Resume Interview
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Analyze your resume to identify skill gaps and strengths.
            You can generate questions or start an interview directly
            without completing the analysis first.
          </p>
        </section>

        {/* Resume analysis results */}
        {analysis && (
          <section className="mt-8 space-y-6">
            {/* Readiness score */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-violet-300">
                    <Sparkles size={19} />
                    <span className="text-sm font-semibold">
  Rule-Based Resume Analysis
</span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold">
                    Your Resume Readiness
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Target role: {analysis.targetRole}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Method: {analysis.analysisMethod}
                  </p>
                </div>

                <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-full border-4 border-violet-500/50 bg-violet-500/10">
                  <span className="text-4xl font-bold text-violet-200">
                    {analysis.readinessScore}
                  </span>

                  <span className="text-xs text-slate-400">
                    out of 100
                  </span>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, analysis.readinessScore)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Matched and missing skills */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold text-emerald-300">
                  Matched Skills ({analysis.matchedSkills.length})
                </h3>

                {renderSkillTags(
                  analysis.matchedSkills,
                  "No matching skills detected yet.",
                  "green"
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold text-amber-300">
                  Missing Skills ({analysis.missingSkills.length})
                </h3>

                {renderSkillTags(
                  analysis.missingSkills,
                  "No missing skills identified for this role.",
                  "amber"
                )}
              </div>
            </div>

            {/* Detected skills */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">
                Skills Detected in Your Resume
              </h3>

              {renderSkillTags(
                analysis.detectedSkills,
                "No recognized skills were detected.",
                "slate"
              )}
            </div>

            {/* Strengths and recommendations */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold text-emerald-300">
                  Resume Strengths
                </h3>

                <ul className="mt-4 space-y-3">
                  {analysis.strengths.length > 0 ? (
                    analysis.strengths.map((item, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm text-slate-300"
                      >
                        <CheckCircle2
                          size={18}
                          className="shrink-0 text-emerald-400"
                        />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400">
                      No specific strengths identified.
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold text-violet-300">
                  Recommendations
                </h3>

                <ul className="mt-4 space-y-3">
                  {analysis.recommendations.length > 0 ? (
                    analysis.recommendations.map((item, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm text-slate-300"
                      >
                        <Sparkles
                          size={18}
                          className="shrink-0 text-violet-400"
                        />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400">
                      No additional recommendations.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Resume sections */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">
                Resume Section Analysis
              </h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {resumeSections.map(({ heading, items }) => (
                  <div key={heading}>
                    <h4 className="font-medium text-violet-200">
                      {heading}
                    </h4>

                    {items.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {items.map((item, index) => (
                          <li
                            key={index}
                            className="rounded-lg bg-slate-950 p-3 text-sm leading-6 text-slate-300"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No {heading.toLowerCase()} section detected.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">
                Projects Identified
              </h3>

              {analysis.projects.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {analysis.projects.map((project, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300"
                    >
                      {project}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  No project details were identified in the resume.
                </p>
              )}
            </div>

            <p className="text-xs leading-5 text-slate-500">
              This readiness score is based on rule-based resume analysis.
              It is an estimate of skill alignment with the selected role,
              not a guarantee of interview success.
            </p>
          </section>
        )}

        {/* Generated questions */}
        {questions.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Your personalized questions
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {questions.length} questions generated from your resume.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Extracted {characterCount.toLocaleString()} characters
                  {fileType
                    ? ` from ${fileType.toUpperCase()}`
                    : ""}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleCopyQuestions()}
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
              >
                <Copy size={16} />
                Copy questions
              </button>
            </div>

            <ol className="mt-6 space-y-4">
              {questions.map((question, index) => (
                <li
                  key={`${index}-${question}`}
                  className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-sm font-bold text-violet-200">
                    {index + 1}
                  </span>

                  <p className="pt-1 leading-7 text-slate-200">
                    {question}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-5 text-sm text-slate-400">
              You can review and copy these questions, or start the saved
              interview above to answer them in InterviewIQ.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

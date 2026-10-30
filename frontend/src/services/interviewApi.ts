
const API_BASE_URL = "http://localhost:5000/api/interviews";

// =========================================================
// TYPES
// =========================================================

export type InterviewCategory =
  | "technical"
  | "behavioral"
  | "mixed"
  | "hr"
  | "situational"
  | "coding";

export type InterviewDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type InterviewStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface CreateInterviewRequest {
  targetRole: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  duration: 10 | 15 | 30 | 45;
}

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  category: InterviewCategory;
  order: number;
  skills?: string[];
  expectedConcepts?: string[];
  answer?: string;
  answeredAt?: string;
}

export interface QuestionBankPreviewEntry {
  questionText: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  skills: string[];
  expectedConcepts: string[];
  roleContext?: string;
}

export interface QuestionEvaluationSummary {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  matchedConcepts: string[];
  missingConcepts: string[];
  conceptCoverage: number;
}

export interface InterviewEvaluationSummary {
  overallScore: number;
  maxScore: number;
  percentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  questionEvaluations: QuestionEvaluationSummary[];
  evaluatedAt: string;
  evaluationMethod: "rubric";
}

export interface InterviewSession {
  id: string;
  targetRole: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  duration: number;
  questions: InterviewQuestion[];
  status: InterviewStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  evaluation?: InterviewEvaluationSummary | null;
}

interface InterviewApiResponse {
  success: boolean;
  message?: string;
  session?: Record<string, unknown>;
  interview?: Record<string, unknown>;
  questions?: InterviewQuestion[];
  [key: string]: unknown;
}

// =========================================================
// HELPERS
// =========================================================

async function requestInterviewApi(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<InterviewApiResponse> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Interview request failed (${response.status})`
    );
  }

  return data as InterviewApiResponse;
}

function normalizeInterview(
  data: InterviewApiResponse
): InterviewSession {
  const raw = data.session ?? data.interview ?? data;

  const id = raw.id ?? raw._id;

  if (typeof id !== "string") {
    throw new Error(
      "The server response did not include an interview ID."
    );
  }

  return {
    id,
    targetRole: String(raw.targetRole ?? ""),
    category: raw.category as InterviewCategory,
    difficulty: raw.difficulty as InterviewDifficulty,
    duration: Number(raw.duration ?? 0),
    questions: Array.isArray(raw.questions)
      ? (raw.questions as InterviewQuestion[])
      : Array.isArray(data.questions)
        ? data.questions
        : [],
    status: (raw.status ?? "pending") as InterviewStatus,
    startedAt:
      typeof raw.startedAt === "string" ? raw.startedAt : undefined,
    completedAt:
      typeof raw.completedAt === "string" ? raw.completedAt : undefined,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    evaluation:
      raw.evaluation && typeof raw.evaluation === "object"
        ? (raw.evaluation as InterviewEvaluationSummary)
        : null,
  };
}

// =========================================================
// CREATE INTERVIEW
// =========================================================

export async function createInterview(
  token: string,
  payload: CreateInterviewRequest
): Promise<InterviewSession> {
  const data = await requestInterviewApi("", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeInterview(data);
}

// =========================================================
// QUESTION BANK PREVIEW
// =========================================================

export async function getQuestionBankPreview(
  token: string,
  payload: {
    category: InterviewCategory;
    difficulty: InterviewDifficulty;
    targetRole?: string;
  }
): Promise<QuestionBankPreviewEntry[]> {
  const params = new URLSearchParams({
    category: payload.category,
    difficulty: payload.difficulty,
  });

  if (payload.targetRole?.trim()) {
    params.set("targetRole", payload.targetRole.trim());
  }

  const data = await requestInterviewApi(
    `/question-bank?${params.toString()}`,
    token
  );

  if (!Array.isArray(data.questions)) {
    throw new Error("The question-bank preview response was invalid.");
  }

  return data.questions as unknown as QuestionBankPreviewEntry[];
}

// =========================================================
// GET AN EXISTING INTERVIEW
// =========================================================

export async function getInterview(
  token: string,
  interviewId: string
): Promise<InterviewSession> {
  const data = await requestInterviewApi(
    `/${encodeURIComponent(interviewId)}`,
    token
  );

  return normalizeInterview(data);
}

// =========================================================
// RESPONSE TYPES
// =========================================================

export interface SaveAnswerResponse {
  success: boolean;
  message: string;
  questionId: string;
  answeredAt?: string;
  status: InterviewStatus;
}

export interface CompleteInterviewResponse {
  success: boolean;
  message: string;
  interviewId: string;
  status: InterviewStatus;
  completedAt?: string;
  totalQuestions?: number;
  answeredQuestions?: number;
}

// =========================================================
// SAVE AN ANSWER
// POST /api/interviews/:id/answers
// =========================================================

export async function saveInterviewAnswer(
  token: string,
  interviewId: string,
  questionId: string,
  answer: string
): Promise<SaveAnswerResponse> {
  const data = await requestInterviewApi(
    `/${encodeURIComponent(interviewId)}/answers`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        questionId,
        answer,
      }),
    }
  );

  return data as unknown as SaveAnswerResponse;
}

// =========================================================
// COMPLETE AN INTERVIEW
// POST /api/interviews/:id/complete
// =========================================================

export async function completeInterview(
  token: string,
  interviewId: string
): Promise<CompleteInterviewResponse> {
  const data = await requestInterviewApi(
    `/${encodeURIComponent(interviewId)}/complete`,
    token,
    {
      method: "POST",
    }
  );

  return data as unknown as CompleteInterviewResponse;
}

// =========================================================
// INTERVIEW HISTORY
// =========================================================

export interface InterviewHistoryItem {
  id: string;
  targetRole: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  duration: number;
  status: InterviewStatus;
  totalQuestions: number;
  answeredQuestions: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  evaluation?: InterviewEvaluationSummary | null;
}

// =========================================================
// INTERVIEW READINESS
// =========================================================

export interface InterviewReadinessSummary {
  score: number;
  label: string;
  summary: string;
  averageInterviewScore: number;
  interviewCount: number;
  lastUpdated: string | null;
  strongestSkills: string[];
  improvementAreas: string[];
  method: string;
}

// =========================================================
// SKILL GAP ANALYSIS
// =========================================================

export interface SkillGapSummary {
  skill: string;
  assessments: number;
  averageScore: number;
  readiness: "Strong" | "Solid" | "Developing" | "Needs work";
  strongAreas: string[];
  weakAreas: string[];
  recommendedPractice: string[];
}

// =========================================================
// API FUNCTIONS
// =========================================================

export async function getInterviewHistory(
  token: string
): Promise<InterviewHistoryItem[]> {
  const data = await requestInterviewApi("/history", token, {
    method: "GET",
  });

  if (!Array.isArray(data.interviews)) {
    throw new Error("Invalid interview history response.");
  }

  return data.interviews as InterviewHistoryItem[];
}

export async function getInterviewReadiness(
  token: string
): Promise<InterviewReadinessSummary> {
  const data = await requestInterviewApi("/readiness", token, {
    method: "GET",
  });

  if (!data.readiness || typeof data.readiness !== "object") {
    throw new Error("Invalid readiness estimate response.");
  }

  return data.readiness as InterviewReadinessSummary;
}

export async function getSkillGaps(
  token: string
): Promise<SkillGapSummary[]> {
  const data = await requestInterviewApi("/skill-gaps", token, {
    method: "GET",
  });

  if (!Array.isArray(data.skillGaps)) {
    throw new Error("Invalid skill gap response.");
  }

  return data.skillGaps as SkillGapSummary[];
}

export async function evaluateInterview(
  token: string,
  interviewId: string
): Promise<InterviewEvaluationSummary> {
  const data = await requestInterviewApi(
    `/${encodeURIComponent(interviewId)}/evaluate`,
    token,
    { method: "POST" }
  );

  if (!data.evaluation || typeof data.evaluation !== "object") {
    throw new Error("Interview evaluation response was invalid.");
  }

  return data.evaluation as InterviewEvaluationSummary;
}

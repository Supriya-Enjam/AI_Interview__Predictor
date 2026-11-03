
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

  // Keyword analysis
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCoverage: number;

  rubric: {
  completeness: number;
  structure: number;
  specificity: number;
  relevance: number;
  communication: number;
  total: number;
};
}

export interface MLPredictionSummary {
  predictedScore: number;
  predictionType: string;
  notice: string;
  predictedAt: string;
  featureSource: "rubric";
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

  // Experimental ML prediction
  mlPrediction?: MLPredictionSummary;
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

// =========================================================
// ADAPTIVE DIFFICULTY TYPES
// =========================================================

export interface AdaptiveDifficultyResult {
  recommendedDifficulty: InterviewDifficulty;
  previousAverageScore: number | null;
  completedInterviewCount: number;
  reason: string;
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
// POST /api/interviews
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
// GET /api/interviews/question-bank
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
// GET /api/interviews/:id
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
// SAVE ANSWER RESPONSE TYPES
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
  skippedQuestions?: number;
  evaluation?: InterviewEvaluationSummary | null;
  evaluationPending?: boolean;
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
// ML PREDICTION ACCURACY TYPES
// =========================================================

export interface MLPredictionAccuracy {
  predictionCount: number;
  averagePredictedScore: number | null;
  averageActualScore: number | null;
  meanAbsoluteError: number | null;
  scoreAgreement: number | null;
  message: string;
}

export interface MLModelMetrics {
  model_name: string;
  model_type: string;
  features: string[];
  training_samples: number;
  test_samples: number;
  total_samples: number;
  mae: number;
  rmse: number;
  r2_score: number;
  cross_validation?: {
    folds: number;
    mean_mae: number;
    std_mae: number;
    mean_r2: number;
  };
  training_data: string;
  trained_at: string;
  notice: string;
}

// =========================================================
// INTERVIEW READINESS
// =========================================================

export interface InterviewReadinessSummary {
  // Actual rubric-based readiness
  score: number;
  label: string;
  summary: string;
  averageInterviewScore: number;
  interviewCount: number;
  lastUpdated: string | null;
  strongestSkills: string[];
  improvementAreas: string[];
  method: string;

  // Experimental ML prediction
  averagePredictedScore: number | null;
  predictionLabel: string;
  predictionCount: number;
  predictionNotice: string;
}

// =========================================================
// SKILL GAP ANALYSIS
// =========================================================

export interface SkillGapSummary {
  skill: string;

  // Role-specific skill information generated by Gemini
  category?:
    | "Technical"
    | "Communication"
    | "Problem Solving"
    | "Domain Knowledge";

  importance?: "High" | "Medium" | "Low";
  description?: string;

  // Assessment information
  assessments: number;
  averageScore: number;

  readiness:
    | "Strong"
    | "Solid"
    | "Developing"
    | "Needs work"
    | "Not assessed";

  assessed?: boolean;

  strongAreas: string[];
  weakAreas: string[];
  recommendedPractice: string[];
}

// =========================================================
// ADAPTIVE DIFFICULTY RECOMMENDATION
// GET /api/interviews/adaptive-difficulty
// =========================================================

export async function getAdaptiveDifficulty(
  token: string
): Promise<AdaptiveDifficultyResult> {
  const data = await requestInterviewApi(
    "/adaptive-difficulty",
    token,
    {
      method: "GET",
    }
  );

  if (
    !data.recommendation ||
    typeof data.recommendation !== "object"
  ) {
    throw new Error(
      "Invalid adaptive difficulty response."
    );
  }

  return data.recommendation as AdaptiveDifficultyResult;
}

// =========================================================
// GET INTERVIEW HISTORY
// GET /api/interviews/history
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

// =========================================================
// GET INTERVIEW READINESS
// GET /api/interviews/readiness
// =========================================================

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

// =========================================================
// GET SKILL GAPS
// GET /api/interviews/skill-gaps
// =========================================================

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

// =========================================================
// EVALUATE INTERVIEW
// POST /api/interviews/:id/evaluate
// =========================================================

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

// =========================================================
// GET ML PREDICTION ACCURACY
// GET /api/interviews/ml-accuracy
// =========================================================

export async function getMLPredictionAccuracy(
  token: string
): Promise<MLPredictionAccuracy> {
  const data = await requestInterviewApi(
    "/ml-accuracy",
    token,
    {
      method: "GET",
    }
  );

  if (!data.accuracy || typeof data.accuracy !== "object") {
    throw new Error("Invalid ML prediction accuracy response.");
  }

  return data.accuracy as MLPredictionAccuracy;
}

export async function getMLModelInfo(
  token: string
): Promise<MLModelMetrics> {
  const data = await requestInterviewApi(
    "/ml-model-info",
    token,
    { method: "GET" }
  );

  if (!data.metrics || typeof data.metrics !== "object") {
    throw new Error("Invalid ML model information response.");
  }

  return data.metrics as MLModelMetrics;
}
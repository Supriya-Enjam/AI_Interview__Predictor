
const API_BASE_URL = "http://localhost:5000/api/admin";

// =========================================================
// QUESTION BANK TYPES
// =========================================================

export interface QuestionBankAdminItem {
  _id: string;
  category: string;
  difficulty: string;
  questionText: string;
  skills: string[];
  expectedConcepts: string[];
  roleContext?: string;
}

export interface QuestionBankStats {
  totalQuestions: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
}

// =========================================================
// MODEL MONITORING TYPES
// =========================================================

export interface ModelMonitoringData {
  system: {
    name: string;
    type: string;
    evaluationMethod: string;
    trainedMachineLearningModel: boolean;
  };
  activity: {
    totalUsers: number;
    totalInterviews: number;
    completedInterviews: number;
    evaluatedInterviews: number;
    evaluatedAnswers: number;
  };
  performance: {
    averageAnswerScore: number;
    averageMaximumScore: number;
    rubricAverages: {
      completeness: number;
      structure: number;
      specificity: number;
      relevance: number;
      communication: number;
    };
  };
  evaluationMethods: {
    method: string;
    count: number;
  }[];
  recentEvaluations: {
    _id: string;
    targetRole: string;
    category: string;
    difficulty: string;
    evaluation?: {
      percentage: number;
      evaluatedAt?: string;
    };
  }[];
  metricsNote: string;
}

// =========================================================
// CANDIDATE MANAGEMENT TYPES
// =========================================================

export interface AdminCandidate {
  id: string;
  name: string;
  email: string;
  targetRole: string;
  registeredAt: string;
  totalInterviews: number;
  completedInterviews: number;
  latestInterview: {
    targetRole: string;
    category: string;
    difficulty: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    percentage?: number;
  } | null;
}

export interface CandidatePagination {
  page: number;
  limit: number;
  totalCandidates: number;
  totalPages: number;
}

export interface AdminCandidatesResponse {
  success: boolean;
  candidates: AdminCandidate[];
  pagination: CandidatePagination;
}

// =========================================================
// SHARED ADMIN API REQUEST
// =========================================================

async function requestAdminApi(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
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
      data.message || `Admin request failed (${response.status})`
    );
  }

  return data;
}

// =========================================================
// QUESTION BANK API
// =========================================================

export async function getQuestionBank(
  token: string,
  filters: {
    category?: string;
    difficulty?: string;
    search?: string;
  } = {}
): Promise<QuestionBankAdminItem[]> {
  const params = new URLSearchParams();

  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }

  if (filters.difficulty && filters.difficulty !== "all") {
    params.set("difficulty", filters.difficulty);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const data = await requestAdminApi(
    `/questions${params.toString() ? `?${params.toString()}` : ""}`,
    token,
    { method: "GET" }
  );

  if (!Array.isArray(data.questions)) {
    throw new Error("Invalid question bank response.");
  }

  return data.questions as QuestionBankAdminItem[];
}

export async function getQuestionBankStats(
  token: string
): Promise<QuestionBankStats> {
  const data = await requestAdminApi(
    "/questions/stats",
    token,
    { method: "GET" }
  );

  if (!data.stats || typeof data.stats !== "object") {
    throw new Error("Invalid question bank statistics response.");
  }

  return data.stats as QuestionBankStats;
}

export async function exportQuestionBank(
  token: string
): Promise<QuestionBankAdminItem[]> {
  const data = await requestAdminApi(
    "/questions/export",
    token,
    { method: "GET" }
  );

  if (!Array.isArray(data.questions)) {
    throw new Error("Invalid question bank export response.");
  }

  return data.questions as QuestionBankAdminItem[];
}

export async function addQuestionToBank(
  token: string,
  payload: {
    category: string;
    difficulty: string;
    questionText: string;
    skills: string[];
    expectedConcepts: string[];
    roleContext?: string;
  }
): Promise<QuestionBankAdminItem> {
  const data = await requestAdminApi("/questions", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data.question || typeof data.question !== "object") {
    throw new Error("Unable to create admin question.");
  }

  return data.question as QuestionBankAdminItem;
}

export async function updateQuestionInBank(
  token: string,
  questionId: string,
  payload: {
    category: string;
    difficulty: string;
    questionText: string;
    skills: string[];
    expectedConcepts: string[];
    roleContext?: string;
  }
): Promise<QuestionBankAdminItem> {
  const data = await requestAdminApi(
    `/questions/${questionId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  if (!data.question || typeof data.question !== "object") {
    throw new Error("Unable to update the admin question.");
  }

  return data.question as QuestionBankAdminItem;
}

export async function deleteQuestionFromBank(
  token: string,
  questionId: string
): Promise<void> {
  await requestAdminApi(`/questions/${questionId}`, token, {
    method: "DELETE",
  });
}

// =========================================================
// MODEL MONITORING API
// =========================================================

export async function getModelMonitoring(
  token: string
): Promise<ModelMonitoringData> {
  const data = await requestAdminApi(
    "/model/monitoring",
    token,
    { method: "GET" }
  );

  if (!data.monitoring || typeof data.monitoring !== "object") {
    throw new Error("Invalid model monitoring response.");
  }

  return data.monitoring as ModelMonitoringData;
}

// =========================================================
// CANDIDATE MANAGEMENT API
// =========================================================

export async function getAdminCandidates(
  token: string,
  options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<AdminCandidatesResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 10),
  });

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  const data = await requestAdminApi(
    `/candidates?${params.toString()}`,
    token,
    { method: "GET" }
  );

  if (!Array.isArray(data.candidates) || !data.pagination) {
    throw new Error("Invalid candidate management response.");
  }

  return {
    success: true,
    candidates: data.candidates as AdminCandidate[],
    pagination: data.pagination as CandidatePagination,
  };
}

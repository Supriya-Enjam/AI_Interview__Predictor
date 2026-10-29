const API_BASE_URL = "http://localhost:5000/api/admin";

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

async function requestAdminApi(endpoint: string, token: string, options: RequestInit = {}) {
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
    throw new Error(data.message || `Admin request failed (${response.status})`);
  }

  return data;
}

export async function getQuestionBank(
  token: string,
  filters: { category?: string; difficulty?: string; search?: string } = {}
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

  const data = await requestAdminApi(`/questions${params.toString() ? `?${params.toString()}` : ""}`, token, { method: "GET" });

  if (!Array.isArray(data.questions)) {
    throw new Error("Invalid question bank response.");
  }

  return data.questions as QuestionBankAdminItem[];
}

export async function getQuestionBankStats(token: string): Promise<QuestionBankStats> {
  const data = await requestAdminApi("/questions/stats", token, { method: "GET" });

  if (!data.stats || typeof data.stats !== "object") {
    throw new Error("Invalid question bank statistics response.");
  }

  return data.stats as QuestionBankStats;
}

export async function exportQuestionBank(token: string): Promise<QuestionBankAdminItem[]> {
  const data = await requestAdminApi("/questions/export", token, { method: "GET" });

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
  const data = await requestAdminApi(`/questions/${questionId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

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

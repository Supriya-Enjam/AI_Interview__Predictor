
const API_BASE_URL = "http://localhost:5000/api/resumes";

// =========================================================
// RESUME QUESTION TYPES
// =========================================================

export interface ResumeQuestionResponse {
  success: boolean;
  message: string;
  data: {
    fileType: "pdf" | "docx";
    characterCount: number;
    targetRole: string;
    category: ResumeInterviewConfig["category"];
    difficulty: ResumeInterviewConfig["difficulty"];
    questions: string[];
  };
}

// =========================================================
// RESUME INTERVIEW TYPES
// =========================================================

export interface ResumeInterviewConfig {
  targetRole: string;
  category:
    | "technical"
    | "behavioral"
    | "mixed"
    | "hr"
    | "situational"
    | "coding";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: 10 | 15 | 30 | 45;
}

export interface ResumeInterview {
  id: string;
  targetRole: string;
  category: ResumeInterviewConfig["category"];
  difficulty: ResumeInterviewConfig["difficulty"];
  duration: number;
  questions: {
    questionId: string;
    questionText: string;
    category: string;
    order: number;
  }[];
  status: string;
  createdAt: string;
}

interface CreateResumeInterviewResponse {
  success: boolean;
  message: string;
  data: {
    interview: ResumeInterview;
  };
}

// =========================================================
// RESUME ANALYSIS TYPES
// =========================================================

export interface ResumeDetectedSkill {
  name: string;
  relatedConcepts: string[];
}

export interface ResumeAnalysis {
  targetRole: string;
  readinessScore: number;

  scoreBreakdown: {
    roleSkillCoverage: number;
    projectEvidence: number;
    experienceEvidence: number;
  };

  detectedSkills: ResumeDetectedSkill[];

  matchedSkills: string[];
  missingSkills: string[];

  strengths: string[];
  recommendations: string[];
  projects: string[];

  sections: {
    education: string[];
    experience: string[];
    projects: string[];
    certifications: string[];
  };

  analysisMethod: string;
}

export interface ResumeAnalysisResponse {
  success: boolean;
  message: string;
  data: {
    fileType: "pdf" | "docx";
    characterCount: number;
    analysis: ResumeAnalysis;
  };
}

// =========================================================
// SHARED API ERROR HANDLER
// =========================================================

async function getResponseData<T>(
  response: Response,
  defaultMessage: string
): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || `${defaultMessage} (${response.status}).`
    );
  }

  return data as T;
}

// =========================================================
// GENERATE RESUME QUESTIONS
// =========================================================

export async function generateResumeQuestions(
  token: string,
  file: File,
  config: Pick<
    ResumeInterviewConfig,
    "targetRole" | "category" | "difficulty"
  >
): Promise<ResumeQuestionResponse> {
  const formData = new FormData();

  formData.append("resume", file);
  formData.append("targetRole", config.targetRole);
  formData.append("category", config.category);
  formData.append("difficulty", config.difficulty);

  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return getResponseData<ResumeQuestionResponse>(
    response,
    "Resume upload failed"
  );
}
// =========================================================
// ANALYZE RESUME
// =========================================================

export async function analyzeResume(
  token: string,
  file: File,
  targetRole: string
): Promise<ResumeAnalysisResponse> {
  const formData = new FormData();

  formData.append("resume", file);
  formData.append("targetRole", targetRole);

  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await getResponseData<ResumeAnalysisResponse>(
    response,
    "Resume analysis failed"
  );

  if (!data.data?.analysis) {
    throw new Error("Resume analysis data is missing from the server response.");
  }

  return data;
}

// =========================================================
// CREATE RESUME-BASED INTERVIEW
// =========================================================

export async function createResumeInterview(
  token: string,
  file: File,
  config: ResumeInterviewConfig
): Promise<ResumeInterview> {
  const formData = new FormData();

  formData.append("resume", file);
  formData.append("targetRole", config.targetRole);
  formData.append("category", config.category);
  formData.append("difficulty", config.difficulty);
  formData.append("duration", String(config.duration));

  const response = await fetch(`${API_BASE_URL}/interviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await getResponseData<CreateResumeInterviewResponse>(
    response,
    "Could not create your resume interview"
  );

  if (!data.data?.interview?.id) {
    throw new Error("Interview details are missing from the server response.");
  }

  return data.data.interview;
}

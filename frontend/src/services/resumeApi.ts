
const API_BASE_URL = "http://localhost:5000/api/resumes";

export interface ResumeQuestionResponse {
  success: boolean;
  message: string;
  data: {
    fileType: "pdf" | "docx";
    characterCount: number;
    questions: string[];
  };
}

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

export async function generateResumeQuestions(
  token: string,
  file: File
): Promise<ResumeQuestionResponse> {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || `Resume upload failed (${response.status}).`
    );
  }

  return data as ResumeQuestionResponse;
}

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

  const data = (await response.json().catch(() => null)) as
    | CreateResumeInterviewResponse
    | null;

  if (!response.ok || !data?.success || !data.data?.interview?.id) {
    throw new Error(
      data?.message ||
        `Could not create your resume interview (${response.status}).`
    );
  }

  return data.data.interview;
}

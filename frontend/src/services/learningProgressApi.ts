
const API_BASE_URL = "http://localhost:5000/api/learning-progress";

export interface LearningProgressResponse {
  success: boolean;
  completedTopics: string[];
  message?: string;
}

async function handleResponse(
  response: Response
): Promise<LearningProgressResponse> {
  const data = (await response.json()) as LearningProgressResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to process learning progress."
    );
  }

  return data;
}

export async function getLearningProgress(
  token: string
): Promise<LearningProgressResponse> {
  const response = await fetch(API_BASE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

export async function saveLearningProgress(
  token: string,
  completedTopics: string[]
): Promise<LearningProgressResponse> {
  const response = await fetch(API_BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ completedTopics }),
  });

  return handleResponse(response);
}

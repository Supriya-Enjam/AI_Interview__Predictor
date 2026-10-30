
const API_BASE_URL = "http://localhost:5000/api/learning-progress";

// =========================================================
// TYPES
// =========================================================

export interface LearningProgressResponse {
  success: boolean;
  completedTopics: string[];
  message?: string;
}

export type LearningTaskPriority = "low" | "medium" | "high";

export type LearningTaskStatus = "pending" | "completed";

export interface LearningTask {
  _id: string;
  title: string;
  description?: string;
  priority: LearningTaskPriority;
  status: LearningTaskStatus;
  estimatedDuration?: number;
  progress: number;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningTasksResponse {
  success: boolean;
  tasks: LearningTask[];
  message?: string;
}

export interface LearningTaskResponse {
  success: boolean;
  task: LearningTask;
  message?: string;
}

export interface LearningTaskInput {
  title: string;
  description?: string;
  priority?: LearningTaskPriority;
  status?: LearningTaskStatus;
  estimatedDuration?: number;
  progress?: number;
}

export type LearningTaskUpdate = Partial<LearningTaskInput>;

// =========================================================
// COMMON RESPONSE HANDLER
// =========================================================

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to process your learning request."
    );
  }

  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// =========================================================
// COMPLETED TOPIC PROGRESS
// =========================================================

export async function getLearningProgress(
  token: string
): Promise<LearningProgressResponse> {
  const response = await fetch(API_BASE_URL, {
    method: "GET",
    headers: authHeaders(token),
  });

  return handleResponse<LearningProgressResponse>(response);
}

export async function saveLearningProgress(
  token: string,
  completedTopics: string[]
): Promise<LearningProgressResponse> {
  const response = await fetch(API_BASE_URL, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completedTopics }),
  });

  return handleResponse<LearningProgressResponse>(response);
}

// =========================================================
// LEARNING TASK CRUD
// =========================================================

// Get all learning tasks
export async function getLearningTasks(
  token: string
): Promise<LearningTasksResponse> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "GET",
    headers: authHeaders(token),
  });

  return handleResponse<LearningTasksResponse>(response);
}

// Create a learning task
export async function createLearningTask(
  token: string,
  task: LearningTaskInput
): Promise<LearningTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  return handleResponse<LearningTaskResponse>(response);
}

// Update a learning task
export async function updateLearningTask(
  token: string,
  taskId: string,
  updates: LearningTaskUpdate
): Promise<LearningTaskResponse> {
  const response = await fetch(
    `${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  return handleResponse<LearningTaskResponse>(response);
}

// Delete a learning task
export async function deleteLearningTask(
  token: string,
  taskId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );

  return handleResponse<{ success: boolean; message: string }>(response);
}

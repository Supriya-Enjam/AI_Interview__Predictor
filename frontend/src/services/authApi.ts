
const API_BASE_URL = "http://localhost:5000/api/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "admin";
  targetRole: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

export interface LoginChallengeResponse {
  success: boolean;
  requiresOtp: true;
  challengeId: string;
  message: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

async function sendAuthRequest<T>(
  endpoint: "register" | "login",
  data: RegisterData | LoginData
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Authentication failed.");
  }

  return result as T;
}

export function registerUser(
  data: RegisterData
): Promise<AuthResponse> {
  return sendAuthRequest<AuthResponse>("register", data);
}

export function loginUser(
  data: LoginData
): Promise<LoginChallengeResponse> {
  return sendAuthRequest<LoginChallengeResponse>("login", data);
}

export async function verifyLoginOtp(
  challengeId: string,
  otp: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ challengeId, otp }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to verify the OTP.");
  }

  return result as AuthResponse;
}



export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Unable to request a password reset."
    );
  }

  return result;
}

export async function resetPassword(
  email: string,
  token: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, token, password }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to reset your password.");
  }

  return result;
}

export async function loginWithGoogle(
  idToken: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Google sign-in failed.");
  }

  return result as AuthResponse;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

export async function getMyProfile(
  token: string
): Promise<ProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load your profile.");
  }

  return result as ProfileResponse;
}

export async function updateMyProfile(
  token: string,
  profile: { name: string; targetRole: string }
): Promise<ProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to update your profile.");
  }

  return result as ProfileResponse;
}
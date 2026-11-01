/**
 * Kontrak dan fungsi autentikasi backend.
 *
 * Token disimpan di cookie httpOnly; fungsi di sini tidak pernah membaca token
 * dari JavaScript.
 */

import { apiGet, apiPost } from "./client";

export type UserRole = "admin" | "operator" | "qc";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthSession {
  user: AuthUser;
  access_expires_at: string;
  refresh_expires_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export function login(payload: LoginPayload): Promise<AuthSession> {
  return apiPost<AuthSession>("/api/auth/login", payload);
}

export function refreshSession(): Promise<AuthSession> {
  return apiPost<AuthSession>("/api/auth/refresh");
}

export function logout(): Promise<MessageResponse> {
  return apiPost<MessageResponse>("/api/auth/logout");
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me");
}

export const authApi = {
  login,
  refresh: refreshSession,
  logout,
  me: getCurrentUser,
} as const;

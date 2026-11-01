/**
 * Kontrak dan fungsi autentikasi backend.
 *
 * Token disimpan di cookie httpOnly; fungsi di sini tidak pernah membaca token
 * dari JavaScript.
 */

import type { UserRole } from "@/types";
import { apiGet, apiPost, type MessageResponse } from "./client";

export type { UserRole } from "@/types";

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

export function login(payload: LoginPayload): Promise<AuthSession> {
  return apiPost<AuthSession>("/api/auth/login", payload, {
    skipAuthRefresh: true,
  });
}

export function refreshSession(): Promise<AuthSession> {
  return apiPost<AuthSession>("/api/auth/refresh", undefined, {
    skipAuthRefresh: true,
  });
}

export function logout(): Promise<MessageResponse> {
  return apiPost<MessageResponse>("/api/auth/logout", undefined, {
    skipAuthRefresh: true,
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me", {
    skipAuthRefresh: true,
  });
}

export const authApi = {
  login,
  refresh: refreshSession,
  logout,
  me: getCurrentUser,
} as const;

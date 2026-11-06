import type {
  CatalogListResponse,
  UserActiveFilter,
  UserRecord,
  UserRole,
} from "@/types";
import { apiDelete, apiGet, apiPatch, apiPost, type MessageResponse } from "./client";

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  active?: UserActiveFilter;
}

export interface UserCreateInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  is_active?: boolean;
}

export interface UserUpdateInput {
  email?: string;
  name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export function listUsers(
  params: UserListParams = {},
): Promise<CatalogListResponse<UserRecord>> {
  return apiGet<CatalogListResponse<UserRecord>>("/api/users", {
    query: {
      page: params.page,
      page_size: params.page_size,
      search: params.search,
      active: params.active,
    },
  });
}

export function createUser(input: UserCreateInput): Promise<UserRecord> {
  return apiPost<UserRecord>("/api/users", input);
}

export function updateUser(
  id: string,
  input: UserUpdateInput,
): Promise<UserRecord> {
  return apiPatch<UserRecord>(`/api/users/${id}`, input);
}

export function resetUserPassword(
  id: string,
  newPassword: string,
): Promise<MessageResponse> {
  return apiPost<MessageResponse>(`/api/users/${id}/reset-password`, {
    new_password: newPassword,
  });
}

export function deactivateUser(id: string): Promise<void> {
  return apiDelete<void>(`/api/users/${id}`);
}

export const usersApi = {
  list: listUsers,
  create: createUser,
  update: updateUser,
  resetPassword: resetUserPassword,
  deactivate: deactivateUser,
} as const;

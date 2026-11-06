import type { UserRole } from "@/types";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function isPasswordValid(value: string): boolean {
  return passwordPolicyError(value) === null;
}

export function passwordPolicyError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (!/[A-Za-z]/.test(value)) {
    return "Kata sandi harus memuat huruf.";
  }
  if (!/\d/.test(value)) {
    return "Kata sandi harus memuat angka.";
  }
  return null;
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === "admin";
}

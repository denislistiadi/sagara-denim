import type { DashboardSummary } from "@/types";
import { apiGet } from "./client";

export function getDashboard(
  options: { signal?: AbortSignal } = {},
): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/api/dashboard", {
    signal: options.signal,
  });
}

export const dashboardApi = {
  get: getDashboard,
} as const;

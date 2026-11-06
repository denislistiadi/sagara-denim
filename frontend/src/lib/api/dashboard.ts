import type { DashboardSummary } from "@/types";
import { apiGet } from "./client";

export function getDashboard(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/api/dashboard");
}

export const dashboardApi = {
  get: getDashboard,
} as const;

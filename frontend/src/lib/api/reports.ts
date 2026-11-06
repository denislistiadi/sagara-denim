import type {
  ProductionReportResponse,
  ProductionStage,
} from "@/types";
import { apiDownload, apiGet } from "./client";

export interface ProductionReportQuery {
  start_date: string;
  end_date: string;
  stage?: ProductionStage | null;
  order_id?: string | null;
}

export interface ProductionReportListQuery extends ProductionReportQuery {
  page?: number;
  page_size?: number;
}

export function getProductionReport(
  query: ProductionReportListQuery,
  options: { signal?: AbortSignal } = {},
): Promise<ProductionReportResponse> {
  return apiGet<ProductionReportResponse>("/api/reports/production", {
    query: { ...query },
    signal: options.signal,
  });
}

export async function downloadProductionReportCsv(
  query: ProductionReportQuery,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiDownload("/api/reports/production/export", {
    query: { ...query },
    headers: { Accept: "text/csv" },
  });

  const blob = await response.blob();
  const filename =
    parseContentDisposition(response.headers.get("content-disposition")) ??
    fallbackFilename(query);

  return { blob, filename };
}

function parseContentDisposition(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

function fallbackFilename(query: ProductionReportQuery): string {
  const suffix = query.stage ? `-${query.stage}` : "";
  return `laporan-produksi-${query.start_date}_${query.end_date}${suffix}.csv`;
}

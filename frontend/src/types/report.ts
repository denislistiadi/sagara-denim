/** Tipe laporan produksi dan export CSV. */

import type {
  CustomerSummary,
  UserSummary,
} from "./common";
import type { OrderStatus } from "./order";

export type ProductionStage = "cutting" | "jahit" | "finishing" | "qc";

export interface ProductionReportFilters {
  start_date: string;
  end_date: string;
  stage: ProductionStage | null;
  order_id: string | null;
}

export interface ProductionReportSummary {
  total_output: number;
  total_reject: number;
  total_scrap: number;
  reject_ratio: number;
  scrap_ratio: number;
  orders_logged: number;
  logs_count: number;
  days_count: number;
}

export interface ProductionReportDaily {
  date: string;
  output_qty: number;
  reject_qty: number;
  scrap_qty: number;
  reject_ratio: number;
  scrap_ratio: number;
  logs_count: number;
}

export interface ProductionReportStage {
  stage: ProductionStage;
  output_qty: number;
  reject_qty: number;
  scrap_qty: number;
  reject_ratio: number;
  scrap_ratio: number;
  logs_count: number;
}

export interface ProductionReportLog {
  id: string;
  order_id: string;
  order_code: string;
  customer: CustomerSummary | null;
  stage: ProductionStage;
  log_date: string;
  output_qty: number;
  reject_qty: number;
  scrap_qty: number;
  reject_ratio: number;
  scrap_ratio: number;
  notes: string | null;
  created_by: UserSummary | null;
  created_at: string;
  order_status: OrderStatus;
  order_archived: boolean;
}

export interface ProductionReportLogList {
  items: ProductionReportLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProductionReportResponse {
  filters: ProductionReportFilters;
  summary: ProductionReportSummary;
  daily: ProductionReportDaily[];
  stages: ProductionReportStage[];
  logs: ProductionReportLogList;
}

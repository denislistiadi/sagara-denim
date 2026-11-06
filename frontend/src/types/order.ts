/** Tipe domain perintah produksi, workflow, dan antrean. */

import type {
  CustomerSummary,
  ProductSummary,
  UserSummary,
} from "./common";

export type OrderStatus =
  | "menunggu"
  | "cutting"
  | "jahit"
  | "finishing"
  | "qc"
  | "selesai"
  | "dibatalkan";

export type Priority = "tinggi" | "normal" | "rendah";

export interface ProductionOrderItem {
  id: string;
  product: ProductSummary;
  quantity: number;
  notes: string | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: UserSummary | null;
  notes: string | null;
  created_at: string;
}

export interface ProductionLogEntry {
  id: string;
  stage: OrderStatus;
  log_date: string;
  output_qty: number;
  reject_qty: number;
  notes: string | null;
  created_by: UserSummary | null;
  created_at: string;
}

export interface ProductionOrderListItem {
  id: string;
  code: string;
  customer: CustomerSummary | null;
  pic: UserSummary | null;
  status: OrderStatus;
  priority: Priority;
  deadline: string | null;
  total_quantity: number;
  item_count: number;
  model_summary: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderDetail extends ProductionOrderListItem {
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: UserSummary | null;
  items: ProductionOrderItem[];
  status_history: OrderStatusHistoryEntry[];
  production_logs: ProductionLogEntry[];
}

export interface ProductionOrderListResponse {
  items: ProductionOrderListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProductionQueueStage {
  status: OrderStatus;
  order_count: number;
  total_quantity: number;
  orders: ProductionOrderListItem[];
}

export interface ProductionQueueResponse {
  stages: ProductionQueueStage[];
  total_orders: number;
  total_quantity: number;
}

export interface ProductionStatusUpdateInput {
  expected_status: OrderStatus;
  to_status: OrderStatus;
  notes?: string | null;
}

export interface ProductionLogInput {
  log_date?: string;
  output_qty: number;
  reject_qty: number;
  notes?: string | null;
}

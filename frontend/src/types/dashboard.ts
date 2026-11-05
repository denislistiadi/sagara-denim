/** Tipe ringkasan dashboard produksi. */

import type { StockStatus } from "./material";
import type { OrderStatus, Priority } from "./order";
import type { ProductionStage } from "./report";

export interface DashboardKpis {
  active_orders: number;
  new_orders_today: number;
  today_output: number;
  yesterday_output: number;
  today_reject: number;
  today_reject_ratio: number;
  on_time_delivery_ratio: number | null;
  completed_orders_30d: number;
  on_time_orders_30d: number;
}

export interface DashboardDailyOutput {
  date: string;
  output_qty: number;
}

export interface DashboardRejectStage {
  stage: ProductionStage;
  reject_qty: number;
}

export interface DashboardPipelineStage {
  status: OrderStatus;
  order_count: number;
  total_quantity: number;
}

export interface DashboardDeadline {
  id: string;
  code: string;
  model_summary: string;
  customer_name: string | null;
  deadline: string;
  priority: Priority;
  status: OrderStatus;
  is_overdue: boolean;
}

export interface DashboardStockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: string;
  minimum_stock: string;
  status: StockStatus;
  percent: number;
}

export interface DashboardSummary {
  business_date: string;
  generated_at: string;
  kpis: DashboardKpis;
  daily_output: DashboardDailyOutput[];
  reject_breakdown: DashboardRejectStage[];
  pipeline: DashboardPipelineStage[];
  upcoming_deadlines: DashboardDeadline[];
  critical_stock: DashboardStockItem[];
}

export type OrderStatus =
  | "menunggu"
  | "cutting"
  | "jahit"
  | "finishing"
  | "qc"
  | "selesai"
  | "dibatalkan";

export type Priority = "tinggi" | "normal" | "rendah";

export type UserRole = "admin" | "operator" | "qc";

export type Tone = "orange" | "green" | "blue" | "purple" | "amber" | "red";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface UserSummary {
  id: string;
  name: string;
  role: UserRole;
}

export interface CustomerSummary {
  id: string;
  code: string;
  name: string;
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  size: string | null;
  color: string | null;
}

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

export type StockStatus = "habis" | "kritis" | "menipis" | "aman";

export type StockMovementType = "masuk" | "keluar" | "penyesuaian";

export interface MaterialSummary {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: string;
  minimum_stock: string;
  status: StockStatus;
  is_active: boolean;
  updated_at: string;
}

export interface MaterialDetail extends MaterialSummary {
  movement_count: number;
  created_at: string;
}

export interface MaterialInventorySummary {
  total_active: number;
  out_of_stock: number;
  below_minimum: number;
  categories: string[];
}

export interface MaterialListResponse {
  items: MaterialSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: MaterialInventorySummary;
}

export interface ProductionOrderRef {
  id: string;
  code: string;
}

export interface StockMovement {
  id: string;
  material_id: string;
  movement_type: StockMovementType;
  quantity: string;
  stock_before: string | null;
  stock_after: string | null;
  note: string | null;
  production_order: ProductionOrderRef | null;
  created_by: UserSummary | null;
  created_at: string;
}

export interface StockMovementListResponse {
  items: StockMovement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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

/** Bentuk lama untuk data contoh di Design System. */
export interface ProductionOrder {
  id: string;
  code: string;
  model: string;
  customer: string;
  quantity: number;
  status: OrderStatus;
  progress: number;
  deadline: string;
  pic: string;
  priority: Priority;
}

export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  tone: Tone;
  subtext: string;
  trend?: string;
  trendDirection?: "up" | "down";
}

export interface OutputPoint {
  day: string;
  value: number;
}

export interface RejectPoint {
  label: string;
  value: number;
  color: string;
}

export interface PipelineStage {
  label: string;
  count: number;
  percent: number;
  icon: string;
  color: string;
}

export interface DeadlineItem {
  code: string;
  model: string;
  customer: string;
  deadline: string;
  priority: Priority;
}

export interface StockItem {
  name: string;
  detail: string;
  stock: string;
  percent: number;
  status: "Kritis" | "Menipis" | "Aman";
}

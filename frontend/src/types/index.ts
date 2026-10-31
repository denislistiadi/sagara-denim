export type OrderStatus =
  | "Menunggu"
  | "Cutting"
  | "Jahit"
  | "Finishing"
  | "QC"
  | "Selesai"
  | "Dibatalkan";

export type Priority = "Tinggi" | "Normal" | "Rendah";

export type Tone = "orange" | "green" | "blue" | "purple" | "amber" | "red";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

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

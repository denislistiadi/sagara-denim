/**
 * Tipe "bentuk lama" untuk data contoh pada Design System.
 *
 * Tipe ini hanya dipakai oleh galeri komponen dan mock-data, bukan oleh
 * respons API produksi. Jangan pakai untuk kode baru.
 */

import type { Tone } from "./common";
import type { OrderStatus, Priority } from "./order";

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
  isOverdue?: boolean;
}

export interface StockItem {
  name: string;
  detail: string;
  stock: string;
  percent: number;
  status: "Habis" | "Kritis" | "Menipis" | "Aman";
}

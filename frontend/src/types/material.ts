/** Tipe data bahan, aksesoris, dan mutasi stok. */

import type { UserSummary } from "./common";

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

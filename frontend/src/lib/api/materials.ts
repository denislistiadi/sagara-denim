import type {
  MaterialDetail,
  MaterialListResponse,
  StockMovement,
  StockMovementListResponse,
  StockMovementType,
  StockStatus,
} from "@/types";
import { apiGet, apiPatch, apiPost } from "./client";

export type MaterialActiveFilter = "aktif" | "nonaktif" | "semua";

export interface MaterialFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  stock_status?: StockStatus;
  low_stock?: boolean;
  active?: MaterialActiveFilter;
}

export interface MaterialCreateInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  minimum_stock: string;
  initial_stock?: string;
  is_active?: boolean;
}

export interface MaterialUpdateInput {
  sku?: string;
  name?: string;
  category?: string;
  unit?: string;
  minimum_stock?: string;
  is_active?: boolean;
}

export interface StockMovementFilters {
  page?: number;
  page_size?: number;
  movement_type?: StockMovementType;
}

export interface StockMovementCreateInput {
  movement_type: StockMovementType;
  quantity?: string;
  target_stock?: string;
  note?: string | null;
  production_order_id?: string | null;
}

export function listMaterials(
  filters: MaterialFilters = {},
  options: { signal?: AbortSignal } = {},
): Promise<MaterialListResponse> {
  return apiGet<MaterialListResponse>("/api/materials", {
    query: { ...filters },
    signal: options.signal,
  });
}

export function getMaterial(
  id: string,
  options: { signal?: AbortSignal } = {},
): Promise<MaterialDetail> {
  return apiGet<MaterialDetail>(
    `/api/materials/${encodeURIComponent(id)}`,
    { signal: options.signal },
  );
}

export function createMaterial(
  payload: MaterialCreateInput,
): Promise<MaterialDetail> {
  return apiPost<MaterialDetail>("/api/materials", payload);
}

export function updateMaterial(
  id: string,
  payload: MaterialUpdateInput,
): Promise<MaterialDetail> {
  return apiPatch<MaterialDetail>(
    `/api/materials/${encodeURIComponent(id)}`,
    payload,
  );
}

export function listMaterialMovements(
  id: string,
  filters: StockMovementFilters = {},
  options: { signal?: AbortSignal } = {},
): Promise<StockMovementListResponse> {
  return apiGet<StockMovementListResponse>(
    `/api/materials/${encodeURIComponent(id)}/movements`,
    { query: { ...filters }, signal: options.signal },
  );
}

export function createMaterialMovement(
  id: string,
  payload: StockMovementCreateInput,
): Promise<StockMovement> {
  return apiPost<StockMovement>(
    `/api/materials/${encodeURIComponent(id)}/movements`,
    payload,
  );
}

export const materialsApi = {
  list: listMaterials,
  detail: getMaterial,
  create: createMaterial,
  update: updateMaterial,
  movements: listMaterialMovements,
  createMovement: createMaterialMovement,
} as const;

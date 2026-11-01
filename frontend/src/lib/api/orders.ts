import type {
  OrderStatus,
  Priority,
  ProductionOrderDetail,
  ProductionOrderListResponse,
} from "@/types";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type MessageResponse,
} from "./client";

export interface ProductionOrderFilters {
  page?: number;
  page_size?: number;
  search?: string;
  status?: OrderStatus;
  priority?: Priority;
  customer_id?: string;
}

export interface ProductionOrderItemInput {
  product_id: string;
  quantity: number;
  notes?: string | null;
}

export interface ProductionOrderCreateInput {
  customer_id?: string | null;
  pic_id?: string | null;
  priority?: Priority;
  deadline?: string | null;
  notes?: string | null;
  items: ProductionOrderItemInput[];
}

export type ProductionOrderUpdateInput = Partial<ProductionOrderCreateInput>;

export function listProductionOrders(
  filters: ProductionOrderFilters = {},
): Promise<ProductionOrderListResponse> {
  return apiGet<ProductionOrderListResponse>("/api/production-orders", {
    query: { ...filters },
  });
}

export function getProductionOrder(
  id: string,
): Promise<ProductionOrderDetail> {
  return apiGet<ProductionOrderDetail>(
    `/api/production-orders/${encodeURIComponent(id)}`,
  );
}

export function createProductionOrder(
  payload: ProductionOrderCreateInput,
): Promise<ProductionOrderDetail> {
  return apiPost<ProductionOrderDetail>("/api/production-orders", payload);
}

export function updateProductionOrder(
  id: string,
  payload: ProductionOrderUpdateInput,
): Promise<ProductionOrderDetail> {
  return apiPatch<ProductionOrderDetail>(
    `/api/production-orders/${encodeURIComponent(id)}`,
    payload,
  );
}

export function archiveProductionOrder(id: string): Promise<MessageResponse> {
  return apiDelete<MessageResponse>(
    `/api/production-orders/${encodeURIComponent(id)}`,
  );
}

export const productionOrdersApi = {
  list: listProductionOrders,
  detail: getProductionOrder,
  create: createProductionOrder,
  update: updateProductionOrder,
  archive: archiveProductionOrder,
} as const;

import type {
  OrderStatus,
  Priority,
  ProductionLogInput,
  ProductionOrderDetail,
  ProductionOrderListResponse,
  ProductionQueueResponse,
  ProductionStatusUpdateInput,
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

export interface ProductionQueueFilters {
  search?: string;
  priority?: Priority;
  limit_per_stage?: number;
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
  options: { signal?: AbortSignal } = {},
): Promise<ProductionOrderListResponse> {
  return apiGet<ProductionOrderListResponse>("/api/production-orders", {
    query: { ...filters },
    signal: options.signal,
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

export function getProductionQueue(
  filters: ProductionQueueFilters = {},
  options: { signal?: AbortSignal } = {},
): Promise<ProductionQueueResponse> {
  return apiGet<ProductionQueueResponse>("/api/production-orders/queue", {
    query: { ...filters },
    signal: options.signal,
  });
}

export function transitionProductionOrder(
  id: string,
  payload: ProductionStatusUpdateInput,
): Promise<ProductionOrderDetail> {
  return apiPatch<ProductionOrderDetail>(
    `/api/production-orders/${encodeURIComponent(id)}/status`,
    payload,
  );
}

export function createProductionLog(
  id: string,
  payload: ProductionLogInput,
): Promise<ProductionOrderDetail> {
  return apiPost<ProductionOrderDetail>(
    `/api/production-orders/${encodeURIComponent(id)}/logs`,
    payload,
  );
}

export const productionOrdersApi = {
  list: listProductionOrders,
  detail: getProductionOrder,
  create: createProductionOrder,
  update: updateProductionOrder,
  archive: archiveProductionOrder,
  queue: getProductionQueue,
  transition: transitionProductionOrder,
  createLog: createProductionLog,
} as const;

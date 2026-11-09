import type { MaterialActiveFilter } from "@/lib/api/materials";
import type {
  CatalogActiveFilter,
  OrderStatus,
  Priority,
  ProductionStage,
  StockMovementType,
  StockStatus,
  UserActiveFilter,
} from "@/types";
import { QUERY_ROOTS, QUERY_SEGMENTS } from "./config";

export interface CatalogListFilters {
  active: CatalogActiveFilter;
}

export interface UserListFilters {
  active: UserActiveFilter;
}

export interface MaterialListFilters {
  active: MaterialActiveFilter;
  category?: string;
  stockStatus?: StockStatus;
  lowStock?: boolean;
}

export interface MaterialMovementFilters {
  movementType?: StockMovementType;
}

export interface OrderListFilters {
  status?: OrderStatus;
  priority?: Priority;
}

export interface QueueFilters {
  search?: string;
  priority?: Priority;
}

export interface ProductionReportFilters {
  startDate: string;
  endDate: string;
  stage?: ProductionStage;
  orderId?: string;
  page: number;
  pageSize: number;
}

/**
 * Satu-satunya sumber query key aplikasi.
 *
 * Filter yang memengaruhi respons wajib menjadi bagian key agar cache tidak
 * tercampur antar kombinasi filter. Halaman dan kata kunci untuk daftar
 * berpaginasi ditambahkan oleh `usePaginatedList`.
 */
export const queryKeys = {
  dashboard: () => [QUERY_ROOTS.dashboard] as const,

  customers: {
    root: () => [QUERY_ROOTS.customers] as const,
    list: (filters: CatalogListFilters) =>
      [QUERY_ROOTS.customers, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.customers, QUERY_SEGMENTS.options] as const,
  },

  products: {
    root: () => [QUERY_ROOTS.products] as const,
    list: (filters: CatalogListFilters) =>
      [QUERY_ROOTS.products, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.products, QUERY_SEGMENTS.options] as const,
  },

  users: {
    root: () => [QUERY_ROOTS.users] as const,
    list: (filters: UserListFilters) =>
      [QUERY_ROOTS.users, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.users, QUERY_SEGMENTS.options] as const,
  },

  materials: {
    root: () => [QUERY_ROOTS.materials] as const,
    list: (filters: MaterialListFilters) =>
      [QUERY_ROOTS.materials, QUERY_SEGMENTS.list, filters] as const,
    detail: (id: string) =>
      [QUERY_ROOTS.materials, QUERY_SEGMENTS.detail, id] as const,
    movements: (id: string, filters: MaterialMovementFilters) =>
      [
        QUERY_ROOTS.materials,
        QUERY_SEGMENTS.movements,
        id,
        filters,
      ] as const,
    movementsRoot: (id: string) =>
      [QUERY_ROOTS.materials, QUERY_SEGMENTS.movements, id] as const,
  },

  orders: {
    root: () => [QUERY_ROOTS.orders] as const,
    listRoot: () => [QUERY_ROOTS.orders, QUERY_SEGMENTS.list] as const,
    queueRoot: () => [QUERY_ROOTS.orders, QUERY_SEGMENTS.queue] as const,
    list: (filters: OrderListFilters) =>
      [QUERY_ROOTS.orders, QUERY_SEGMENTS.list, filters] as const,
    queue: (filters: QueueFilters) =>
      [QUERY_ROOTS.orders, QUERY_SEGMENTS.queue, filters] as const,
    detail: (id: string) =>
      [QUERY_ROOTS.orders, QUERY_SEGMENTS.detail, id] as const,
    options: () => [QUERY_ROOTS.orders, QUERY_SEGMENTS.options] as const,
  },

  reports: {
    root: () => [QUERY_ROOTS.reports] as const,
    productionRoot: () =>
      [QUERY_ROOTS.reports, QUERY_SEGMENTS.production] as const,
    production: (filters: ProductionReportFilters) =>
      [
        QUERY_ROOTS.reports,
        QUERY_SEGMENTS.production,
        filters,
      ] as const,
  },
} as const;

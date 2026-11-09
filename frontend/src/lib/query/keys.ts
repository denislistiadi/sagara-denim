import type { MaterialActiveFilter } from "@/lib/api/materials";
import type {
  CatalogActiveFilter,
  OrderStatus,
  Priority,
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

export interface OrderListFilters {
  status?: OrderStatus;
  priority?: Priority;
}

export interface QueueFilters {
  search?: string;
  priority?: Priority;
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
    list: (filters: CatalogListFilters) =>
      [QUERY_ROOTS.customers, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.customers, QUERY_SEGMENTS.options] as const,
  },

  products: {
    list: (filters: CatalogListFilters) =>
      [QUERY_ROOTS.products, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.products, QUERY_SEGMENTS.options] as const,
  },

  users: {
    list: (filters: UserListFilters) =>
      [QUERY_ROOTS.users, QUERY_SEGMENTS.list, filters] as const,
    options: () => [QUERY_ROOTS.users, QUERY_SEGMENTS.options] as const,
  },

  materials: {
    list: (filters: MaterialListFilters) =>
      [QUERY_ROOTS.materials, QUERY_SEGMENTS.list, filters] as const,
  },

  orders: {
    list: (filters: OrderListFilters) =>
      [QUERY_ROOTS.orders, QUERY_SEGMENTS.list, filters] as const,
    queue: (filters: QueueFilters) =>
      [QUERY_ROOTS.orders, QUERY_SEGMENTS.queue, filters] as const,
  },
} as const;

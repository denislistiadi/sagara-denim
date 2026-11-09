import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getDashboard,
  getMaterial,
  getProductionOrder,
  getProductionQueue,
  getProductionReport,
  listCustomerOptions,
  listProductOptions,
  listProductionOrders,
  listUserOptions,
} from "@/lib/api";
import {
  queryKeys,
  type ProductionReportFilters,
  type QueueFilters,
} from "./keys";

/**
 * Definisi query membaca data.
 *
 * Key, query function, dan opsi berada di satu tempat agar pemakaian di
 * komponen cukup memanggil definisi yang sama.
 */

export const dashboardQuery = () =>
  queryOptions({
    queryKey: queryKeys.dashboard(),
    queryFn: ({ signal }) => getDashboard({ signal }),
  });

export const productionQueueQuery = (filters: QueueFilters) =>
  queryOptions({
    queryKey: queryKeys.orders.queue(filters),
    queryFn: ({ signal }) => getProductionQueue(filters, { signal }),
    placeholderData: keepPreviousData,
  });

export const customerOptionsQuery = () =>
  queryOptions({
    queryKey: queryKeys.customers.options(),
    queryFn: ({ signal }) => listCustomerOptions(undefined, { signal }),
  });

export const productOptionsQuery = () =>
  queryOptions({
    queryKey: queryKeys.products.options(),
    queryFn: ({ signal }) => listProductOptions(undefined, { signal }),
  });

export const userOptionsQuery = () =>
  queryOptions({
    queryKey: queryKeys.users.options(),
    queryFn: ({ signal }) => listUserOptions({ signal }),
  });

export const productionOrderDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.orders.detail(id),
    queryFn: ({ signal }) => getProductionOrder(id, { signal }),
    enabled: Boolean(id),
  });

export const productionOrderOptionsQuery = () =>
  queryOptions({
    queryKey: queryKeys.orders.options(),
    queryFn: ({ signal }) =>
      listProductionOrders({ page: 1, page_size: 50 }, { signal }),
  });

export const materialDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.materials.detail(id),
    queryFn: ({ signal }) => getMaterial(id, { signal }),
    enabled: Boolean(id),
  });

export const productionReportQuery = (filters: ProductionReportFilters) =>
  queryOptions({
    queryKey: queryKeys.reports.production(filters),
    queryFn: ({ signal }) =>
      getProductionReport(
        {
          start_date: filters.startDate,
          end_date: filters.endDate,
          stage: filters.stage ?? null,
          order_id: filters.orderId ?? null,
          page: filters.page,
          page_size: filters.pageSize,
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
  });

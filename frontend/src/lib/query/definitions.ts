import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getDashboard,
  getProductionQueue,
  listCustomerOptions,
  listProductOptions,
  listUserOptions,
} from "@/lib/api";
import { queryKeys, type QueueFilters } from "./keys";

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

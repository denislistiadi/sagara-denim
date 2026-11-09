import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

/**
 * Invalidasi cache setelah mutasi.
 *
 * Setiap domain memiliki satu titik masuk agar komponen tidak perlu menghafal
 * kombinasi key yang terdampak. Invalidasi dijalankan tanpa menunggu agar
 * dialog dapat langsung ditutup; query yang sedang aktif akan memuat ulang.
 */

export type CatalogDomain = "customers" | "products" | "users";

export function invalidateCatalogData(
  queryClient: QueryClient,
  domain: CatalogDomain,
): void {
  const root =
    domain === "customers"
      ? queryKeys.customers.root()
      : domain === "products"
        ? queryKeys.products.root()
        : queryKeys.users.root();

  void queryClient.invalidateQueries({ queryKey: root });
}

export function invalidateMaterialData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.materials.root(),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
}

export function invalidateOrderLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orders.listRoot(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orders.queueRoot(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orders.options(),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.reports.root() });
}

export function invalidateOrderDetail(
  queryClient: QueryClient,
  id: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orders.detail(id),
  });
}

export function removeOrderDetail(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.removeQueries({ queryKey: queryKeys.orders.detail(id) });
}

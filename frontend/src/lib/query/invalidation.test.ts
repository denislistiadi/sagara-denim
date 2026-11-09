import { describe, expect, it } from "vitest";
import {
  invalidateCatalogData,
  invalidateMaterialData,
  invalidateOrderDetail,
  invalidateOrderLists,
  removeOrderDetail,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { createTestQueryClient } from "@/test/query";

function isInvalidated(
  queryClient: ReturnType<typeof createTestQueryClient>,
  key: readonly unknown[],
): boolean {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey: key })
    .every((query) => query.state.isInvalidated);
}

describe("invalidasi cache", () => {
  it("hanya membersihkan domain katalog yang dipilih", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.customers.list({ active: "aktif" }), []);
    queryClient.setQueryData(queryKeys.customers.options(), []);
    queryClient.setQueryData(queryKeys.products.list({ active: "aktif" }), []);

    invalidateCatalogData(queryClient, "customers");

    expect(
      isInvalidated(queryClient, queryKeys.customers.root()),
    ).toBe(true);
    expect(
      isInvalidated(queryClient, queryKeys.products.root()),
    ).toBe(false);
  });

  it("menandai detail, daftar, dan dashboard bahan sebagai basi", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.materials.detail("mat-1"), {});
    queryClient.setQueryData(queryKeys.materials.list({ active: "aktif" }), [
      {},
    ]);
    queryClient.setQueryData(queryKeys.dashboard(), {});

    invalidateMaterialData(queryClient);

    expect(isInvalidated(queryClient, queryKeys.materials.root())).toBe(true);
    expect(isInvalidated(queryClient, queryKeys.dashboard())).toBe(true);
  });

  it("menandai daftar, antrean, options, dan laporan order sebagai basi", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.orders.list({}), { items: [] });
    queryClient.setQueryData(queryKeys.orders.queue({}), { stages: [] });
    queryClient.setQueryData(queryKeys.orders.options(), { items: [] });
    queryClient.setQueryData(queryKeys.reports.productionRoot(), {});
    queryClient.setQueryData(queryKeys.dashboard(), {});

    invalidateOrderLists(queryClient);

    expect(isInvalidated(queryClient, queryKeys.orders.listRoot())).toBe(
      true,
    );
    expect(isInvalidated(queryClient, queryKeys.orders.queueRoot())).toBe(
      true,
    );
    expect(
      isInvalidated(queryClient, queryKeys.orders.options()),
    ).toBe(true);
    expect(isInvalidated(queryClient, queryKeys.reports.root())).toBe(true);
    expect(isInvalidated(queryClient, queryKeys.dashboard())).toBe(true);
  });

  it("menginvalidasi atau menghapus detail order tertentu saja", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.orders.detail("ord-1"), {});
    queryClient.setQueryData(queryKeys.orders.detail("ord-2"), {});

    invalidateOrderDetail(queryClient, "ord-1");
    expect(isInvalidated(queryClient, queryKeys.orders.detail("ord-1"))).toBe(
      true,
    );
    expect(isInvalidated(queryClient, queryKeys.orders.detail("ord-2"))).toBe(
      false,
    );

    removeOrderDetail(queryClient, "ord-1");
    expect(
      queryClient.getQueryData(queryKeys.orders.detail("ord-1")),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(queryKeys.orders.detail("ord-2")),
    ).toEqual({});
  });
});

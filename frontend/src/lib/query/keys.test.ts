import { describe, expect, it } from "vitest";
import { QUERY_ROOTS, QUERY_SEGMENTS } from "@/lib/query/config";
import { queryKeys } from "@/lib/query/keys";

describe("queryKeys", () => {
  it("membangun key dashboard dari konfigurasi terpusat", () => {
    expect(queryKeys.dashboard()).toEqual([QUERY_ROOTS.dashboard]);
  });

  it("memisahkan key daftar pelanggan berdasarkan filter", () => {
    const aktif = queryKeys.customers.list({ active: "aktif" });
    const nonaktif = queryKeys.customers.list({ active: "nonaktif" });

    expect(aktif).toEqual([
      QUERY_ROOTS.customers,
      QUERY_SEGMENTS.list,
      { active: "aktif" },
    ]);
    expect(aktif).not.toEqual(nonaktif);
  });

  it("membedakan key daftar order berdasarkan status dan prioritas", () => {
    const semua = queryKeys.orders.list({});
    const tinggi = queryKeys.orders.list({ priority: "tinggi" });

    expect(semua).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.list,
      {},
    ]);
    expect(tinggi).not.toEqual(semua);
  });

  it("memakai segmen options dan queue yang konsisten", () => {
    expect(queryKeys.customers.options()).toEqual([
      QUERY_ROOTS.customers,
      QUERY_SEGMENTS.options,
    ]);
    expect(queryKeys.products.options()).toEqual([
      QUERY_ROOTS.products,
      QUERY_SEGMENTS.options,
    ]);
    expect(queryKeys.users.options()).toEqual([
      QUERY_ROOTS.users,
      QUERY_SEGMENTS.options,
    ]);

    const queue = queryKeys.orders.queue({
      search: "denim",
      priority: "tinggi",
    });

    expect(queue).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.queue,
      { search: "denim", priority: "tinggi" },
    ]);
    expect(queue).not.toEqual(
      queryKeys.orders.queue({ search: "denim" }),
    );
  });

  it("memasukkan seluruh filter bahan ke dalam key", () => {
    const filters = {
      active: "aktif" as const,
      category: "Kain",
      stockStatus: "kritis" as const,
      lowStock: true,
    };

    expect(queryKeys.materials.list(filters)).toEqual([
      QUERY_ROOTS.materials,
      QUERY_SEGMENTS.list,
      filters,
    ]);
    expect(queryKeys.materials.list({ active: "aktif" })).not.toEqual(
      queryKeys.materials.list(filters),
    );
  });

  it("memisahkan key detail dan riwayat mutasi bahan", () => {
    expect(queryKeys.materials.detail("mat-1")).toEqual([
      QUERY_ROOTS.materials,
      QUERY_SEGMENTS.detail,
      "mat-1",
    ]);

    const keluar = queryKeys.materials.movements("mat-1", {
      movementType: "keluar",
    });

    expect(keluar).toEqual([
      QUERY_ROOTS.materials,
      QUERY_SEGMENTS.movements,
      "mat-1",
      { movementType: "keluar" },
    ]);
    expect(keluar).not.toEqual(
      queryKeys.materials.movements("mat-1", {}),
    );
    expect(queryKeys.materials.movementsRoot("mat-1")).toEqual([
      QUERY_ROOTS.materials,
      QUERY_SEGMENTS.movements,
      "mat-1",
    ]);
  });

  it("memisahkan key detail dan options order", () => {
    expect(queryKeys.orders.detail("ord-1")).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.detail,
      "ord-1",
    ]);
    expect(queryKeys.orders.options()).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.options,
    ]);
    expect(queryKeys.orders.listRoot()).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.list,
    ]);
    expect(queryKeys.orders.queueRoot()).toEqual([
      QUERY_ROOTS.orders,
      QUERY_SEGMENTS.queue,
    ]);
  });

  it("memasukkan seluruh filter laporan produksi ke dalam key", () => {
    const filters = {
      startDate: "2026-11-01",
      endDate: "2026-11-08",
      stage: "cutting" as const,
      orderId: "ord-1",
      page: 2,
      pageSize: 20,
    };

    expect(queryKeys.reports.production(filters)).toEqual([
      QUERY_ROOTS.reports,
      QUERY_SEGMENTS.production,
      filters,
    ]);
    expect(queryKeys.reports.productionRoot()).toEqual([
      QUERY_ROOTS.reports,
      QUERY_SEGMENTS.production,
    ]);
    expect(
      queryKeys.reports.production({ ...filters, page: 1 }),
    ).not.toEqual(queryKeys.reports.production(filters));
  });
});

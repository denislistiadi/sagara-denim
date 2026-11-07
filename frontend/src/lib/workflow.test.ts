import { describe, expect, it } from "vitest";

import {
  canArchiveOrder,
  canCreateLog,
  canEditItems,
  canEditOrder,
  getAvailableTransitions,
  getStageLogSummary,
  getStatusStepIndex,
  isTerminalStatus,
} from "@/lib/workflow";
import type {
  OrderStatus,
  ProductionLogEntry,
  ProductionOrderDetail,
} from "@/types";

function makeOrder(
  overrides: Partial<ProductionOrderDetail> = {},
): ProductionOrderDetail {
  return {
    id: "order-1",
    code: "PRD-001",
    customer: null,
    pic: null,
    status: "menunggu",
    priority: "normal",
    deadline: null,
    total_quantity: 20,
    item_count: 0,
    model_summary: "",
    progress: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    notes: null,
    started_at: null,
    completed_at: null,
    created_by: null,
    items: [],
    status_history: [],
    production_logs: [],
    ...overrides,
  };
}

function makeLog(
  stage: OrderStatus,
  outputQty: number,
  rejectQty: number,
  createdAt: string,
): ProductionLogEntry {
  return {
    id: `log-${stage}-${createdAt}`,
    stage,
    log_date: createdAt.slice(0, 10),
    output_qty: outputQty,
    reject_qty: rejectQty,
    notes: null,
    created_by: null,
    created_at: createdAt,
  };
}

describe("status dan langkah workflow", () => {
  it("mengenali status terminal", () => {
    expect(isTerminalStatus("selesai")).toBe(true);
    expect(isTerminalStatus("dibatalkan")).toBe(true);
    expect(isTerminalStatus("qc")).toBe(false);
  });

  it("mengembalikan indeks langkah status", () => {
    expect(getStatusStepIndex("menunggu")).toBe(0);
    expect(getStatusStepIndex("qc")).toBe(4);
    expect(getStatusStepIndex("selesai")).toBe(5);
    expect(getStatusStepIndex("dibatalkan")).toBe(-1);
  });
});

describe("getStageLogSummary", () => {
  it("hanya menghitung log tahap aktif pada siklus terbaru", () => {
    const order = makeOrder({
      status: "jahit",
      status_history: [
        {
          id: "history-1",
          from_status: "cutting",
          to_status: "jahit",
          changed_by: null,
          notes: null,
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
      production_logs: [
        makeLog("jahit", 100, 100, "2026-01-01T00:00:00Z"),
        makeLog("jahit", 8, 2, "2026-01-03T00:00:00Z"),
        makeLog("cutting", 50, 5, "2026-01-03T00:00:00Z"),
      ],
    });

    expect(getStageLogSummary(order)).toEqual({
      output: 8,
      reject: 2,
      total: 10,
      remaining: 10,
      hasLog: true,
    });
  });

  it("memakai started_at bila riwayat status tidak memuat tahap aktif", () => {
    const order = makeOrder({
      status: "cutting",
      started_at: "2026-01-02T00:00:00Z",
      production_logs: [
        makeLog("cutting", 5, 0, "2026-01-01T00:00:00Z"),
        makeLog("cutting", 7, 1, "2026-01-03T00:00:00Z"),
      ],
    });

    expect(getStageLogSummary(order)).toMatchObject({
      output: 7,
      reject: 1,
      total: 8,
      remaining: 12,
      hasLog: true,
    });
  });

  it("mengembalikan ringkasan kosong bila belum ada log", () => {
    const order = makeOrder({ status: "qc" });

    expect(getStageLogSummary(order)).toEqual({
      output: 0,
      reject: 0,
      total: 0,
      remaining: 20,
      hasLog: false,
    });
  });

  it("tidak menghasilkan sisa negatif", () => {
    const order = makeOrder({
      status: "qc",
      total_quantity: 5,
      production_logs: [makeLog("qc", 10, 0, "2026-01-03T00:00:00Z")],
    });

    expect(getStageLogSummary(order).remaining).toBe(0);
  });
});

describe("izin aksi", () => {
  it("membatasi pembuatan log pada tahap dan peran yang tepat", () => {
    const cutting = makeOrder({ status: "cutting" });
    const qc = makeOrder({ status: "qc" });

    expect(canCreateLog(cutting, "operator")).toBe(true);
    expect(canCreateLog(cutting, "admin")).toBe(true);
    expect(canCreateLog(cutting, "qc")).toBe(false);
    expect(canCreateLog(qc, "qc")).toBe(true);
    expect(canCreateLog(qc, "admin")).toBe(true);
    expect(canCreateLog(qc, "operator")).toBe(false);
    expect(canCreateLog(makeOrder({ status: "menunggu" }), "admin")).toBe(false);
    expect(canCreateLog(cutting, null)).toBe(false);
  });

  it("menolak log baru bila sisa kuantitas habis", () => {
    const order = makeOrder({
      status: "cutting",
      total_quantity: 10,
      production_logs: [makeLog("cutting", 10, 0, "2026-01-03T00:00:00Z")],
    });

    expect(canCreateLog(order, "operator")).toBe(false);
  });

  it("mengizinkan edit order hanya untuk peran produksi dan status aktif", () => {
    expect(canEditOrder(makeOrder({ status: "menunggu" }), "operator")).toBe(true);
    expect(canEditOrder(makeOrder({ status: "jahit" }), "admin")).toBe(true);
    expect(canEditOrder(makeOrder({ status: "jahit" }), "qc")).toBe(false);
    expect(canEditOrder(makeOrder({ status: "selesai" }), "admin")).toBe(false);
  });

  it("mengizinkan edit item hanya saat menunggu", () => {
    expect(canEditItems(makeOrder({ status: "menunggu" }))).toBe(true);
    expect(canEditItems(makeOrder({ status: "cutting" }))).toBe(false);
  });

  it("mengizinkan arsip hanya untuk admin pada status terminal", () => {
    expect(canArchiveOrder(makeOrder({ status: "selesai" }), "admin")).toBe(true);
    expect(canArchiveOrder(makeOrder({ status: "dibatalkan" }), "admin")).toBe(true);
    expect(canArchiveOrder(makeOrder({ status: "selesai" }), "operator")).toBe(false);
    expect(canArchiveOrder(makeOrder({ status: "qc" }), "admin")).toBe(false);
  });
});

describe("getAvailableTransitions", () => {
  it("mengembalikan transisi maju dan pembatalan untuk operator di menunggu", () => {
    expect(
      getAvailableTransitions("menunggu", "operator").map((action) => action.to),
    ).toEqual(["cutting", "dibatalkan"]);
  });

  it("membatasi pembatalan ke admin setelah produksi dimulai", () => {
    expect(
      getAvailableTransitions("cutting", "operator").map((action) => action.to),
    ).toEqual(["jahit"]);
    expect(
      getAvailableTransitions("cutting", "admin").map((action) => action.to),
    ).toEqual(["jahit", "dibatalkan"]);
  });

  it("menyediakan transisi QC dan rework untuk peran QC", () => {
    expect(
      getAvailableTransitions("qc", "qc").map((action) => action.to),
    ).toEqual(["selesai", "jahit", "finishing"]);
    expect(
      getAvailableTransitions("qc", "admin").map((action) => action.to),
    ).toEqual(["selesai", "jahit", "finishing", "dibatalkan"]);
    expect(getAvailableTransitions("qc", "operator")).toEqual([]);
  });

  it("menandai aksi yang membutuhkan catatan", () => {
    const actions = getAvailableTransitions("qc", "qc");

    expect(actions.find((action) => action.to === "jahit")?.requiresNotes).toBe(true);
    expect(actions.find((action) => action.to === "selesai")?.requiresNotes).toBe(
      false,
    );
  });

  it("tidak menawarkan transisi untuk status terminal atau tanpa peran", () => {
    expect(getAvailableTransitions("selesai", "admin")).toEqual([]);
    expect(getAvailableTransitions("dibatalkan", "admin")).toEqual([]);
    expect(getAvailableTransitions("menunggu", null)).toEqual([]);
  });
});

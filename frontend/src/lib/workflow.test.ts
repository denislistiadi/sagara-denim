import { describe, expect, it } from "vitest";

import {
  canArchiveOrder,
  canCreateLog,
  canEditItems,
  canEditOrder,
  canReworkOrder,
  getAvailableTransitions,
  getStageLogSummary,
  getStatusStepIndex,
  isTerminalStatus,
} from "@/lib/workflow";
import type {
  OrderStatus,
  ProductionLogEntry,
  ProductionOrderDetail,
  WorkflowSummary,
} from "@/types";

function makeSummary(
  overrides: Partial<WorkflowSummary> = {},
): WorkflowSummary {
  return {
    stage_input: 0,
    stage_output: 0,
    stage_reject: 0,
    stage_scrap: 0,
    stage_accounted: 0,
    stage_remaining: 0,
    stage_progress: 0,
    stage_complete: false,
    final_output: 0,
    final_loss: 0,
    ...overrides,
  };
}

function makeOrder(
  overrides: Partial<ProductionOrderDetail> = {},
): ProductionOrderDetail {
  const status = overrides.status ?? "menunggu";
  const totalQuantity = overrides.total_quantity ?? 20;
  const isLoggable = ["cutting", "jahit", "finishing", "qc"].includes(status);

  return {
    id: "order-1",
    code: "PRD-001",
    customer: null,
    pic: null,
    status,
    priority: "normal",
    deadline: null,
    total_quantity: totalQuantity,
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
    workflow_summary: makeSummary({
      stage_input: isLoggable ? totalQuantity : 0,
      stage_remaining: isLoggable ? totalQuantity : 0,
    }),
    ...overrides,
  };
}

function makeLog(
  stage: OrderStatus,
  outputQty: number,
  rejectQty: number,
  createdAt: string,
  scrapQty = 0,
): ProductionLogEntry {
  return {
    id: `log-${stage}-${createdAt}`,
    stage,
    log_date: createdAt.slice(0, 10),
    output_qty: outputQty,
    reject_qty: rejectQty,
    scrap_qty: scrapQty,
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
  it("membaca akuntansi tahap dari ringkasan backend", () => {
    const order = makeOrder({
      status: "jahit",
      workflow_summary: makeSummary({
        stage_input: 20,
        stage_output: 8,
        stage_reject: 2,
        stage_scrap: 3,
        stage_accounted: 13,
        stage_remaining: 7,
        stage_progress: 40,
        stage_complete: false,
      }),
      production_logs: [
        makeLog("jahit", 8, 2, "2026-01-03T00:00:00Z", 3),
        makeLog("cutting", 50, 0, "2026-01-03T00:00:00Z", 5),
      ],
    });

    expect(getStageLogSummary(order)).toEqual({
      input: 20,
      output: 8,
      reject: 2,
      scrap: 3,
      accounted: 13,
      remaining: 7,
      hasLog: true,
      complete: false,
    });
  });

  it("menandai tahap selesai saat seluruh input terakuntansi", () => {
    const order = makeOrder({
      status: "cutting",
      workflow_summary: makeSummary({
        stage_input: 20,
        stage_output: 15,
        stage_scrap: 5,
        stage_accounted: 20,
        stage_progress: 75,
        stage_complete: true,
      }),
    });

    expect(getStageLogSummary(order)).toMatchObject({
      accounted: 20,
      remaining: 0,
      hasLog: true,
      complete: true,
    });
  });

  it("mengembalikan ringkasan kosong untuk tahap tanpa input", () => {
    const order = makeOrder({ status: "qc", workflow_summary: makeSummary() });

    expect(getStageLogSummary(order)).toEqual({
      input: 0,
      output: 0,
      reject: 0,
      scrap: 0,
      accounted: 0,
      remaining: 0,
      hasLog: false,
      complete: false,
    });
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
      workflow_summary: makeSummary({
        stage_input: 10,
        stage_output: 10,
        stage_accounted: 10,
        stage_remaining: 0,
        stage_complete: true,
      }),
      production_logs: [makeLog("cutting", 10, 0, "2026-01-03T00:00:00Z")],
    });

    expect(canCreateLog(order, "operator")).toBe(false);
  });

  it("menolak log pada tahap tanpa input", () => {
    const order = makeOrder({ status: "jahit", workflow_summary: makeSummary() });

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

describe("rework", () => {
  it("hanya mengizinkan rework QC bila ada reject", () => {
    const withReject = makeOrder({
      status: "qc",
      workflow_summary: makeSummary({
        stage_input: 20,
        stage_output: 15,
        stage_reject: 5,
        stage_accounted: 20,
        stage_complete: true,
      }),
    });
    const withoutReject = makeOrder({
      status: "qc",
      workflow_summary: makeSummary({
        stage_input: 20,
        stage_output: 15,
        stage_scrap: 5,
        stage_accounted: 20,
        stage_complete: true,
      }),
    });

    expect(canReworkOrder(withReject)).toBe(true);
    expect(canReworkOrder(withoutReject)).toBe(false);
    expect(canReworkOrder(makeOrder({ status: "jahit" }))).toBe(false);
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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusTransitionDialog } from "@/components/orders/status-transition-dialog";
import { transitionProductionOrder } from "@/lib/api";
import type { WorkflowAction } from "@/lib/workflow";
import {
  makeProductionOrder,
  makeWorkflowSummary,
} from "@/test/fixtures";
import { createQueryWrapper } from "@/test/query";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    transitionProductionOrder: vi.fn(),
  };
});

const transitionMock = vi.mocked(transitionProductionOrder);

const forwardAction: WorkflowAction = {
  to: "jahit",
  label: "Lanjut ke Jahit",
  tone: "primary",
  requiresNotes: false,
  isCancel: false,
  isRework: false,
};

const reworkAction: WorkflowAction = {
  to: "jahit",
  label: "Rework ke Jahit",
  tone: "danger",
  requiresNotes: true,
  isCancel: false,
  isRework: true,
};

const completionAction: WorkflowAction = {
  to: "selesai",
  label: "Selesaikan Perintah",
  tone: "primary",
  requiresNotes: false,
  isCancel: false,
  isRework: false,
};

function renderDialog(
  props: Partial<ComponentProps<typeof StatusTransitionDialog>> = {},
) {
  const onSuccess = vi.fn();
  const onConflict = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <StatusTransitionDialog
      open
      onOpenChange={onOpenChange}
      order={makeProductionOrder({ status: "cutting" })}
      action={forwardAction}
      onSuccess={onSuccess}
      onConflict={onConflict}
      {...props}
    />,
    { wrapper: createQueryWrapper() },
  );

  return { onSuccess, onConflict, onOpenChange };
}

describe("StatusTransitionDialog", () => {
  beforeEach(() => {
    transitionMock.mockReset();
  });

  it("memblokir transisi saat akuntansi tahap belum lengkap", () => {
    renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 10,
          stage_accounted: 10,
          stage_remaining: 10,
        }),
      }),
    });

    expect(
      screen.getByText(/Output \+ reject \+ scrap baru 10 dari 20 pcs/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lanjut ke Jahit" }),
    ).toBeDisabled();
  });

  it("mengizinkan transisi setelah akuntansi tahap lengkap", async () => {
    const user = userEvent.setup();
    const saved = makeProductionOrder({ status: "jahit" });
    transitionMock.mockResolvedValue(saved);
    const { onSuccess } = renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 15,
          stage_scrap: 5,
          stage_accounted: 20,
          stage_complete: true,
        }),
      }),
    });

    const submit = screen.getByRole("button", { name: "Lanjut ke Jahit" });
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(transitionMock).toHaveBeenCalledTimes(1));
    expect(transitionMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        expected_status: "cutting",
        to_status: "jahit",
        notes: null,
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(saved);
  });

  it("mengizinkan transisi tanpa log saat tahap tidak memiliki input", async () => {
    const user = userEvent.setup();
    transitionMock.mockResolvedValue(makeProductionOrder({ status: "jahit" }));
    renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary(),
      }),
    });

    expect(
      screen.getByText(/Tahap ini tidak memiliki input/),
    ).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Lanjut ke Jahit" });
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => expect(transitionMock).toHaveBeenCalledTimes(1));
  });

  it("memblokir rework saat tidak ada reject QC", () => {
    renderDialog({
      order: makeProductionOrder({
        status: "qc",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 15,
          stage_scrap: 5,
          stage_accounted: 20,
          stage_complete: true,
        }),
      }),
      action: reworkAction,
    });

    expect(
      screen.getByText(/Rework hanya dapat dilakukan bila ada reject QC/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rework ke Jahit" }),
    ).toBeDisabled();
  });

  it("mewajibkan alasan rework saat ada reject QC", async () => {
    const user = userEvent.setup();
    const saved = makeProductionOrder({ status: "jahit" });
    transitionMock.mockResolvedValue(saved);
    renderDialog({
      order: makeProductionOrder({
        status: "qc",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 15,
          stage_reject: 5,
          stage_accounted: 20,
          stage_complete: true,
        }),
      }),
      action: reworkAction,
    });

    const submit = screen.getByRole("button", { name: "Rework ke Jahit" });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Alasan wajib diisi untuk mengembalikan order ke tahap sebelumnya.",
    );
    expect(transitionMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Catatan/), "Jahitan miring.");
    await user.click(submit);

    await waitFor(() => expect(transitionMock).toHaveBeenCalledTimes(1));
    expect(transitionMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        expected_status: "qc",
        to_status: "jahit",
        notes: "Jahitan miring.",
      }),
    );
  });

  it("memblokir penyelesaian saat output final masih nol", () => {
    renderDialog({
      order: makeProductionOrder({
        status: "qc",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 20,
          stage_accounted: 20,
          stage_complete: true,
          final_output: 0,
          final_loss: 20,
        }),
      }),
      action: completionAction,
    });

    expect(
      screen.getByText(/Output final masih nol/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Selesaikan Perintah" }),
    ).toBeDisabled();
  });

  it("mewajibkan alasan saat output final kurang dari total order", async () => {
    const user = userEvent.setup();
    const saved = makeProductionOrder({ status: "selesai" });
    transitionMock.mockResolvedValue(saved);
    renderDialog({
      order: makeProductionOrder({
        status: "qc",
        workflow_summary: makeWorkflowSummary({
          stage_input: 15,
          stage_output: 15,
          stage_accounted: 15,
          stage_complete: true,
          final_output: 15,
          final_loss: 5,
        }),
      }),
      action: completionAction,
    });

    expect(
      screen.getByText(/Kehilangan 5 pcs dari total order/),
    ).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Selesaikan Perintah" });
    await user.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Alasan wajib diisi karena ada kehilangan 5 pcs dari total order.",
    );
    expect(transitionMock).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Catatan/),
      "5 pcs reject tidak dapat diperbaiki.",
    );
    await user.click(submit);

    await waitFor(() => expect(transitionMock).toHaveBeenCalledTimes(1));
    expect(transitionMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        expected_status: "qc",
        to_status: "selesai",
        notes: "5 pcs reject tidak dapat diperbaiki.",
      }),
    );
  });
});

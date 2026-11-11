import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductionLogDialog } from "@/components/orders/production-log-dialog";
import { ApiError, createProductionLog } from "@/lib/api";
import {
  makeProductionOrder,
  makeWorkflowSummary,
} from "@/test/fixtures";
import { createQueryWrapper } from "@/test/query";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createProductionLog: vi.fn(),
  };
});

const createMock = vi.mocked(createProductionLog);

function renderDialog(
  props: Partial<ComponentProps<typeof ProductionLogDialog>> = {},
) {
  const onSuccess = vi.fn();
  const onConflict = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <ProductionLogDialog
      open
      onOpenChange={onOpenChange}
      order={makeProductionOrder({ status: "cutting" })}
      onSuccess={onSuccess}
      onConflict={onConflict}
      {...props}
    />,
    { wrapper: createQueryWrapper() },
  );

  return { onSuccess, onConflict, onOpenChange };
}

describe("ProductionLogDialog", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("menyembunyikan reject di luar QC dan mengirim output beserta scrap", async () => {
    const user = userEvent.setup();
    const saved = makeProductionOrder({ status: "cutting" });
    createMock.mockResolvedValue(saved);
    const { onSuccess } = renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_remaining: 20,
        }),
      }),
    });

    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scrap")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Output"), "15");
    await user.type(screen.getByLabelText("Scrap"), "5");
    await user.click(screen.getByRole("button", { name: "Simpan Log" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        output_qty: 15,
        reject_qty: 0,
        scrap_qty: 5,
        notes: null,
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(saved);
  });

  it("mengirim output, reject, dan scrap pada tahap QC", async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue(makeProductionOrder({ status: "qc" }));
    renderDialog({
      order: makeProductionOrder({
        status: "qc",
        workflow_summary: makeWorkflowSummary({
          stage_input: 10,
          stage_remaining: 10,
        }),
      }),
    });

    expect(screen.getByLabelText("Reject")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Output"), "7");
    await user.type(screen.getByLabelText("Reject"), "2");
    await user.type(screen.getByLabelText("Scrap"), "1");
    await user.click(screen.getByRole("button", { name: "Simpan Log" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        output_qty: 7,
        reject_qty: 2,
        scrap_qty: 1,
      }),
    );
  });

  it("menolak total yang melebihi sisa input tahap", async () => {
    const user = userEvent.setup();
    renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_remaining: 20,
        }),
      }),
    });

    await user.type(screen.getByLabelText("Output"), "18");
    await user.type(screen.getByLabelText("Scrap"), "3");
    await user.click(screen.getByRole("button", { name: "Simpan Log" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "melebihi sisa input tahap ini (20 pcs)",
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("menonaktifkan form saat input tahap sudah habis", () => {
    renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_output: 18,
          stage_scrap: 2,
          stage_accounted: 20,
          stage_complete: true,
        }),
      }),
    });

    expect(screen.getByLabelText("Output")).toBeDisabled();
    expect(screen.getByLabelText("Scrap")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Simpan Log" })).toBeDisabled();
    expect(
      screen.getByText(/Sisa input tahap ini sudah habis/),
    ).toBeInTheDocument();
  });

  it("meneruskan konflik ke handler tanpa menutup dialog", async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(
      new ApiError(409, "Sisa input tahap sudah berubah."),
    );
    const { onConflict } = renderDialog({
      order: makeProductionOrder({
        status: "cutting",
        workflow_summary: makeWorkflowSummary({
          stage_input: 20,
          stage_remaining: 20,
        }),
      }),
    });

    await user.type(screen.getByLabelText("Output"), "5");
    await user.click(screen.getByRole("button", { name: "Simpan Log" }));

    await waitFor(() =>
      expect(onConflict).toHaveBeenCalledWith("Sisa input tahap sudah berubah."),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ArchiveOrderDialog } from "@/components/orders/archive-order-dialog";

function renderDialog(
  props: Partial<ComponentProps<typeof ArchiveOrderDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <ArchiveOrderDialog
      open
      order={{ code: "PRD-2611-020" }}
      archiving={false}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onConfirm, onOpenChange };
}

describe("ArchiveOrderDialog", () => {
  it("memanggil onConfirm saat tombol arsip diklik", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Arsipkan" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("mengunci tombol selama proses arsip", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ archiving: true });

    const confirm = screen.getByRole("button", { name: "Arsipkan" });
    const cancel = screen.getByRole("button", { name: "Batal" });

    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(cancel).toBeDisabled();

    await user.click(cancel);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("menampilkan deskripsi bawaan berisi kode order", () => {
    renderDialog();

    expect(
      screen.getByText(
        "PRD-2611-020 akan disembunyikan dari daftar aktif. Riwayat produksinya tetap tersimpan.",
      ),
    ).toBeInTheDocument();
  });

  it("memakai deskripsi kustom bila diberikan", () => {
    renderDialog({ description: "Order akan diarsipkan permanen." });

    expect(
      screen.getByText("Order akan diarsipkan permanen."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/akan disembunyikan dari daftar aktif/),
    ).not.toBeInTheDocument();
  });
});

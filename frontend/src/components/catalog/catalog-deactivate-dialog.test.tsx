import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CatalogDeactivateDialog } from "@/components/catalog/catalog-deactivate-dialog";

function renderDialog(
  props: Partial<ComponentProps<typeof CatalogDeactivateDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <CatalogDeactivateDialog
      open
      activating={false}
      pending={false}
      title="Nonaktifkan pelanggan?"
      description="CUS-001 akan disembunyikan dari pilihan order baru."
      confirmLabel="Nonaktifkan"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onConfirm, onOpenChange };
}

describe("CatalogDeactivateDialog", () => {
  it("memanggil onConfirm saat tombol konfirmasi diklik", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Nonaktifkan" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("mengunci tombol saat mutasi berjalan", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ pending: true });

    const confirm = screen.getByRole("button", { name: "Nonaktifkan" });
    const cancel = screen.getByRole("button", { name: "Batal" });

    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(cancel).toBeDisabled();

    await user.click(cancel);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("menampilkan error dan tetap membiarkan dialog terbuka", () => {
    renderDialog({ error: "Pelanggan gagal dinonaktifkan." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pelanggan gagal dinonaktifkan.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("tidak menampilkan alert saat tidak ada error", () => {
    renderDialog({ error: null });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

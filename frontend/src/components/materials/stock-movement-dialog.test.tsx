import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockMovementDialog } from "@/components/materials/stock-movement-dialog";
import {
  createMaterialMovement,
  listProductionOrders,
} from "@/lib/api";
import type { StockMovement } from "@/types";
import { deferred } from "@/test/deferred";
import { makeMaterial } from "@/test/fixtures";
import { createQueryWrapper } from "@/test/query";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createMaterialMovement: vi.fn(),
    listProductionOrders: vi.fn(),
  };
});

const createMovementMock = vi.mocked(createMaterialMovement);
const listOrdersMock = vi.mocked(listProductionOrders);

const material = makeMaterial();

function makeMovement(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: "movement-1",
    material_id: material.id,
    movement_type: "masuk",
    quantity: "5",
    stock_before: "20",
    stock_after: "25",
    note: null,
    production_order: null,
    created_by: null,
    created_at: "2026-11-08T09:00:00+07:00",
    ...overrides,
  };
}

function renderDialog(
  props: Partial<ComponentProps<typeof StockMovementDialog>> = {},
) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <StockMovementDialog
      material={material}
      initialType="masuk"
      role="admin"
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      {...props}
    />,
    { wrapper: createQueryWrapper() },
  );

  return { onSaved, onOpenChange };
}

async function selectType(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Tipe Mutasi" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("StockMovementDialog", () => {
  beforeEach(() => {
    createMovementMock.mockReset();
    listOrdersMock.mockReset();
    listOrdersMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
      total_pages: 0,
    });
  });

  it("menampilkan opsi penyesuaian untuk admin", async () => {
    renderDialog({ role: "admin" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Tipe Mutasi" }));

    expect(
      await screen.findByRole("option", { name: "Penyesuaian" }),
    ).toBeInTheDocument();
  });

  it("menyembunyikan penyesuaian untuk operator", async () => {
    renderDialog({ role: "operator" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Tipe Mutasi" }));

    expect(
      await screen.findByRole("option", { name: "Stok Masuk" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Stok Keluar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Penyesuaian" }),
    ).not.toBeInTheDocument();
  });

  it("menampilkan preview saldo untuk stok masuk", async () => {
    const user = userEvent.setup();
    renderDialog({ initialType: "masuk" });

    await user.type(screen.getByLabelText(/^Jumlah/), "5");

    expect(screen.getByText("25 meter")).toBeInTheDocument();
  });

  it("menampilkan preview saldo untuk stok keluar", async () => {
    const user = userEvent.setup();
    renderDialog({ initialType: "keluar" });

    await user.type(screen.getByLabelText(/^Jumlah/), "3");

    expect(await screen.findByText("17 meter")).toBeInTheDocument();
  });

  it("menolak stok keluar melebihi saldo", async () => {
    const user = userEvent.setup();
    renderDialog({ initialType: "keluar" });

    await user.type(screen.getByLabelText(/^Jumlah/), "21");
    await user.click(screen.getByRole("button", { name: "Simpan Mutasi" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Stok tidak cukup");
    expect(createMovementMock).not.toHaveBeenCalled();
  });

  it("hanya menampilkan tautan order untuk stok keluar", async () => {
    renderDialog({ initialType: "masuk" });

    expect(
      screen.queryByText("Tautkan ke Perintah Produksi"),
    ).not.toBeInTheDocument();

    await selectType("Stok Keluar");

    expect(
      await screen.findByText("Tautkan ke Perintah Produksi"),
    ).toBeInTheDocument();
  });

  it("mengirim payload mutasi dan memanggil onSaved saat sukses", async () => {
    const user = userEvent.setup();
    const movement = makeMovement();
    createMovementMock.mockResolvedValue(movement);
    const { onSaved } = renderDialog({ initialType: "masuk" });

    await user.type(screen.getByLabelText(/^Jumlah/), "5");
    await user.type(screen.getByLabelText("Catatan"), "Penerimaan supplier");
    await user.click(screen.getByRole("button", { name: "Simpan Mutasi" }));

    await waitFor(() =>
      expect(createMovementMock).toHaveBeenCalledWith(material.id, {
        movement_type: "masuk",
        quantity: "5",
        note: "Penerimaan supplier",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved.mock.calls[0][0]).toEqual(movement);
  });

  it("mengunci tombol selama mutasi berjalan", async () => {
    const user = userEvent.setup();
    const pending = deferred<StockMovement>();
    createMovementMock.mockReturnValue(pending.promise);
    const { onSaved } = renderDialog({ initialType: "masuk" });

    await user.type(screen.getByLabelText(/^Jumlah/), "5");
    const submit = screen.getByRole("button", { name: "Simpan Mutasi" });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();

    pending.resolve(makeMovement());
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

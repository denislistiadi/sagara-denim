import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import {
  createProductionOrder,
  updateProductionOrder,
} from "@/lib/api";
import { deferred } from "@/test/deferred";
import {
  makeAuthUser,
  makeCustomerSummary,
  makeProductSummary,
  makeProductionOrder,
  makeUserSummary,
} from "@/test/fixtures";
import { createQueryWrapper } from "@/test/query";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createProductionOrder: vi.fn(),
    updateProductionOrder: vi.fn(),
  };
});

const createMock = vi.mocked(createProductionOrder);
const updateMock = vi.mocked(updateProductionOrder);

const products = [
  makeProductSummary(),
  makeProductSummary({
    id: "product-2",
    code: "PRD-DNM-002",
    name: "Denim Slim",
    size: "30",
    color: "Black",
  }),
];

function renderDialog(
  props: Partial<ComponentProps<typeof OrderFormDialog>> = {},
) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <OrderFormDialog
      open
      onOpenChange={onOpenChange}
      order={null}
      customers={[makeCustomerSummary()]}
      products={products}
      users={[makeUserSummary()]}
      currentUser={makeAuthUser()}
      onSaved={onSaved}
      {...props}
    />,
    { wrapper: createQueryWrapper() },
  );

  return { onSaved, onOpenChange };
}

async function chooseProduct(name = /Denim Regular/) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Model item 1" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("OrderFormDialog", () => {
  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
  });

  it("menampilkan error saat item belum memilih model", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Simpan Perintah" }));

    expect(
      await screen.findByText("Pilih model produk untuk setiap item."),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("menolak quantity nol atau pecahan tanpa memanggil API", async () => {
    const user = userEvent.setup();
    renderDialog();
    await chooseProduct();

    const quantity = screen.getByLabelText("Jumlah");
    const form = screen
      .getByRole("button", { name: "Simpan Perintah" })
      .closest("form");
    expect(form).not.toBeNull();

    await user.clear(quantity);
    await user.type(quantity, "0");
    fireEvent.submit(form!);

    expect(
      await screen.findByText(
        "Jumlah setiap item harus bilangan bulat lebih dari nol.",
      ),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();

    await user.clear(quantity);
    await user.type(quantity, "1.5");
    fireEvent.submit(form!);

    expect(
      await screen.findByText(
        "Jumlah setiap item harus bilangan bulat lebih dari nol.",
      ),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("menolak model produk duplikat", async () => {
    const user = userEvent.setup();
    renderDialog();
    await chooseProduct();

    await user.click(screen.getByRole("button", { name: "Tambah model" }));
    await user.click(screen.getByRole("combobox", { name: "Model item 2" }));
    await user.click(await screen.findByRole("option", { name: /Denim Regular/ }));
    await user.click(screen.getByRole("button", { name: "Simpan Perintah" }));

    expect(
      await screen.findByText(
        "Model produk tidak boleh duplikat dalam satu perintah.",
      ),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("mengunci item saat order sudah berjalan dan tidak mengirim items", async () => {
    const user = userEvent.setup();
    const order = makeProductionOrder({ status: "cutting" });
    updateMock.mockResolvedValue(order);
    renderDialog({ order });

    expect(screen.getByRole("button", { name: "Tambah model" })).toBeDisabled();
    expect(
      screen.getByText("Item dikunci karena produksi sudah berjalan."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Simpan Perintah" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][1];
    expect(payload).not.toHaveProperty("items");
    expect(updateMock.mock.calls[0][0]).toBe(order.id);
  });

  it("mengirim payload hasil normalisasi dan memanggil onSaved saat sukses", async () => {
    const user = userEvent.setup();
    const saved = makeProductionOrder({ id: "order-baru", code: "PRD-2611-099" });
    createMock.mockResolvedValue(saved);
    const { onSaved } = renderDialog();
    await chooseProduct();

    const quantity = screen.getByLabelText("Jumlah");
    await user.clear(quantity);
    await user.type(quantity, "75");
    await user.type(screen.getByLabelText("Catatan"), "  Pesanan E2E  ");
    await user.click(screen.getByRole("button", { name: "Simpan Perintah" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({
      customer_id: null,
      pic_id: "user-1",
      priority: "normal",
      deadline: null,
      notes: "Pesanan E2E",
      items: [
        {
          product_id: "product-1",
          quantity: 75,
          notes: null,
        },
      ],
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, "create"));
  });

  it("tetap terbuka dan menampilkan error saat API gagal", async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new Error("Server sedang sibuk."));
    const { onSaved } = renderDialog();
    await chooseProduct();

    await user.click(screen.getByRole("button", { name: "Simpan Perintah" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server sedang sibuk.",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("menonaktifkan tombol submit selama mutasi berjalan", async () => {
    const user = userEvent.setup();
    const pending = deferred<Awaited<ReturnType<typeof createProductionOrder>>>();
    createMock.mockReturnValue(pending.promise);
    const { onSaved } = renderDialog();
    await chooseProduct();

    const submit = screen.getByRole("button", { name: "Simpan Perintah" });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(onSaved).not.toHaveBeenCalled();

    pending.resolve(makeProductionOrder());
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

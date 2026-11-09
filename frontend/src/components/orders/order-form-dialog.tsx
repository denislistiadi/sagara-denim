"use client";

import { mdiLockOutline, mdiPlus, mdiTrashCanOutline } from "@mdi/js";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  type ComboboxOption,
} from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProductionOrder,
  updateProductionOrder,
  type AuthUser,
  type ProductionOrderCreateInput,
  type ProductionOrderUpdateInput,
} from "@/lib/api";
import { PRIORITY_OPTIONS } from "@/lib/labels";
import { canEditItems } from "@/lib/workflow";
import type {
  CustomerSummary,
  Priority,
  ProductSummary,
  ProductionOrderDetail,
  UserSummary,
} from "@/types";

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrderDetail | null;
  customers: CustomerSummary[];
  products: ProductSummary[];
  users: UserSummary[];
  currentUser: AuthUser | null;
  onSaved: (
    order: ProductionOrderDetail,
    mode: "create" | "edit",
  ) => void;
}

interface FormItem {
  key: string;
  productId: string;
  quantity: string;
  notes: string;
}

const DEFAULT_QUANTITY = "50";

type SaveOrderInput =
  | {
      mode: "edit";
      id: string;
      payload: ProductionOrderUpdateInput;
    }
  | {
      mode: "create";
      payload: ProductionOrderCreateInput;
    };

function customerOption(customer: CustomerSummary): ComboboxOption {
  return {
    value: customer.id,
    label: customer.name,
    description: customer.code,
  };
}

function userOption(user: UserSummary): ComboboxOption {
  return {
    value: user.id,
    label: user.name,
    description: user.role === "admin" ? "Admin Produksi" : user.role === "qc" ? "QC" : "Operator Produksi",
  };
}

function productOption(product: ProductSummary): ComboboxOption {
  return {
    value: product.id,
    label: product.name,
    description: [product.code, product.size, product.color]
      .filter(Boolean)
      .join(" · "),
  };
}

export function OrderFormDialog({
  open,
  onOpenChange,
  order,
  customers,
  products,
  users,
  currentUser,
  onSaved,
}: OrderFormDialogProps) {
  const itemCounter = useRef(0);
  const [customerId, setCustomerId] = useState("");
  const [picId, setPicId] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsLocked = order ? !canEditItems(order) : false;

  const saveMutation = useMutation({
    mutationFn: (input: SaveOrderInput) =>
      input.mode === "edit"
        ? updateProductionOrder(input.id, input.payload)
        : createProductionOrder(input.payload),
    onSuccess: (saved, input) => onSaved(saved, input.mode),
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Perintah produksi gagal disimpan.",
      );
    },
  });
  const saving = saveMutation.isPending;

  function newItem(): FormItem {
    itemCounter.current += 1;
    return {
      key: `item-${itemCounter.current}`,
      productId: "",
      quantity: DEFAULT_QUANTITY,
      notes: "",
    };
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    async function resetForm() {
      setError(null);

      if (order) {
        setCustomerId(order.customer?.id ?? "");
        setPicId(order.pic?.id ?? "");
        setPriority(order.priority);
        setDeadline(order.deadline ?? "");
        setNotes(order.notes ?? "");
        setItems(
          order.items.map((item, index) => ({
            key: `existing-${item.id}-${index}`,
            productId: item.product.id,
            quantity: String(item.quantity),
            notes: item.notes ?? "",
          })),
        );
        return;
      }

      setCustomerId("");
      setPicId(currentUser?.id ?? "");
      setPriority("normal");
      setDeadline("");
      setNotes("");
      setItems([newItem()]);
    }

    void resetForm();
  }, [currentUser?.id, open, order]);

  function updateItem(key: string, patch: Partial<FormItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(key: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.key !== key);
    });
  }

  const totalQuantity = items.reduce((total, item) => {
    const quantity = Number(item.quantity);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!itemsLocked) {
      if (items.length === 0) {
        setError("Tambahkan minimal satu item model.");
        return;
      }

      if (items.some((item) => !item.productId)) {
        setError("Pilih model produk untuk setiap item.");
        return;
      }

      const productIds = items.map((item) => item.productId);
      if (new Set(productIds).size !== productIds.length) {
        setError("Model produk tidak boleh duplikat dalam satu perintah.");
        return;
      }

      if (
        items.some((item) => {
          const quantity = Number(item.quantity);
          return !Number.isInteger(quantity) || quantity <= 0;
        })
      ) {
        setError("Jumlah setiap item harus bilangan bulat lebih dari nol.");
        return;
      }
    }

    const itemPayload = items.map((item) => ({
      product_id: item.productId,
      quantity: Number(item.quantity),
      notes: item.notes.trim() || null,
    }));

    const headerPayload: ProductionOrderCreateInput = {
      customer_id: customerId || null,
      pic_id: picId || null,
      priority,
      deadline: deadline || null,
      notes: notes.trim() || null,
      items: itemPayload,
    };

    if (order) {
      const updatePayload: ProductionOrderUpdateInput = {
        customer_id: headerPayload.customer_id,
        pic_id: headerPayload.pic_id,
        priority: headerPayload.priority,
        deadline: headerPayload.deadline,
        notes: headerPayload.notes,
      };

      if (!itemsLocked) {
        updatePayload.items = itemPayload;
      }

      saveMutation.mutate({
        mode: "edit",
        id: order.id,
        payload: updatePayload,
      });
      return;
    }

    saveMutation.mutate({ mode: "create", payload: headerPayload });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="order-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {order ? "Ubah Perintah Produksi" : "Buat Perintah Produksi"}
          </DialogTitle>
          <DialogDescription>
            {order
              ? `Perbarui data header dan item untuk ${order.code}.`
              : "Perintah baru akan masuk ke tahap Menunggu dengan kode otomatis."}
          </DialogDescription>
        </DialogHeader>

        <form className="dialog-form" onSubmit={handleSubmit}>
          <div className="dialog-form-grid">
            <div className="dialog-field">
              <Label htmlFor="order-customer">Pelanggan</Label>
              <Combobox
                id="order-customer"
                options={customers.map(customerOption)}
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="Stok internal (tanpa pelanggan)"
                searchPlaceholder="Cari pelanggan..."
                emptyMessage="Pelanggan tidak ditemukan."
                ariaLabel="Pilih pelanggan"
              />
            </div>

            <div className="dialog-field">
              <Label htmlFor="order-pic">PIC Produksi</Label>
              <Combobox
                id="order-pic"
                options={users.map(userOption)}
                value={picId}
                onValueChange={setPicId}
                placeholder="Belum ditentukan"
                searchPlaceholder="Cari PIC..."
                emptyMessage="Pengguna tidak ditemukan."
                ariaLabel="Pilih PIC produksi"
              />
            </div>

            <div className="dialog-field">
              <Label htmlFor="order-priority">Prioritas</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger id="order-priority" aria-label="Prioritas">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="dialog-field">
              <Label htmlFor="order-deadline">Deadline</Label>
              <DatePicker
                id="order-deadline"
                value={deadline}
                onChange={setDeadline}
                placeholder="Tanpa deadline"
                ariaLabel="Pilih deadline perintah produksi"
              />
            </div>

            <div className="dialog-field dialog-field-full">
              <Label htmlFor="order-notes">Catatan</Label>
              <Textarea
                id="order-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Bahan, warna, atau detail produksi lainnya..."
              />
            </div>
          </div>

          <div className="order-items-section">
            <div className="order-items-head">
              <div>
                <h3>Item Model</h3>
                <p>
                  {itemsLocked
                    ? "Item dikunci karena produksi sudah berjalan."
                    : "Minimal satu model. Total dihitung otomatis."}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setItems((current) => [...current, newItem()])}
                disabled={itemsLocked}
              >
                <Icon path={mdiPlus} size={16} />
                Tambah model
              </Button>
            </div>

            {itemsLocked && (
              <div className="order-items-lock">
                <Icon path={mdiLockOutline} size={18} />
                <p>
                  Item dikunci karena produksi sudah berjalan. Data header
                  seperti pelanggan, prioritas, deadline, dan catatan masih
                  dapat diubah.
                </p>
              </div>
            )}

            <div className="order-item-list">
              {items.map((item, index) => (
                <div
                  className={
                    itemsLocked
                      ? "order-item-row order-item-row-locked"
                      : "order-item-row"
                  }
                  key={item.key}
                >
                  <div className="order-item-index" aria-hidden="true">
                    {index + 1}
                  </div>

                  <div className="order-item-product">
                    <Label htmlFor={`item-product-${item.key}`}>Model</Label>
                    <Combobox
                      id={`item-product-${item.key}`}
                      options={products.map(productOption)}
                      value={item.productId}
                      onValueChange={(value) =>
                        updateItem(item.key, { productId: value })
                      }
                      placeholder="Pilih model produk"
                      searchPlaceholder="Cari model..."
                      emptyMessage="Model tidak ditemukan."
                      ariaLabel={`Model item ${index + 1}`}
                      disabled={itemsLocked}
                    />
                  </div>

                  <div className="order-item-quantity">
                    <Label htmlFor={`item-quantity-${item.key}`}>
                      Jumlah
                    </Label>
                    <Input
                      id={`item-quantity-${item.key}`}
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.key, { quantity: event.target.value })
                      }
                      suffix="pcs"
                      required
                      disabled={itemsLocked}
                    />
                  </div>

                  <div className="order-item-notes">
                    <Label htmlFor={`item-notes-${item.key}`}>
                      Catatan item
                    </Label>
                    <Input
                      id={`item-notes-${item.key}`}
                      value={item.notes}
                      onChange={(event) =>
                        updateItem(item.key, { notes: event.target.value })
                      }
                      placeholder="Opsional"
                      disabled={itemsLocked}
                    />
                  </div>

                  <button
                    type="button"
                    className="order-item-remove"
                    onClick={() => removeItem(item.key)}
                    disabled={itemsLocked || items.length === 1}
                    aria-label={`Hapus item ${index + 1}`}
                  >
                    <Icon path={mdiTrashCanOutline} size={17} />
                  </button>
                </div>
              ))}
            </div>

            <div className="order-items-total">
              <span>Total quantity</span>
              <strong>{totalQuantity.toLocaleString("id-ID")} pcs</strong>
            </div>
          </div>

          {error && (
            <p className="order-form-error" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" loading={saving}>
              {saving ? "Menyimpan..." : "Simpan Perintah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

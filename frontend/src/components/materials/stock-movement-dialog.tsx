"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  type ComboboxOption,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMaterialMovement,
  type StockMovementCreateInput,
} from "@/lib/api";
import { formatQuantity } from "@/lib/format";
import {
  STOCK_MOVEMENT_LABELS,
  STOCK_MOVEMENT_OPTIONS,
} from "@/lib/labels";
import { canAdjustStock, toNumber } from "@/lib/materials";
import { productionOrderOptionsQuery } from "@/lib/query/definitions";
import type {
  MaterialDetail,
  StockMovement,
  StockMovementType,
  UserRole,
} from "@/types";

const DECIMAL_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const MAX_STOCK = 9_999_999_999.99;

interface StockMovementDialogProps {
  material: MaterialDetail;
  initialType: StockMovementType;
  role?: UserRole;
  onOpenChange: (open: boolean) => void;
  onSaved: (movement: StockMovement) => void;
}

function normalizeDecimal(value: string): string {
  return value.trim().replace(",", ".");
}

function parseDecimal(value: string): number {
  return Number(normalizeDecimal(value));
}

function isDecimal(value: string): boolean {
  if (!DECIMAL_PATTERN.test(value.trim())) {
    return false;
  }

  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_STOCK;
}

export function StockMovementDialog({
  material,
  initialType,
  role,
  onOpenChange,
  onSaved,
}: StockMovementDialogProps) {
  const formId = useId().replace(/:/g, "");
  const [type, setType] = useState<StockMovementType>(initialType);
  const [quantity, setQuantity] = useState("");
  const [targetStock, setTargetStock] = useState(material.stock_qty);
  const [note, setNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ordersQuery = useQuery({
    ...productionOrderOptionsQuery(),
    enabled: type === "keluar",
  });

  const orderOptions = useMemo<ComboboxOption[]>(
    () =>
      (ordersQuery.data?.items ?? []).map((order) => ({
        value: order.id,
        label: `${order.code} · ${order.model_summary}`,
        description: order.customer?.name ?? "Stok internal",
      })),
    [ordersQuery.data],
  );

  const ordersLoading = ordersQuery.isFetching;
  const ordersError = ordersQuery.error
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Daftar perintah produksi gagal dimuat."
    : null;

  const saveMutation = useMutation({
    mutationFn: (payload: StockMovementCreateInput) =>
      createMaterialMovement(material.id, payload),
    onSuccess: onSaved,
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Mutasi stok gagal disimpan.",
      );
    },
  });
  const saving = saveMutation.isPending;

  const currentStock = toNumber(material.stock_qty);
  const allowAdjust = canAdjustStock(role);
  const typeOptions = allowAdjust
    ? STOCK_MOVEMENT_OPTIONS
    : STOCK_MOVEMENT_OPTIONS.filter((option) => option.value !== "penyesuaian");

  const quantityValue = isDecimal(quantity) ? parseDecimal(quantity) : 0;
  const targetValue = isDecimal(targetStock) ? parseDecimal(targetStock) : 0;
  const previewStock =
    type === "masuk"
      ? currentStock + quantityValue
      : type === "keluar"
        ? currentStock - quantityValue
        : targetValue;
  const previewInvalid = previewStock < 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (type === "penyesuaian") {
      if (!isDecimal(targetStock)) {
        setError("Target stok harus angka nol atau lebih, maksimal 2 desimal.");
        return;
      }
      if (note.trim().length < 3) {
        setError("Alasan penyesuaian wajib diisi minimal 3 karakter.");
        return;
      }
    } else {
      if (!isDecimal(quantity) || quantityValue <= 0) {
        setError("Jumlah harus angka lebih dari nol, maksimal 2 desimal.");
        return;
      }
      if (type === "keluar" && quantityValue > currentStock) {
        setError(
          `Stok tidak cukup. Sisa stok ${formatQuantity(material.stock_qty)} ${material.unit}.`,
        );
        return;
      }
    }

    if (note.trim().length > 1_000) {
      setError("Catatan maksimal 1.000 karakter.");
      return;
    }

    const payload: StockMovementCreateInput = {
      movement_type: type,
      note: note.trim() || null,
    };

    if (type === "penyesuaian") {
      payload.target_stock = normalizeDecimal(targetStock);
    } else {
      payload.quantity = normalizeDecimal(quantity);
    }

    if (type === "keluar" && orderId) {
      payload.production_order_id = orderId;
    }

    saveMutation.mutate(payload);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="stock-movement-dialog">
        <DialogHeader>
          <DialogTitle>Catat Mutasi Stok</DialogTitle>
          <DialogDescription>
            {material.name} · saldo saat ini{" "}
            {formatQuantity(material.stock_qty)} {material.unit}. Setiap
            perubahan saldo tercatat permanen di riwayat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field
              label="Tipe Mutasi"
              htmlFor={`${formId}-type`}
              required
              hint="Stok masuk dan keluar mengubah saldo sesuai jumlah."
            >
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as StockMovementType);
                  setError(null);
                }}
              >
                <SelectTrigger id={`${formId}-type`} disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {type === "penyesuaian" ? (
              <Field
                label="Target Stok"
                htmlFor={`${formId}-target`}
                required
                hint="Saldo akan disamakan dengan nilai ini."
              >
                <Input
                  id={`${formId}-target`}
                  value={targetStock}
                  onChange={(event) => setTargetStock(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={saving}
                  placeholder="0"
                />
              </Field>
            ) : (
              <Field
                label="Jumlah"
                htmlFor={`${formId}-quantity`}
                required
                hint={`Dalam satuan ${material.unit}.`}
              >
                <Input
                  id={`${formId}-quantity`}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={saving}
                  placeholder="0"
                />
              </Field>
            )}

            <Field
              label="Catatan"
              htmlFor={`${formId}-note`}
              required={type === "penyesuaian"}
              hint={
                type === "penyesuaian"
                  ? "Wajib diisi, misalnya hasil stock opname."
                  : "Opsional, misalnya penerimaan supplier atau pemakaian cutting."
              }
              className="stock-movement-note"
            >
              <Textarea
                id={`${formId}-note`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={1_000}
                disabled={saving}
                placeholder={
                  type === "penyesuaian"
                    ? "Hasil stock opname"
                    : "Pemakaian produksi"
                }
              />
            </Field>

            {type === "keluar" && (
              <Field
                label="Tautkan ke Perintah Produksi"
                htmlFor={`${formId}-order`}
                hint={
                  ordersError ??
                  "Opsional. Tautan hanya referensi, stok tidak dipotong otomatis."
                }
              >
                <Combobox
                  options={orderOptions}
                  value={orderId}
                  onValueChange={setOrderId}
                  placeholder={
                    ordersLoading
                      ? "Memuat perintah produksi..."
                      : "Pilih perintah produksi"
                  }
                  searchPlaceholder="Cari kode atau model..."
                  emptyMessage="Perintah produksi tidak ditemukan."
                  disabled={saving || ordersLoading}
                  clearable
                />
              </Field>
            )}
          </div>

          <div
            className={
              previewInvalid
                ? "stock-movement-preview stock-movement-preview-invalid"
                : "stock-movement-preview"
            }
          >
            <span>Saldo setelah mutasi</span>
            <strong>
              {formatQuantity(previewStock)} {material.unit}
            </strong>
            <span className="stock-movement-preview-type">
              {STOCK_MOVEMENT_LABELS[type]}
            </span>
          </div>

          {error && (
            <p className="material-form-error" role="alert">
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
              Simpan Mutasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

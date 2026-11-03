"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMaterial,
  updateMaterial,
  type MaterialCreateInput,
  type MaterialUpdateInput,
} from "@/lib/api";
import type { MaterialDetail } from "@/types";

const UNIT_SUGGESTIONS = ["meter", "roll", "pcs", "kg", "liter"] as const;
const DECIMAL_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const MAX_STOCK = 9_999_999_999.99;

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialDetail | null;
  categories: string[];
  onSaved: (material: MaterialDetail, mode: "create" | "edit") => void;
}

function normalizeDecimal(value: string): string {
  return value.trim().replace(",", ".");
}

function isDecimal(value: string): boolean {
  if (!DECIMAL_PATTERN.test(value.trim())) {
    return false;
  }

  const parsed = Number(normalizeDecimal(value));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_STOCK;
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  material,
  categories,
  onSaved,
}: MaterialFormDialogProps) {
  const formId = useId().replace(/:/g, "");
  const [sku, setSku] = useState(material?.sku ?? "");
  const [name, setName] = useState(material?.name ?? "");
  const [category, setCategory] = useState(material?.category ?? "");
  const [unit, setUnit] = useState(material?.unit ?? "");
  const [minimumStock, setMinimumStock] = useState(
    material?.minimum_stock ?? "0",
  );
  const [initialStock, setInitialStock] = useState("0");
  const [activeValue, setActiveValue] = useState(
    material?.is_active === false ? "nonaktif" : "aktif",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const locked = Boolean(material && material.movement_count > 0);
  const editing = Boolean(material);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanUnit = unit.trim();

    if (!cleanSku) {
      setError("SKU wajib diisi.");
      return;
    }
    if (cleanSku.length > 32) {
      setError("SKU maksimal 32 karakter.");
      return;
    }
    if (!cleanName) {
      setError("Nama bahan wajib diisi.");
      return;
    }
    if (cleanName.length > 160) {
      setError("Nama bahan maksimal 160 karakter.");
      return;
    }
    if (!cleanCategory) {
      setError("Kategori wajib diisi.");
      return;
    }
    if (cleanCategory.length > 80) {
      setError("Kategori maksimal 80 karakter.");
      return;
    }
    if (!cleanUnit) {
      setError("Satuan wajib diisi.");
      return;
    }
    if (cleanUnit.length > 16) {
      setError("Satuan maksimal 16 karakter.");
      return;
    }
    if (!isDecimal(minimumStock)) {
      setError("Minimum stok harus angka nol atau lebih, maksimal 2 desimal.");
      return;
    }
    if (!editing && !isDecimal(initialStock)) {
      setError("Stok awal harus angka nol atau lebih, maksimal 2 desimal.");
      return;
    }

    setSaving(true);

    try {
      let saved: MaterialDetail;

      if (material) {
        const payload: MaterialUpdateInput = {
          name: cleanName,
          category: cleanCategory,
          minimum_stock: normalizeDecimal(minimumStock),
          is_active: activeValue === "aktif",
        };

        if (!locked) {
          payload.sku = cleanSku;
          payload.unit = cleanUnit;
        } else {
          if (cleanUnit && cleanUnit !== material.unit) {
            payload.unit = cleanUnit;
          }
        }

        saved = await updateMaterial(material.id, payload);
      } else {
        const payload: MaterialCreateInput = {
          sku: cleanSku,
          name: cleanName,
          category: cleanCategory,
          unit: cleanUnit,
          minimum_stock: normalizeDecimal(minimumStock),
          initial_stock: normalizeDecimal(initialStock),
        };
        saved = await createMaterial(payload);
      }

      onSaved(saved, material ? "edit" : "create");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Bahan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-form-dialog">
        <DialogHeader>
          <DialogTitle>{material ? "Ubah Bahan" : "Tambah Bahan"}</DialogTitle>
          <DialogDescription>
            {material
              ? `Perbarui master ${material.sku}. Saldo stok hanya berubah lewat mutasi.`
              : "Bahan baru langsung masuk daftar inventori. Stok awal akan dicatat sebagai mutasi masuk."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field
              label="SKU"
              htmlFor={`${formId}-sku`}
              required
              hint={
                locked
                  ? "SKU dan satuan terkunci karena sudah ada mutasi stok."
                  : "Huruf kecil akan diubah menjadi huruf besar."
              }
            >
              <Input
                id={`${formId}-sku`}
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                onBlur={() => setSku((current) => current.trim().toUpperCase())}
                maxLength={32}
                autoComplete="off"
                disabled={saving || locked}
                placeholder="MTL-DNM-14"
              />
            </Field>

            <Field label="Nama Bahan" htmlFor={`${formId}-name`} required>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                disabled={saving}
                placeholder="Denim Raw 14 oz"
              />
            </Field>

            <Field
              label="Kategori"
              htmlFor={`${formId}-category`}
              required
              hint="Pilih kategori yang sudah ada atau ketik kategori baru."
            >
              <Input
                id={`${formId}-category`}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                list={`${formId}-categories`}
                disabled={saving}
                placeholder="Kain"
              />
              <datalist id={`${formId}-categories`}>
                {categories.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Satuan"
              htmlFor={`${formId}-unit`}
              required
              hint={
                locked
                  ? "SKU dan satuan terkunci karena sudah ada mutasi stok."
                  : "Contoh: meter, roll, pcs, kg, liter."
              }
            >
              <Input
                id={`${formId}-unit`}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                maxLength={16}
                list={`${formId}-units`}
                disabled={saving || locked}
                placeholder="meter"
              />
              <datalist id={`${formId}-units`}>
                {UNIT_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Minimum Stok"
              htmlFor={`${formId}-minimum`}
              required
              hint="Batas peringatan restock. Boleh 0 jika tanpa batas."
            >
              <Input
                id={`${formId}-minimum`}
                value={minimumStock}
                onChange={(event) => setMinimumStock(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                disabled={saving}
                placeholder="120.00"
              />
            </Field>

            {!editing && (
              <Field
                label="Stok Awal"
                htmlFor={`${formId}-initial`}
                hint="Stok awal di atas nol akan tercatat sebagai mutasi masuk."
              >
                <Input
                  id={`${formId}-initial`}
                  value={initialStock}
                  onChange={(event) => setInitialStock(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={saving}
                  placeholder="0"
                />
              </Field>
            )}

            {editing && (
              <Field
                label="Status Bahan"
                htmlFor={`${formId}-active`}
                hint="Bahan nonaktif tetap menyimpan stok dan riwayat, tetapi menolak mutasi baru."
              >
                <Select value={activeValue} onValueChange={setActiveValue}>
                  <SelectTrigger id={`${formId}-active`} disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
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
              {material ? "Simpan Perubahan" : "Tambah Bahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

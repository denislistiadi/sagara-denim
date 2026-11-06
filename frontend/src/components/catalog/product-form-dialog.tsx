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
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProduct,
  updateProduct,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "@/lib/api";
import type { ProductRecord } from "@/types";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRecord | null;
  onSaved: (product: ProductRecord, mode: "create" | "edit") => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const formId = useId().replace(/:/g, "");
  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [size, setSize] = useState(product?.size ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [activeValue, setActiveValue] = useState(
    product?.is_active === false ? "nonaktif" : "aktif",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = Boolean(product);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanSize = size.trim() || null;
    const cleanColor = color.trim() || null;
    const cleanDescription = description.trim() || null;

    if (!cleanCode) {
      setError("Kode produk wajib diisi.");
      return;
    }
    if (cleanCode.length > 32) {
      setError("Kode produk maksimal 32 karakter.");
      return;
    }
    if (!cleanName) {
      setError("Nama produk wajib diisi.");
      return;
    }
    if (cleanName.length > 160) {
      setError("Nama produk maksimal 160 karakter.");
      return;
    }
    if (cleanSize && cleanSize.length > 16) {
      setError("Ukuran maksimal 16 karakter.");
      return;
    }
    if (cleanColor && cleanColor.length > 64) {
      setError("Warna maksimal 64 karakter.");
      return;
    }

    setSaving(true);

    try {
      let saved: ProductRecord;

      if (product) {
        const payload: ProductUpdateInput = {
          code: cleanCode,
          name: cleanName,
          size: cleanSize,
          color: cleanColor,
          description: cleanDescription,
          is_active: activeValue === "aktif",
        };
        saved = await updateProduct(product.id, payload);
      } else {
        const payload: ProductCreateInput = {
          code: cleanCode,
          name: cleanName,
          size: cleanSize,
          color: cleanColor,
          description: cleanDescription,
        };
        saved = await createProduct(payload);
      }

      onSaved(saved, product ? "edit" : "create");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Produk gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {product ? "Ubah Produk" : "Tambah Produk"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? `Perbarui data ${product.code}. Riwayat order tetap tersimpan.`
              : "Model produk baru langsung dapat dipilih saat membuat perintah produksi."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field
              label="Kode Produk"
              htmlFor={`${formId}-code`}
              required
              hint="Huruf kecil akan diubah menjadi huruf besar."
            >
              <Input
                id={`${formId}-code`}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onBlur={() => setCode((current) => current.trim().toUpperCase())}
                maxLength={32}
                autoComplete="off"
                disabled={saving}
                placeholder="MDL-SLIM-32"
              />
            </Field>

            <Field label="Nama Produk" htmlFor={`${formId}-name`} required>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                disabled={saving}
                placeholder="Jeans Slim Fit"
              />
            </Field>

            <Field label="Ukuran" htmlFor={`${formId}-size`}>
              <Input
                id={`${formId}-size`}
                value={size}
                onChange={(event) => setSize(event.target.value)}
                maxLength={16}
                autoComplete="off"
                disabled={saving}
                placeholder="32"
              />
            </Field>

            <Field label="Warna" htmlFor={`${formId}-color`}>
              <Input
                id={`${formId}-color`}
                value={color}
                onChange={(event) => setColor(event.target.value)}
                maxLength={64}
                autoComplete="off"
                disabled={saving}
                placeholder="Indigo"
              />
            </Field>

            <Field
              label="Deskripsi"
              htmlFor={`${formId}-description`}
              className="material-form-wide"
            >
              <Textarea
                id={`${formId}-description`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                disabled={saving}
                placeholder="Catatan model, bahan, atau detail jahitan"
              />
            </Field>

            {editing && (
              <Field
                label="Status Produk"
                htmlFor={`${formId}-active`}
                hint="Produk nonaktif tetap menyimpan riwayat order, tetapi tidak muncul di pilihan item baru."
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
              {product ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

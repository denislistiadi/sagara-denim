"use client";

import { useMutation } from "@tanstack/react-query";
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
  createCustomer,
  updateCustomer,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from "@/lib/api";
import type { CustomerRecord } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SaveCustomerInput =
  | { mode: "edit"; id: string; payload: CustomerUpdateInput }
  | { mode: "create"; payload: CustomerCreateInput };

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerRecord | null;
  onSaved: (customer: CustomerRecord, mode: "create" | "edit") => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerFormDialogProps) {
  const formId = useId().replace(/:/g, "");
  const [code, setCode] = useState(customer?.code ?? "");
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [activeValue, setActiveValue] = useState(
    customer?.is_active === false ? "nonaktif" : "aktif",
  );
  const [error, setError] = useState<string | null>(null);

  const editing = Boolean(customer);

  const saveMutation = useMutation({
    mutationFn: (input: SaveCustomerInput) =>
      input.mode === "edit"
        ? updateCustomer(input.id, input.payload)
        : createCustomer(input.payload),
    onSuccess: (saved, input) => onSaved(saved, input.mode),
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Pelanggan gagal disimpan.",
      );
    },
  });
  const saving = saveMutation.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim() || null;
    const cleanEmail = email.trim() || null;
    const cleanAddress = address.trim() || null;

    if (!cleanCode) {
      setError("Kode pelanggan wajib diisi.");
      return;
    }
    if (cleanCode.length > 32) {
      setError("Kode pelanggan maksimal 32 karakter.");
      return;
    }
    if (!cleanName) {
      setError("Nama pelanggan wajib diisi.");
      return;
    }
    if (cleanName.length > 160) {
      setError("Nama pelanggan maksimal 160 karakter.");
      return;
    }
    if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) {
      setError("Format email pelanggan tidak valid.");
      return;
    }

    if (customer) {
      saveMutation.mutate({
        mode: "edit",
        id: customer.id,
        payload: {
          code: cleanCode,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          is_active: activeValue === "aktif",
        },
      });
      return;
    }

    saveMutation.mutate({
      mode: "create",
      payload: {
        code: cleanCode,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        address: cleanAddress,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Ubah Pelanggan" : "Tambah Pelanggan"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? `Perbarui data ${customer.code}. Riwayat order tetap tersimpan.`
              : "Pelanggan baru langsung dapat dipilih saat membuat perintah produksi."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field
              label="Kode Pelanggan"
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
                placeholder="CUST-001"
              />
            </Field>

            <Field label="Nama Pelanggan" htmlFor={`${formId}-name`} required>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                disabled={saving}
                placeholder="Toko Denim Jaya"
              />
            </Field>

            <Field label="Telepon" htmlFor={`${formId}-phone`}>
              <Input
                id={`${formId}-phone`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={32}
                autoComplete="off"
                disabled={saving}
                placeholder="0812-1111-2201"
              />
            </Field>

            <Field label="Email" htmlFor={`${formId}-email`}>
              <Input
                id={`${formId}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={255}
                autoComplete="off"
                disabled={saving}
                placeholder="pelanggan@contoh.id"
              />
            </Field>

            <Field
              label="Alamat"
              htmlFor={`${formId}-address`}
              className="material-form-wide"
            >
              <Textarea
                id={`${formId}-address`}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={500}
                rows={3}
                disabled={saving}
                placeholder="Alamat lengkap pelanggan"
              />
            </Field>

            {editing && (
              <Field
                label="Status Pelanggan"
                htmlFor={`${formId}-active`}
                hint="Pelanggan nonaktif tetap menyimpan riwayat order, tetapi tidak muncul di pilihan order baru."
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
              {customer ? "Simpan Perubahan" : "Tambah Pelanggan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

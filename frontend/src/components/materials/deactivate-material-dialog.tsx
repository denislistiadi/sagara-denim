"use client";

import { useState } from "react";
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
import { updateMaterial } from "@/lib/api";
import { formatQuantity } from "@/lib/format";
import type { MaterialDetail, MaterialSummary } from "@/types";

interface DeactivateMaterialDialogProps {
  material: MaterialSummary | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: (material: MaterialDetail) => void;
}

export function DeactivateMaterialDialog({
  material,
  onOpenChange,
  onCompleted,
}: DeactivateMaterialDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activating = material ? !material.is_active : false;

  async function handleConfirm() {
    if (!material) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await updateMaterial(material.id, {
        is_active: !material.is_active,
      });
      onCompleted(saved);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Status bahan gagal diubah.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(material)}
      onOpenChange={(open) => {
        if (!open && !saving) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {activating ? "Aktifkan bahan kembali?" : "Nonaktifkan bahan?"}
          </DialogTitle>
          <DialogDescription>
            {material ? (
              activating ? (
                <>
                  {material.sku} akan dapat menerima mutasi stok lagi. Saldo
                  saat ini {formatQuantity(material.stock_qty)} {material.unit}.
                </>
              ) : (
                <>
                  {material.sku} akan hilang dari daftar aktif dan tidak dapat
                  menerima mutasi stok. Saldo {formatQuantity(material.stock_qty)}{" "}
                  {material.unit} serta seluruh riwayatnya tetap tersimpan.
                </>
              )
            ) : (
              ""
            )}
          </DialogDescription>
        </DialogHeader>

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
          <Button
            type="button"
            variant={activating ? "primary" : "danger"}
            loading={saving}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {activating ? "Aktifkan" : "Nonaktifkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

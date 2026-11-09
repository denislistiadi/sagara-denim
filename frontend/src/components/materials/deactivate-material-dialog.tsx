"use client";

import { useMutation } from "@tanstack/react-query";
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
  const [error, setError] = useState<string | null>(null);

  const activating = material ? !material.is_active : false;

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      updateMaterial(input.id, { is_active: input.isActive }),
    onSuccess: (saved) => onCompleted(saved),
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Status bahan gagal diubah.",
      );
    },
  });
  const saving = toggleMutation.isPending;

  function handleConfirm() {
    if (!material) {
      return;
    }

    setError(null);
    toggleMutation.mutate({
      id: material.id,
      isActive: !material.is_active,
    });
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
            onClick={handleConfirm}
          >
            {activating ? "Aktifkan" : "Nonaktifkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

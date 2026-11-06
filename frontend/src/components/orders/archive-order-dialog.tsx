"use client";

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
import type { ProductionOrderListItem } from "@/types";

interface ArchiveOrderDialogProps {
  /** Apakah dialog tampil. */
  open: boolean;
  /** Perintah yang akan diarsipkan (untuk pesan), atau null saat tertutup. */
  order: Pick<ProductionOrderListItem, "code"> | null;
  archiving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Override kalimat deskripsi; bawaan memakai teks umum. */
  description?: string;
}

/** Dialog konfirmasi pengarsipan perintah produksi. */
export function ArchiveOrderDialog({
  open,
  order,
  archiving,
  onOpenChange,
  onConfirm,
  description,
}: ArchiveOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arsipkan perintah produksi?</DialogTitle>
          <DialogDescription>
            {description ??
              (order
                ? `${order.code} akan disembunyikan dari daftar aktif. Riwayat produksinya tetap tersimpan.`
                : "")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={archiving}>
              Batal
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="danger"
            loading={archiving}
            onClick={onConfirm}
          >
            Arsipkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

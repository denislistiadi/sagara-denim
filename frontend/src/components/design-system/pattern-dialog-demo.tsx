"use client";

import { mdiPlus } from "@mdi/js";
import { useState } from "react";
import { Icon } from "@/components/icon";
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
import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export function PatternDialogDemo() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon path={mdiPlus} size={18} />
        Buka Form Dialog
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Order Produksi</DialogTitle>
            <DialogDescription>
              Pola form dua kolom dengan aksi utama di kanan bawah.
            </DialogDescription>
          </DialogHeader>

          <form
            className="dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(false);
              toast({
                title: "Order produksi dibuat",
                description: "Pola form dialog berhasil dijalankan.",
                variant: "success",
              });
            }}
          >
            <div className="dialog-form-grid">
              <div className="dialog-field">
                <Label htmlFor="pattern-model">Model</Label>
                <Input
                  id="pattern-model"
                  placeholder="Jeans Slim Fit 32"
                  required
                />
              </div>
              <div className="dialog-field">
                <Label htmlFor="pattern-customer">Pelanggan</Label>
                <Input
                  id="pattern-customer"
                  placeholder="Toko Denim Jaya"
                  required
                />
              </div>
              <div className="dialog-field">
                <Label htmlFor="pattern-qty">Jumlah (pcs)</Label>
                <Input id="pattern-qty" type="number" min={1} defaultValue={50} />
              </div>
              <div className="dialog-field">
                <Label htmlFor="pattern-priority">Prioritas</Label>
                <Select defaultValue="Normal">
                  <SelectTrigger
                    id="pattern-priority"
                    aria-label="Prioritas"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tinggi">Tinggi</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Rendah">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit">
                <Icon path={mdiPlus} size={18} />
                Simpan Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

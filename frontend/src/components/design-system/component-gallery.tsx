"use client";

import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiDotsHorizontal,
  mdiDownload,
  mdiInformationOutline,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui/avatar";
import {
  Badge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  DatePicker,
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, SearchInput, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PRODUCTION_ORDERS } from "@/lib/mock-data";
import type { OrderStatus, Priority } from "@/types";

const ALL_STATUSES: readonly OrderStatus[] = [
  "Menunggu",
  "Cutting",
  "Jahit",
  "Finishing",
  "QC",
  "Selesai",
  "Dibatalkan",
] as const;

const ALL_PRIORITIES: readonly Priority[] = ["Tinggi", "Normal", "Rendah"] as const;

const CUSTOMER_OPTIONS = [
  {
    value: "toko-denim-jaya",
    label: "Toko Denim Jaya",
    description: "Bandung · 12 order aktif",
  },
  {
    value: "sagara-store",
    label: "Sagara Store",
    description: "Jakarta · 8 order aktif",
  },
  {
    value: "denim-lokal",
    label: "Denim Lokal Studio",
    description: "Yogyakarta · 5 order aktif",
  },
  {
    value: "workshop-utara",
    label: "Workshop Utara",
    description: "Surabaya · 3 order aktif",
  },
  {
    value: "rumah-jahit-ibu",
    label: "Rumah Jahit Ibu",
    description: "Solo · 2 order aktif",
  },
] as const;

function Showcase({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="docs-section component-showcase">
      <div className="docs-section-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="component-stage">{children}</div>
    </section>
  );
}

export function ComponentGallery() {
  const { toast } = useToast();
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("Cutting");
  const [customer, setCustomer] = useState("toko-denim-jaya");
  const [deadline, setDeadline] = useState("2026-11-20");
  const [reportRange, setReportRange] = useState<DateRange | null>({
    start: "2026-11-09",
    end: "2026-12-04",
  });

  return (
    <>
      <Showcase
        title="Tombol"
        description="Empat varian utama dengan ukuran kecil, sedang, besar, dan icon-only."
      >
        <div className="component-row">
          <Button>
            <Icon path={mdiPlus} size={18} />
            Buat Order
          </Button>
          <Button variant="secondary">
            <Icon path={mdiDownload} size={18} />
            Ekspor
          </Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="danger">
            <Icon path={mdiTrashCanOutline} size={18} />
            Hapus
          </Button>
        </div>

        <div className="component-row">
          <Button size="sm">Kecil</Button>
          <Button size="md">Sedang</Button>
          <Button size="lg">Besar</Button>
          <Button size="icon" aria-label="Aksi lainnya">
            <Icon path={mdiDotsHorizontal} size={19} />
          </Button>
        </div>

        <div className="component-row">
          <Button disabled>Nonaktif</Button>
          <Button loading>Menyimpan</Button>
          <Button variant="secondary" loading>
            Memuat
          </Button>
        </div>
      </Showcase>

      <Showcase
        title="Input dan kontrol"
        description="Field teks dengan prefix dan suffix, search pill, textarea, serta state validasi."
      >
        <div className="component-form-grid">
          <div className="dialog-field">
            <Label htmlFor="demo-model">Model Produk</Label>
            <Input id="demo-model" placeholder="Jeans Slim Fit 32" />
            <span className="field-hint">Contoh format: jenis, potongan, ukuran.</span>
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-search">Pencarian</Label>
            <SearchInput
              id="demo-search"
              placeholder="Cari order atau pelanggan..."
              aria-label="Contoh pencarian"
            />
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-price">Harga Satuan</Label>
            <Input
              id="demo-price"
              inputMode="numeric"
              defaultValue="185000"
              prefix="Rp"
              suffix="/ pcs"
            />
            <span className="field-hint">
              Prefix dan suffix mengikuti lebar kontrol secara otomatis.
            </span>
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-code">Kode Order</Label>
            <Input
              id="demo-code"
              defaultValue="2611-024"
              prefix="PRD-"
              suffix="Aktif"
            />
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-disabled">Input Nonaktif</Label>
            <Input
              id="demo-disabled"
              defaultValue="PRD-2611-023"
              disabled
            />
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-invalid">Jumlah Produksi</Label>
            <Input
              id="demo-invalid"
              defaultValue="120"
              suffix="pcs"
              invalid
            />
            <span className="ds-field-error">
              Jumlah melebihi kapasitas lini jahit.
            </span>
          </div>

          <div className="dialog-field dialog-field-full">
            <Label htmlFor="demo-notes">Catatan</Label>
            <Textarea
              id="demo-notes"
              rows={3}
              placeholder="Detail bahan, warna, atau instruksi khusus..."
            />
          </div>
        </div>

        <div className="component-row component-row-spaced">
          <label className="component-inline-control">
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => setChecked(Boolean(value))}
            />
            Tampilkan order selesai
          </label>

          <label className="component-inline-control">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            Notifikasi deadline
          </label>
        </div>
      </Showcase>

      <Showcase
        title="Select, combobox, dan tanggal"
        description="Select tunggal, select dengan pencarian, pemilih tanggal, dan rentang yang boleh melewati bulan."
      >
        <div className="component-form-grid">
          <div className="dialog-field">
            <Label htmlFor="demo-status">Status Produksi</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as OrderStatus)}
            >
              <SelectTrigger id="demo-status" aria-label="Status produksi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="field-hint">
              Navigasi panah, Enter untuk memilih, Esc untuk menutup.
            </span>
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-customer">Pelanggan</Label>
            <Combobox
              id="demo-customer"
              options={CUSTOMER_OPTIONS}
              value={customer}
              onValueChange={setCustomer}
              placeholder="Pilih pelanggan"
              searchPlaceholder="Cari nama pelanggan..."
              ariaLabel="Pelanggan"
            />
            <span className="field-hint">
              Ketik untuk menyaring; ikon hapus mengosongkan pilihan.
            </span>
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-deadline">Deadline Produksi</Label>
            <DatePicker
              id="demo-deadline"
              value={deadline}
              onChange={setDeadline}
            />
            <span className="field-hint">
              Nilai disimpan sebagai ISO YYYY-MM-DD.
            </span>
          </div>

          <div className="dialog-field">
            <Label htmlFor="demo-range">Periode Laporan</Label>
            <DateRangePicker
              id="demo-range"
              value={reportRange}
              onChange={setReportRange}
            />
            <span className="field-hint">
              Pilih tanggal mulai lalu akhir, termasuk lintas bulan.
            </span>
          </div>
        </div>

        <div className="component-note">
          <Icon path={mdiInformationOutline} size={18} />
          <span>
            DateRangePicker baru didokumentasikan di galeri dan belum dipasang
            sebagai filter Order Produksi.
          </span>
        </div>
      </Showcase>

      <Showcase
        title="Badge status"
        description="Status produksi dan prioritas selalu membawa teks, bukan hanya warna."
      >
        <div className="component-row">
          {ALL_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
        <div className="component-row">
          {ALL_PRIORITIES.map((priority) => (
            <PriorityBadge key={priority} priority={priority} />
          ))}
          <Badge tone="orange" dot>
            Produksi aktif
          </Badge>
          <Badge tone="neutral">Arsip</Badge>
        </div>
      </Showcase>

      <Showcase
        title="Progress dan avatar"
        description="Progress memakai warna status; avatar memakai inisial agar tetap ringan."
      >
        <div className="component-progress-list">
          <div>
            <span>Cutting · 35%</span>
            <Progress value={35} tone="blue" label="Cutting 35 persen" />
          </div>
          <div>
            <span>Jahit · 68%</span>
            <Progress value={68} tone="orange" label="Jahit 68 persen" />
          </div>
          <div>
            <span>Selesai · 100%</span>
            <Progress value={100} tone="green" label="Selesai 100 persen" />
          </div>
        </div>

        <div className="component-row">
          <Avatar name="Andi Pratama" size="sm" />
          <Avatar name="Sinta Maharani" size="md" />
          <Avatar name="Raka Wijaya" size="lg" tone="orange" />
          <Avatar name="Nadia Putri" size="md" tone="light" />
        </div>
      </Showcase>

      <Showcase
        title="Tab"
        description="Tab dipakai untuk memisahkan sudut pandang tanpa meninggalkan halaman."
      >
        <Tabs defaultValue="produksi">
          <TabsList>
            <TabsTrigger value="produksi">Produksi</TabsTrigger>
            <TabsTrigger value="kualitas">Kualitas</TabsTrigger>
            <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
          </TabsList>
          <TabsContent value="produksi" className="component-tab-panel">
            <strong>24 order aktif</strong>
            <span>7 cutting, 10 jahit, 4 finishing, 3 QC.</span>
          </TabsContent>
          <TabsContent value="kualitas" className="component-tab-panel">
            <strong>Reject rate 2,4%</strong>
            <span>5 pcs reject dari 210 pcs yang diperiksa hari ini.</span>
          </TabsContent>
          <TabsContent value="pengiriman" className="component-tab-panel">
            <strong>92% tepat waktu</strong>
            <span>2 order mendekati deadline dalam 3 hari ke depan.</span>
          </TabsContent>
        </Tabs>
      </Showcase>

      <Showcase
        title="Dialog dan toast"
        description="Dialog untuk keputusan penting; toast untuk umpan balik singkat."
      >
        <div className="component-row">
          <Button onClick={() => setDialogOpen(true)}>Buka Dialog</Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Order berhasil disimpan",
                description: "PRD-2611-025 masuk ke tahap Menunggu.",
                variant: "success",
              })
            }
          >
            <Icon path={mdiCheckCircleOutline} size={18} />
            Toast Sukses
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              toast({
                title: "Gagal menyimpan",
                description: "Jumlah produksi harus lebih dari nol.",
                variant: "error",
              })
            }
          >
            <Icon path={mdiAlertCircleOutline} size={18} />
            Toast Error
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast({
                title: "Mode demo",
                description: "Data ini belum terhubung ke backend FastAPI.",
                variant: "info",
              })
            }
          >
            <Icon path={mdiInformationOutline} size={18} />
            Toast Info
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus order produksi?</DialogTitle>
              <DialogDescription>
                Order PRD-2611-024 akan dihapus dari daftar demo. Tindakan ini
                tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Batal</Button>
              </DialogClose>
              <Button
                variant="danger"
                onClick={() => {
                  setDialogOpen(false);
                  toast({
                    title: "Order dihapus",
                    description: "PRD-2611-024 dihapus dari daftar demo.",
                    variant: "success",
                  });
                }}
              >
                <Icon path={mdiTrashCanOutline} size={18} />
                Hapus Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Showcase>

      <Showcase
        title="Tabel"
        description="Header abu-abu, baris ringan, dan aksi di ujung kanan."
      >
        <div className="table-scroll component-table">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Model</th>
                <th>Status</th>
                <th>Progress</th>
                <th scope="col" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_ORDERS.slice(0, 4).map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="code-badge">{order.code}</span>
                  </td>
                  <td>
                    <span className="table-primary">{order.model}</span>
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <div className="table-progress">
                      <Progress
                        value={order.progress}
                        tone={order.progress >= 90 ? "green" : "orange"}
                        label={`Progress ${order.code}`}
                      />
                      <span>{order.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-btn"
                      aria-label={`Aksi ${order.code}`}
                    >
                      <Icon path={mdiDotsHorizontal} size={19} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Showcase>

      <Showcase
        title="State"
        description="Loading, kosong, dan error harus terasa seperti bagian dari produk."
      >
        <div className="component-state-grid">
          <div className="component-state-card">
            <span className="component-state-label">Loading</span>
            <TableSkeleton rows={3} />
          </div>

          <div className="component-state-card">
            <span className="component-state-label">Kosong</span>
            <EmptyState
              title="Belum ada order"
              description="Order baru akan muncul di sini setelah dibuat."
            />
          </div>

          <div className="component-state-card">
            <span className="component-state-label">Error</span>
            <div className="component-error-box">
              <Icon path={mdiAlertCircleOutline} size={20} />
              <div>
                <strong>Gagal memuat data</strong>
                <p>Coba muat ulang halaman atau periksa koneksi API.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Muat ulang
            </Button>
          </div>
        </div>
      </Showcase>
    </>
  );
}

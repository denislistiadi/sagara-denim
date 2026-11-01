"use client";

import {
  mdiDotsHorizontal,
  mdiEyeOutline,
  mdiPencilOutline,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Label, SearchInput, Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatNumber } from "@/lib/format";
import { PRODUCTION_ORDERS } from "@/lib/mock-data";
import type { OrderStatus, Priority, ProductionOrder } from "@/types";

const STATUS_OPTIONS: readonly (OrderStatus | "Semua")[] = [
  "Semua",
  "Menunggu",
  "Cutting",
  "Jahit",
  "Finishing",
  "QC",
  "Selesai",
  "Dibatalkan",
] as const;

const PAGE_SIZE = 6;

function progressTone(progress: number) {
  if (progress >= 100) return "green" as const;
  if (progress >= 70) return "blue" as const;
  if (progress > 0) return "orange" as const;
  return "amber" as const;
}

export function OrderWorkspace() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ProductionOrder[]>([
    ...PRODUCTION_ORDERS,
  ]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "Semua">(
    "Semua",
  );
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deadline, setDeadline] = useState("2026-11-15");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "Semua" || order.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        [order.code, order.model, order.customer, order.pic]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleOrders = filteredOrders.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatus(value: string) {
    setStatusFilter(value as OrderStatus | "Semua");
    setPage(1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const model = String(form.get("model") ?? "").trim();
    const customer = String(form.get("customer") ?? "").trim();
    const quantity = Number(form.get("quantity") ?? 0);
    const deadline = String(form.get("deadline") ?? "");
    const priority = String(form.get("priority") ?? "Normal") as Priority;

    if (!model || !customer || !quantity || !deadline) {
      toast({
        title: "Data belum lengkap",
        description: "Model, pelanggan, jumlah, dan deadline wajib diisi.",
        variant: "error",
      });
      return;
    }

    const nextNumber =
      orders.reduce((max, order) => {
        const match = order.code.match(/(\d+)$/);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;
    const newOrder: ProductionOrder = {
      id: `local-${Date.now()}`,
      code: `PRD-2611-${String(nextNumber).padStart(3, "0")}`,
      model,
      customer,
      quantity,
      status: "Menunggu",
      progress: 0,
      deadline,
      pic: "Andi",
      priority,
    };

    setOrders((current) => [newOrder, ...current]);
    setStatusFilter("Semua");
    setSearch("");
    setPage(1);
    setDialogOpen(false);
    setDeadline("2026-11-15");
    event.currentTarget.reset();

    toast({
      title: "Order produksi dibuat",
      description: `${newOrder.code} · ${model} untuk ${customer}.`,
      variant: "success",
    });
  }

  function handleDelete(order: ProductionOrder) {
    setOrders((current) => current.filter((item) => item.id !== order.id));
    toast({
      title: "Order dihapus",
      description: `${order.code} dihapus dari daftar demo.`,
      variant: "success",
    });
  }

  return (
    <>
      <PageHeader
        title="Order Produksi"
        subtitle="Kelola order produksi celana jeans dari cutting sampai selesai."
        actions={
          <Button
            onClick={() => {
              setDeadline("2026-11-15");
              setDialogOpen(true);
            }}
          >
            <Icon path={mdiPlus} size={18} />
            Buat Order Produksi
          </Button>
        }
      />

      <section className="table-card">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Cari kode, model, pelanggan, atau PIC..."
            aria-label="Cari order produksi"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select value={statusFilter} onValueChange={handleStatus}>
              <SelectTrigger
                className="table-filter"
                aria-label="Filter status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "Semua" ? "Semua status" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visibleOrders.length > 0 ? (
          <>
            <div className="table-scroll">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Kode Order</th>
                    <th>Model</th>
                    <th>Pelanggan</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Deadline</th>
                    <th>PIC</th>
                    <th scope="col" aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="code-badge">{order.code}</span>
                      </td>
                      <td>
                        <div className="table-primary">{order.model}</div>
                        <div className="table-secondary">
                          Prioritas: {order.priority}
                        </div>
                      </td>
                      <td>
                        <div className="table-primary table-primary-muted">
                          {order.customer}
                        </div>
                      </td>
                      <td>
                        <span className="table-number">
                          {formatNumber(order.quantity)}
                        </span>{" "}
                        <span className="table-unit">pcs</span>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <div className="table-progress">
                          <Progress
                            value={order.progress}
                            tone={progressTone(order.progress)}
                            label={`Progress ${order.code}`}
                          />
                          <span>{order.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-date">
                          {formatDate(order.deadline, true)}
                        </span>
                      </td>
                      <td>
                        <span className="table-pic">
                          <Avatar name={order.pic} size="sm" tone="light" />
                          {order.pic}
                        </span>
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="table-action-btn"
                              aria-label={`Aksi untuk ${order.code}`}
                            >
                              <Icon path={mdiDotsHorizontal} size={19} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                toast({
                                  title: "Detail order",
                                  description: `${order.code} akan dibuka pada tahap aplikasi penuh.`,
                                  variant: "info",
                                })
                              }
                            >
                              <Icon path={mdiEyeOutline} size={17} />
                              Lihat detail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                toast({
                                  title: "Ubah order",
                                  description:
                                    "Form edit akan tersedia setelah backend terpasang.",
                                  variant: "info",
                                })
                              }
                            >
                              <Icon path={mdiPencilOutline} size={17} />
                              Ubah order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              danger
                              onSelect={() => handleDelete(order)}
                            >
                              <Icon path={mdiTrashCanOutline} size={17} />
                              Hapus order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Menampilkan {startIndex + 1}–{startIndex + visibleOrders.length}{" "}
                dari {filteredOrders.length} order
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="Order tidak ditemukan"
            description="Coba ubah kata kunci pencarian atau filter status produksi."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Semua");
                  setPage(1);
                }}
              >
                Reset filter
              </Button>
            }
          />
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Order Produksi</DialogTitle>
            <DialogDescription>
              Lengkapi data order. Order baru akan masuk ke tahap Menunggu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="dialog-form">
            <div className="dialog-form-grid">
              <div className="dialog-field">
                <Label htmlFor="order-model">Model</Label>
                <Input
                  id="order-model"
                  name="model"
                  placeholder="Contoh: Jeans Slim Fit 32"
                  required
                  autoFocus
                />
              </div>

              <div className="dialog-field">
                <Label htmlFor="order-customer">Pelanggan</Label>
                <Input
                  id="order-customer"
                  name="customer"
                  placeholder="Contoh: Toko Denim Jaya"
                  required
                />
              </div>

              <div className="dialog-field">
                <Label htmlFor="order-quantity">Jumlah</Label>
                <Input
                  id="order-quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={50}
                  suffix="pcs"
                  required
                />
              </div>

              <div className="dialog-field">
                <Label htmlFor="order-deadline">
                  Deadline
                  <span className="ds-required" aria-hidden="true">
                    *
                  </span>
                </Label>
                <DatePicker
                  id="order-deadline"
                  name="deadline"
                  value={deadline}
                  onChange={setDeadline}
                  ariaLabel="Pilih deadline order"
                />
              </div>

              <div className="dialog-field">
                <Label htmlFor="order-priority">Prioritas</Label>
                <Select name="priority" defaultValue="Normal">
                  <SelectTrigger id="order-priority" aria-label="Prioritas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tinggi">Tinggi</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Rendah">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="dialog-field dialog-field-full">
                <Label htmlFor="order-notes">Catatan</Label>
                <Textarea
                  id="order-notes"
                  name="notes"
                  rows={3}
                  placeholder="Bahan, warna, atau detail produksi lainnya..."
                />
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

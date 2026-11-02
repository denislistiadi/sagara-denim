"use client";

import {
  mdiAlertCircleOutline,
  mdiArchiveOutline,
  mdiDotsHorizontal,
  mdiEyeOutline,
  mdiPencilOutline,
  mdiPlus,
} from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { useOrderOptions } from "@/components/orders/use-order-options";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
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
import { SearchInput } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  archiveProductionOrder,
  getProductionOrder,
  listProductionOrders,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import {
  ORDER_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/labels";
import { canArchiveOrder, canEditOrder } from "@/lib/workflow";
import type {
  OrderStatus,
  Priority,
  ProductionOrderDetail,
  ProductionOrderListItem,
  ProductionOrderListResponse,
} from "@/types";

const PAGE_SIZE = 6;
const ALL = "semua";

function progressTone(progress: number) {
  if (progress >= 100) return "green" as const;
  if (progress >= 70) return "blue" as const;
  if (progress > 0) return "orange" as const;
  return "amber" as const;
}

export function OrderWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const options = useOrderOptions();
  const canWrite = user?.role === "admin" || user?.role === "operator";

  const [data, setData] = useState<ProductionOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | typeof ALL>(
    ALL,
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | typeof ALL>(
    ALL,
  );
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<ProductionOrderDetail | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<ProductionOrderListItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await listProductionOrders({
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter === ALL ? undefined : statusFilter,
          priority: priorityFilter === ALL ? undefined : priorityFilter,
        });

        if (!active) {
          return;
        }

        setData(response);
        if (response.total_pages > 0 && page > response.total_pages) {
          setPage(response.total_pages);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Daftar perintah produksi gagal dimuat.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [debouncedSearch, page, priorityFilter, reloadKey, statusFilter]);

  const hasFilter =
    search.trim().length > 0 ||
    statusFilter !== ALL ||
    priorityFilter !== ALL;
  const items = data?.items ?? [];

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
    setPage(1);
  }

  function openCreate() {
    setEditingOrder(null);
    setDialogOpen(true);
  }

  async function openEdit(order: ProductionOrderListItem) {
    try {
      const detail = await getProductionOrder(order.id);
      setEditingOrder(detail);
      setDialogOpen(true);
    } catch (error) {
      toast({
        title: "Gagal membuka perintah",
        description:
          error instanceof Error
            ? error.message
            : "Detail perintah produksi gagal dimuat.",
        variant: "error",
      });
    }
  }

  function handleSaved(saved: ProductionOrderDetail, mode: "create" | "edit") {
    setDialogOpen(false);
    setEditingOrder(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Perintah produksi dibuat",
        description: `${saved.code} tersimpan dengan ${saved.item_count} model.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Perintah produksi diperbarui",
        description: `${saved.code} berhasil disimpan.`,
        variant: "success",
      });
    }

    setReloadKey((current) => current + 1);
  }

  async function handleArchive() {
    if (!archiveTarget) {
      return;
    }

    setArchiving(true);

    try {
      await archiveProductionOrder(archiveTarget.id);
      const lastItemOnPage = items.length === 1 && page > 1;
      toast({
        title: "Perintah produksi diarsipkan",
        description: `${archiveTarget.code} tidak lagi tampil di daftar aktif.`,
        variant: "success",
      });
      setArchiveTarget(null);

      if (lastItemOnPage) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      toast({
        title: "Gagal mengarsipkan",
        description:
          error instanceof Error
            ? error.message
            : "Perintah produksi gagal diarsipkan.",
        variant: "error",
      });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Perintah Produksi"
        subtitle="Kelola perintah produksi celana jeans dari cutting sampai selesai."
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Icon path={mdiPlus} size={18} />
              Buat Perintah Produksi
            </Button>
          ) : undefined
        }
      />

      <section className="table-card">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, model, pelanggan, atau catatan..."
            aria-label="Cari perintah produksi"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as OrderStatus | typeof ALL);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua status</SelectItem>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value as Priority | typeof ALL);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter prioritas"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua prioritas</SelectItem>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : loadError ? (
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Daftar gagal dimuat"
            description={loadError}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                Coba lagi
              </Button>
            }
          />
        ) : items.length > 0 ? (
          <>
            <div className="table-scroll">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Kode</th>
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
                  {items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="code-badge">{order.code}</span>
                      </td>
                      <td>
                        <Link
                          href={`/perintah-produksi/${order.id}`}
                          className="table-primary table-primary-link"
                        >
                          {order.model_summary}
                        </Link>
                        <div className="table-secondary table-secondary-inline">
                          <span>
                            {order.item_count} model
                          </span>
                          <PriorityBadge priority={order.priority} />
                        </div>
                      </td>
                      <td>
                        <div className="table-primary table-primary-muted">
                          {order.customer?.name ?? "Stok internal"}
                        </div>
                        {order.customer && (
                          <div className="table-secondary">
                            {order.customer.code}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="table-number">
                          {formatNumber(order.total_quantity)}
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
                          {order.deadline
                            ? formatDate(order.deadline, true)
                            : "—"}
                        </span>
                      </td>
                      <td>
                        {order.pic ? (
                          <span className="table-pic">
                            <Avatar
                              name={order.pic.name}
                              size="sm"
                              tone="light"
                            />
                            {order.pic.name}
                          </span>
                        ) : (
                          <span className="table-muted">
                            Belum ditentukan
                          </span>
                        )}
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
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/perintah-produksi/${order.id}`}
                                className="ds-dropdown-item"
                              >
                                <Icon path={mdiEyeOutline} size={17} />
                                Lihat detail
                              </Link>
                            </DropdownMenuItem>

                            {canEditOrder(order, user?.role) && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void openEdit(order);
                                }}
                              >
                                <Icon path={mdiPencilOutline} size={17} />
                                Ubah perintah
                              </DropdownMenuItem>
                            )}

                            {canArchiveOrder(order, user?.role) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  danger
                                  onSelect={() => setArchiveTarget(order)}
                                >
                                  <Icon
                                    path={mdiArchiveOutline}
                                    size={17}
                                  />
                                  Arsipkan
                                </DropdownMenuItem>
                              </>
                            )}
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
                Menampilkan {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + 1}–
                {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + items.length} dari{" "}
                {data?.total ?? 0} perintah
              </span>
              <Pagination
                page={data?.page ?? page}
                totalPages={data?.total_pages ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title={
              hasFilter
                ? "Perintah produksi tidak ditemukan"
                : "Belum ada perintah produksi"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci pencarian atau filter yang dipakai."
                : "Perintah produksi yang dibuat akan tampil di sini."
            }
            action={
              hasFilter ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetFilters}
                >
                  Reset filter
                </Button>
              ) : canWrite ? (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Buat Perintah Produksi
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      <OrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={editingOrder}
        customers={options.customers}
        products={options.products}
        users={options.users}
        currentUser={user}
        onSaved={handleSaved}
      />

      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open && !archiving) {
            setArchiveTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan perintah produksi?</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `${archiveTarget.code} akan disembunyikan dari daftar aktif. Riwayat produksinya tetap tersimpan.`
                : ""}
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
              onClick={() => {
                void handleArchive();
              }}
            >
              Arsipkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

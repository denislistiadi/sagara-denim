"use client";

import {
  mdiAccountGroupOutline,
  mdiAlertCircleOutline,
  mdiPlus,
} from "@mdi/js";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CatalogDeactivateDialog } from "@/components/catalog/catalog-deactivate-dialog";
import { CustomerFormDialog } from "@/components/catalog/customer-form-dialog";
import { CustomerTable } from "@/components/catalog/customer-table";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
  deactivateCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/api";
import { usePaginatedList } from "@/lib/hooks/use-paginated-list";
import { pageRange } from "@/lib/pagination";
import { queryKeys } from "@/lib/query/keys";
import type {
  CatalogActiveFilter,
  CustomerRecord,
} from "@/types";

const PAGE_SIZE = 10;

export function CustomerWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "admin";

  const [activeFilter, setActiveFilter] =
    useState<CatalogActiveFilter>("aktif");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<CustomerRecord | null>(null);

  const {
    data,
    items,
    loading,
    error: loadError,
    search,
    setSearch,
    page,
    setPage,
    reload,
  } = usePaginatedList({
    queryKey: queryKeys.customers.list({ active: activeFilter }),
    errorMessage: "Daftar pelanggan gagal dimuat.",
    queryFn: ({ page: pageToLoad, search: searchTerm, signal }) =>
      listCustomers(
        {
          page: pageToLoad,
          page_size: PAGE_SIZE,
          search: searchTerm,
          active: activeFilter,
        },
        { signal },
      ),
  });

  const range = pageRange(data?.page ?? page, PAGE_SIZE, items.length);
  const hasFilter = search.trim().length > 0 || activeFilter !== "aktif";

  function resetFilters() {
    setSearch("");
    setActiveFilter("aktif");
    setPage(1);
  }

  function openCreate() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function handleSaved(saved: CustomerRecord, mode: "create" | "edit") {
    setFormOpen(false);
    setEditingCustomer(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Pelanggan ditambahkan",
        description: `${saved.code} tersimpan dan siap dipakai pada order baru.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Pelanggan diperbarui",
        description: `${saved.code} berhasil disimpan.`,
        variant: "success",
      });
    }

    reload();
  }

  async function handleToggleStatus() {
    if (!statusTarget) {
      return;
    }

    const activating = !statusTarget.is_active;

    if (activating) {
      await updateCustomer(statusTarget.id, { is_active: true });
    } else {
      await deactivateCustomer(statusTarget.id);
    }

    toast({
      title: activating ? "Pelanggan diaktifkan" : "Pelanggan dinonaktifkan",
      description: activating
        ? `${statusTarget.code} kembali muncul di pilihan order baru.`
        : `${statusTarget.code} tidak muncul di pilihan order baru, tetapi riwayatnya tetap tersimpan.`,
      variant: "success",
    });
    setStatusTarget(null);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle="Kelola data pelanggan yang dapat dipakai pada perintah produksi."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Icon path={mdiPlus} size={18} />
              Tambah Pelanggan
            </Button>
          ) : undefined
        }
      />

      <section className="table-card materials-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode atau nama pelanggan..."
            aria-label="Cari pelanggan"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value as CatalogActiveFilter);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter status pelanggan"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="aktif">Pelanggan aktif</SelectItem>
                <SelectItem value="nonaktif">Pelanggan nonaktif</SelectItem>
                <SelectItem value="semua">Semua pelanggan</SelectItem>
              </SelectContent>
            </Select>

            {hasFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset filter
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : loadError ? (
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Daftar pelanggan gagal dimuat"
            description={loadError}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={reload}
              >
                Coba lagi
              </Button>
            }
          />
        ) : items.length > 0 ? (
          <>
            <CustomerTable
              customers={items}
              canManage={canManage}
              onEdit={(customer) => {
                setEditingCustomer(customer);
                setFormOpen(true);
              }}
              onToggleActive={setStatusTarget}
            />

            <div className="table-footer">
              <span>
                Menampilkan {range.from}–{range.to} dari {data?.total ?? 0}{" "}
                pelanggan
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
            icon={mdiAccountGroupOutline}
            title={
              hasFilter
                ? "Pelanggan tidak ditemukan"
                : "Belum ada pelanggan terdaftar"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci atau filter yang dipakai."
                : "Tambahkan pelanggan agar perintah produksi dapat dicatat atas namanya."
            }
            action={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : canManage ? (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Tambah Pelanggan
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      {formOpen && (
        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editingCustomer}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <CatalogDeactivateDialog
          open={Boolean(statusTarget)}
          activating={!statusTarget.is_active}
          title={
            statusTarget.is_active
              ? "Nonaktifkan pelanggan?"
              : "Aktifkan pelanggan kembali?"
          }
          description={
            statusTarget.is_active
              ? `${statusTarget.code} tidak akan muncul di pilihan order baru. Seluruh riwayat order dan datanya tetap tersimpan.`
              : `${statusTarget.code} akan muncul kembali di pilihan order baru.`
          }
          confirmLabel={statusTarget.is_active ? "Nonaktifkan" : "Aktifkan"}
          onOpenChange={(open) => {
            if (!open) {
              setStatusTarget(null);
            }
          }}
          onConfirm={handleToggleStatus}
        />
      )}
    </>
  );
}

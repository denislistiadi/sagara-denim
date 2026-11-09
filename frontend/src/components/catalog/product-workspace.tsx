"use client";

import {
  mdiAlertCircleOutline,
  mdiPlus,
  mdiTshirtCrewOutline,
} from "@mdi/js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CatalogDeactivateDialog } from "@/components/catalog/catalog-deactivate-dialog";
import { ProductFormDialog } from "@/components/catalog/product-form-dialog";
import { ProductTable } from "@/components/catalog/product-table";
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
  deactivateProduct,
  listProducts,
  updateProduct,
} from "@/lib/api";
import { usePaginatedList } from "@/lib/hooks/use-paginated-list";
import { pageRange } from "@/lib/pagination";
import { queryKeys } from "@/lib/query/keys";
import { invalidateCatalogData } from "@/lib/query/invalidation";
import type {
  CatalogActiveFilter,
  ProductRecord,
} from "@/types";

const PAGE_SIZE = 10;

export function ProductWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === "admin";

  const [activeFilter, setActiveFilter] =
    useState<CatalogActiveFilter>("aktif");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null,
  );
  const [statusTarget, setStatusTarget] = useState<ProductRecord | null>(null);

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
    queryKey: queryKeys.products.list({ active: activeFilter }),
    errorMessage: "Daftar produk gagal dimuat.",
    queryFn: ({ page: pageToLoad, search: searchTerm, signal }) =>
      listProducts(
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

  const toggleMutation = useMutation({
    mutationFn: async (target: ProductRecord) => {
      if (!target.is_active) {
        return updateProduct(target.id, { is_active: true });
      }

      await deactivateProduct(target.id);
      return { ...target, is_active: false };
    },
    onSuccess: (saved) => {
      toast({
        title: saved.is_active
          ? "Produk diaktifkan"
          : "Produk dinonaktifkan",
        description: saved.is_active
          ? `${saved.code} kembali muncul di pilihan item baru.`
          : `${saved.code} tidak muncul di pilihan item baru, tetapi riwayatnya tetap tersimpan.`,
        variant: "success",
      });
      setStatusTarget(null);
      invalidateCatalogData(queryClient, "products");
    },
    onError: (error) => {
      toast({
        title: "Gagal mengubah status produk",
        description:
          error instanceof Error
            ? error.message
            : "Status produk gagal diubah.",
        variant: "error",
      });
    },
  });

  function resetFilters() {
    setSearch("");
    setActiveFilter("aktif");
    setPage(1);
  }

  function openCreate() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function handleSaved(saved: ProductRecord, mode: "create" | "edit") {
    setFormOpen(false);
    setEditingProduct(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Produk ditambahkan",
        description: `${saved.code} tersimpan dan siap dipakai pada item order baru.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Produk diperbarui",
        description: `${saved.code} berhasil disimpan.`,
        variant: "success",
      });
    }

    invalidateCatalogData(queryClient, "products");
  }

  function openStatusDialog(product: ProductRecord) {
    toggleMutation.reset();
    setStatusTarget(product);
  }

  function handleToggleStatus() {
    if (!statusTarget) {
      return;
    }

    toggleMutation.mutate(statusTarget);
  }

  return (
    <>
      <PageHeader
        title="Produk"
        subtitle="Kelola model produk yang dapat dipakai pada item perintah produksi."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Icon path={mdiPlus} size={18} />
              Tambah Produk
            </Button>
          ) : undefined
        }
      />

      <section className="table-card materials-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode atau nama produk..."
            aria-label="Cari produk"
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
                aria-label="Filter status produk"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="aktif">Produk aktif</SelectItem>
                <SelectItem value="nonaktif">Produk nonaktif</SelectItem>
                <SelectItem value="semua">Semua produk</SelectItem>
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
            title="Daftar produk gagal dimuat"
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
            <ProductTable
              products={items}
              canManage={canManage}
              onEdit={(product) => {
                setEditingProduct(product);
                setFormOpen(true);
              }}
              onToggleActive={openStatusDialog}
            />

            <div className="table-footer">
              <span>
                Menampilkan {range.from}–{range.to} dari {data?.total ?? 0}{" "}
                produk
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
            icon={mdiTshirtCrewOutline}
            title={
              hasFilter ? "Produk tidak ditemukan" : "Belum ada produk terdaftar"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci atau filter yang dipakai."
                : "Tambahkan model produk agar item perintah produksi dapat dicatat."
            }
            action={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : canManage ? (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Tambah Produk
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      {formOpen && (
        <ProductFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          product={editingProduct}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <CatalogDeactivateDialog
          open={Boolean(statusTarget)}
          activating={!statusTarget.is_active}
          pending={toggleMutation.isPending}
          error={
            toggleMutation.error instanceof Error
              ? toggleMutation.error.message
              : null
          }
          title={
            statusTarget.is_active
              ? "Nonaktifkan produk?"
              : "Aktifkan produk kembali?"
          }
          description={
            statusTarget.is_active
              ? `${statusTarget.code} tidak akan muncul di pilihan item baru. Seluruh riwayat order dan datanya tetap tersimpan.`
              : `${statusTarget.code} akan muncul kembali di pilihan item baru.`
          }
          confirmLabel={statusTarget.is_active ? "Nonaktifkan" : "Aktifkan"}
          onOpenChange={(open) => {
            if (!open && !toggleMutation.isPending) {
              setStatusTarget(null);
            }
          }}
          onConfirm={handleToggleStatus}
        />
      )}
    </>
  );
}

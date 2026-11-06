"use client";

import {
  mdiAccountCogOutline,
  mdiAlertCircleOutline,
  mdiPlus,
  mdiShieldAccountOutline,
} from "@mdi/js";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CatalogDeactivateDialog } from "@/components/catalog/catalog-deactivate-dialog";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { UserTable } from "@/components/users/user-table";
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
import { deactivateUser, listUsers, updateUser } from "@/lib/api";
import { canManageUsers } from "@/lib/users";
import type {
  CatalogListResponse,
  UserActiveFilter,
  UserRecord,
} from "@/types";

const PAGE_SIZE = 10;

export function UserWorkspace() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const canManage = canManageUsers(user?.role);

  const [data, setData] = useState<CatalogListResponse<UserRecord> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<UserActiveFilter>("aktif");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canManage) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await listUsers({
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined,
          active: activeFilter,
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
              : "Daftar pengguna gagal dimuat.",
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
  }, [activeFilter, canManage, debouncedSearch, page, reloadKey]);

  const items = data?.items ?? [];
  const hasFilter = search.trim().length > 0 || activeFilter !== "aktif";

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Pengguna"
          subtitle="Kelola akses dan peran pengguna aplikasi."
        />
        <EmptyState
          icon={mdiShieldAccountOutline}
          title="Akses terbatas"
          description="Halaman pengguna hanya dapat diakses oleh admin produksi."
        />
      </>
    );
  }

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setActiveFilter("aktif");
    setPage(1);
  }

  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function handleSaved(saved: UserRecord, mode: "create" | "edit") {
    setFormOpen(false);
    setEditingUser(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Pengguna ditambahkan",
        description: `${saved.name} dapat masuk menggunakan kata sandi yang ditetapkan.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Pengguna diperbarui",
        description: `Data akun ${saved.name} berhasil disimpan.`,
        variant: "success",
      });
    }

    setReloadKey((current) => current + 1);
  }

  async function handleToggleStatus() {
    if (!statusTarget || statusTarget.id === user?.id) {
      return;
    }

    const activating = !statusTarget.is_active;

    if (activating) {
      await updateUser(statusTarget.id, { is_active: true });
    } else {
      await deactivateUser(statusTarget.id);
    }

    toast({
      title: activating ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan",
      description: activating
        ? `${statusTarget.name} dapat masuk kembali ke aplikasi.`
        : `${statusTarget.name} tidak dapat masuk dan seluruh sesinya telah dicabut.`,
      variant: "success",
    });
    setStatusTarget(null);
    setReloadKey((current) => current + 1);
  }

  function handlePasswordReset() {
    if (!resetTarget) {
      return;
    }

    const isSelf = resetTarget.id === user?.id;
    const name = resetTarget.name;

    setResetTarget(null);
    toast({
      title: "Kata sandi direset",
      description: isSelf
        ? "Anda akan keluar dan harus masuk kembali dengan kata sandi baru."
        : `${name} harus masuk kembali dengan kata sandi baru.`,
      variant: "success",
    });

    if (isSelf) {
      void logout();
      return;
    }

    setReloadKey((current) => current + 1);
  }

  return (
    <>
      <PageHeader
        title="Pengguna"
        subtitle="Kelola akses, peran, dan kata sandi pengguna aplikasi."
        actions={
          <Button onClick={openCreate}>
            <Icon path={mdiPlus} size={18} />
            Tambah Pengguna
          </Button>
        }
      />

      <section className="table-card materials-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau email pengguna..."
            aria-label="Cari pengguna"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value as UserActiveFilter);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter status pengguna"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="aktif">Pengguna aktif</SelectItem>
                <SelectItem value="nonaktif">Pengguna nonaktif</SelectItem>
                <SelectItem value="semua">Semua pengguna</SelectItem>
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
            title="Daftar pengguna gagal dimuat"
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
            <UserTable
              users={items}
              currentUserId={user?.id}
              onEdit={(target) => {
                setEditingUser(target);
                setFormOpen(true);
              }}
              onResetPassword={setResetTarget}
              onToggleActive={setStatusTarget}
            />

            <div className="table-footer">
              <span>
                Menampilkan {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + 1}–
                {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + items.length} dari{" "}
                {data?.total ?? 0} pengguna
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
            icon={mdiAccountCogOutline}
            title={
              hasFilter ? "Pengguna tidak ditemukan" : "Belum ada pengguna lain"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci atau filter yang dipakai."
                : "Tambahkan akun operator atau QC agar pekerjaan produksi dapat dibagi."
            }
            action={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Tambah Pengguna
                </Button>
              )
            }
          />
        )}
      </section>

      {formOpen && (
        <UserFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          user={editingUser}
          currentUserId={user?.id}
          onSaved={handleSaved}
        />
      )}

      {resetTarget && (
        <ResetPasswordDialog
          open={Boolean(resetTarget)}
          user={resetTarget}
          isSelf={resetTarget.id === user?.id}
          onOpenChange={(open) => {
            if (!open) {
              setResetTarget(null);
            }
          }}
          onCompleted={handlePasswordReset}
        />
      )}

      {statusTarget && (
        <CatalogDeactivateDialog
          open={Boolean(statusTarget)}
          activating={!statusTarget.is_active}
          title={
            statusTarget.is_active
              ? "Nonaktifkan pengguna?"
              : "Aktifkan pengguna kembali?"
          }
          description={
            statusTarget.is_active
              ? `${statusTarget.name} tidak akan dapat masuk ke aplikasi dan seluruh sesinya dicabut. Data akun tetap tersimpan.`
              : `${statusTarget.name} akan dapat masuk kembali ke aplikasi.`
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

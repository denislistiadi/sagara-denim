"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

/**
 * Bentuk respons paginasi yang dipakai seluruh endpoint daftar.
 * `items` sengaja `unknown[]` agar tipe elemen ikut apa pun respons aslinya.
 */
export interface PaginatedResponse {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UsePaginatedListOptions<TResponse extends PaginatedResponse> {
  /**
   * Ambil satu halaman data. Dipanggil ulang saat halaman, kata kunci,
   * `reload()`, atau `resetKey` berubah.
   */
  loadPage: (page: number, search?: string) => Promise<TResponse>;
  /**
   * String yang berubah saat filter berubah, misalnya `${status}|${prioritas}`.
   * Dipakai untuk memuat ulang daftar; pemanggil tetap bertugas
   * mengembalikan halaman ke 1 seperti biasa.
   */
  resetKey?: string;
  /** Pesan yang ditampilkan bila request gagal dan Error tidak punya message. */
  errorMessage: string;
}

export interface PaginatedList<TResponse extends PaginatedResponse> {
  /** Respons mentah (termasuk field tambahan seperti `summary` pada bahan). */
  data: TResponse | null;
  /** Pintasan `data?.items ?? []` dengan tipe elemen yang tepat. */
  items: TResponse["items"];
  loading: boolean;
  /** Pesan error siap tampil, atau null bila aman. */
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (value: number | ((current: number) => number)) => void;
  /** Muat ulang halaman aktif (mis. setelah aksi simpan/hapus). */
  reload: () => void;
}

/**
 * State bersama untuk halaman daftar: pencarian ter-debounce, paginasi
 * sisi server, status memuat, dan pesan error.
 *
 * Contoh:
 *   const list = usePaginatedList({
 *     resetKey: `${statusFilter}|${activeFilter}`,
 *     errorMessage: "Daftar pelanggan gagal dimuat.",
 *     loadPage: (page, search) =>
 *       listCustomers({ page, page_size: 10, search, active: activeFilter }),
 *   });
 */
export function usePaginatedList<TResponse extends PaginatedResponse>({
  loadPage,
  resetKey = "",
  errorMessage,
}: UsePaginatedListOptions<TResponse>): PaginatedList<TResponse> {
  const [data, setData] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Kata kunci pencarian berubah → kembali ke halaman 1.
  // Pola resmi React: menyesuaikan state saat render, bukan di effect,
  // supaya effect pengambil data langsung melihat halaman yang benar.
  const [previousSearch, setPreviousSearch] = useState(debouncedSearch);
  if (previousSearch !== debouncedSearch) {
    setPreviousSearch(debouncedSearch);
    setPage(1);
  }

  // Selalu pakai closure terbaru tanpa menjadikannya dependensi effect.
  const loadPageRef = useRef(loadPage);
  useEffect(() => {
    loadPageRef.current = loadPage;
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await loadPageRef.current(
          page,
          debouncedSearch || undefined,
        );

        if (!active) {
          return;
        }

        setData(response);
        if (response.total_pages > 0 && page > response.total_pages) {
          setPage(response.total_pages);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : errorMessage,
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
  }, [debouncedSearch, page, reloadKey, resetKey, errorMessage]);

  return {
    data,
    items: (data?.items ?? []) as TResponse["items"],
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    reload: () => setReloadKey((current) => current + 1),
  };
}

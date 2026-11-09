"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

export interface PaginatedQueryContext {
  page: number;
  search?: string;
  signal: AbortSignal;
}

export interface UsePaginatedListOptions<TResponse extends PaginatedResponse> {
  /**
   * Key dasar dari `queryKeys`, tanpa halaman dan kata kunci. Hook menambahkan
   * keduanya agar setiap halaman dan pencarian memiliki cache sendiri.
   */
  queryKey: readonly unknown[];
  /** Ambil satu halaman data; `signal` dipakai untuk membatalkan request lama. */
  queryFn: (context: PaginatedQueryContext) => Promise<TResponse>;
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
 *     queryKey: queryKeys.customers.list({ active: activeFilter }),
 *     errorMessage: "Daftar pelanggan gagal dimuat.",
 *     queryFn: ({ page, search, signal }) =>
 *       listCustomers(
 *         { page, page_size: 10, search, active: activeFilter },
 *         { signal },
 *       ),
 *   });
 */
export function usePaginatedList<TResponse extends PaginatedResponse>({
  queryKey,
  queryFn,
  errorMessage,
}: UsePaginatedListOptions<TResponse>): PaginatedList<TResponse> {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Kata kunci pencarian berubah → kembali ke halaman 1.
  // Pola resmi React: menyesuaikan state saat render, bukan di effect,
  // supaya query langsung memakai halaman yang benar.
  const [previousSearch, setPreviousSearch] = useState(debouncedSearch);
  if (previousSearch !== debouncedSearch) {
    setPreviousSearch(debouncedSearch);
    setPage(1);
  }

  const query = useQuery({
    queryKey: [...queryKey, page, debouncedSearch],
    queryFn: ({ signal }) =>
      queryFn({
        page,
        search: debouncedSearch || undefined,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const data = query.data ?? null;

  // Respons bisa mengecil setelah filter berubah; koreksi halaman saat render
  // agar tidak ada request tambahan ke halaman yang sudah tidak ada.
  if (data && data.total_pages > 0 && page > data.total_pages) {
    setPage(data.total_pages);
  }

  return {
    data,
    items: (data?.items ?? []) as TResponse["items"],
    loading: query.isFetching,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : errorMessage
      : null,
    search,
    setSearch,
    page,
    setPage,
    reload: () => {
      void query.refetch();
    },
  };
}

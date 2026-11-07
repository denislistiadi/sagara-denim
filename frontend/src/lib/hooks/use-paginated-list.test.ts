import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PaginatedResponse,
  usePaginatedList,
} from "@/lib/hooks/use-paginated-list";

interface Row {
  id: string;
}

interface ListResponse extends PaginatedResponse {
  items: Row[];
}

type LoadPage = (page: number, search?: string) => Promise<ListResponse>;

function response(overrides: Partial<ListResponse> = {}): ListResponse {
  return {
    items: [{ id: "row-1" }],
    total: 1,
    page: 1,
    page_size: 10,
    total_pages: 1,
    ...overrides,
  };
}

describe("usePaginatedList", () => {
  it("memuat halaman pertama saat dipasang", async () => {
    const loadPage = vi.fn<LoadPage>(async () => response());

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(loadPage).toHaveBeenCalledWith(1, undefined);
    expect(result.current.items).toEqual([{ id: "row-1" }]);
    expect(result.current.data?.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("men-debounce pencarian, memangkas spasi, dan kembali ke halaman 1", async () => {
    const loadPage = vi.fn<LoadPage>(async () =>
      response({ total_pages: 3 }),
    );

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(loadPage).toHaveBeenLastCalledWith(3, undefined));

    act(() => result.current.setSearch("  denim  "));
    await waitFor(
      () => expect(loadPage).toHaveBeenLastCalledWith(1, "denim"),
      { timeout: 1500 },
    );

    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe("  denim  ");
  });

  it("memuat ulang saat reload dipanggil", async () => {
    const loadPage = vi.fn<LoadPage>(async () => response());

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const calls = loadPage.mock.calls.length;
    act(() => result.current.reload());

    await waitFor(() =>
      expect(loadPage.mock.calls.length).toBe(calls + 1),
    );
  });

  it("memuat ulang saat resetKey berubah", async () => {
    const loadPage = vi.fn<LoadPage>(async () => response());

    const { rerender } = renderHook(
      ({ resetKey }) =>
        usePaginatedList({
          loadPage,
          resetKey,
          errorMessage: "Daftar gagal dimuat.",
        }),
      { initialProps: { resetKey: "semua" } },
    );
    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));

    rerender({ resetKey: "aktif" });

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(2));
  });

  it("memakai pesan error bawaan untuk rejection non-Error", async () => {
    const loadPage = vi.fn<LoadPage>(async () => {
      throw "offline";
    });

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );

    await waitFor(() =>
      expect(result.current.error).toBe("Daftar gagal dimuat."),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it("menampilkan pesan Error dan mempertahankan data terakhir", async () => {
    const loadPage = vi
      .fn<LoadPage>(async () => response())
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("server mati"));

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe("server mati"));

    expect(result.current.items).toEqual([{ id: "row-1" }]);
  });

  it("mengoreksi halaman yang melewati total_pages", async () => {
    const loadPage = vi.fn<LoadPage>(async (page) =>
      response({ page, total_pages: 2 }),
    );

    const { result } = renderHook(() =>
      usePaginatedList({
        loadPage,
        errorMessage: "Daftar gagal dimuat.",
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(5));

    await waitFor(() => expect(result.current.page).toBe(2));
    expect(loadPage).toHaveBeenLastCalledWith(2, undefined);
  });
});

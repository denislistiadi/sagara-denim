import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengembalikan nilai awal tanpa menunggu", () => {
    const { result } = renderHook(() => useDebouncedValue("awal", 300));

    expect(result.current).toBe("awal");
  });

  it("menunda perubahan sampai delay habis", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });

  it("membatalkan timer lama saat nilai berubah cepat", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "awal" } },
    );

    rerender({ value: "a" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("awal");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });

  it("menghormati delay kustom", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 50),
      { initialProps: { value: "lama" } },
    );

    rerender({ value: "baru" });
    act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(result.current).toBe("lama");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("baru");
  });
});

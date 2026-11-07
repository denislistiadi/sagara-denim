import { describe, expect, it } from "vitest";

import { pageRange } from "@/lib/pagination";

describe("pageRange", () => {
  it("menghitung rentang halaman penuh", () => {
    expect(pageRange(2, 10, 10)).toEqual({ from: 11, to: 20 });
  });

  it("menangani halaman terakhir yang tidak penuh", () => {
    expect(pageRange(3, 10, 4)).toEqual({ from: 21, to: 24 });
  });

  it("membatasi nomor halaman minimum ke 1", () => {
    expect(pageRange(0, 10, 5)).toEqual({ from: 1, to: 5 });
    expect(pageRange(-3, 10, 5)).toEqual({ from: 1, to: 5 });
  });

  it("mengembalikan rentang kosong saat tidak ada baris", () => {
    expect(pageRange(1, 10, 0)).toEqual({ from: 1, to: 0 });
  });
});

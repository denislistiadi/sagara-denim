/**
 * Hitung rentang baris yang sedang tampil pada tabel berpaginasi.
 *
 * Contoh: halaman 2, isi 10 baris, total 24 → { from: 11, to: 20 }.
 */
export function pageRange(
  page: number,
  pageSize: number,
  itemCount: number,
): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * pageSize + 1;

  return { from, to: from + itemCount - 1 };
}

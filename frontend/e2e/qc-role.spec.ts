import { expect, test } from "@playwright/test";
import { login, qcEmail, qcPassword } from "./helpers";

test("peran QC hanya dapat membaca data produksi", async ({ page }) => {
  await login(page, qcEmail, qcPassword);

  await expect(
    page.getByRole("link", { name: "Laporan Produksi" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Pengguna" })).toHaveCount(0);

  await page.goto("/perintah-produksi");
  await expect(
    page.getByRole("button", { name: "Buat Perintah Produksi" }),
  ).toHaveCount(0);

  const orderSearch = page.getByLabel("Cari perintah produksi");
  await page.getByRole("combobox", { name: "Filter status" }).click();
  await page.getByRole("option", { name: "QC", exact: true }).click();
  await orderSearch.fill("Distro Loka");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /Aksi untuk PRD-/ }).click();
  await page.getByRole("menuitem", { name: "Lihat detail" }).click();

  await expect(page).toHaveURL(/\/perintah-produksi\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("button", { name: "Selesaikan Produksi" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Aksi Lain" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aksi Lain" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Kembalikan ke Finishing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Ubah Perintah" }),
  ).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Arsipkan" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.goto("/bahan");
  await expect(
    page.getByRole("button", { name: "Tambah Bahan" }),
  ).toHaveCount(0);

  const materialSearch = page.getByLabel("Cari bahan");
  await materialSearch.fill("MTL-DNM-14");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Lihat detail" }).click();

  await expect(page).toHaveURL(/\/bahan\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Denim Raw 14 oz", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Stok Masuk" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stok Keluar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Penyesuaian" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ubah Bahan" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Riwayat Mutasi Stok" }),
  ).toBeVisible();
});

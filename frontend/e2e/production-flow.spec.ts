import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@sagara.co.id";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Admin#2026";
const uniqueNote = `E2E ${Date.now()}`;

test("alur order sampai export laporan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Kata Sandi", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard Produksi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Laporan Produksi" }),
  ).toBeVisible();

  await page.goto("/perintah-produksi");
  await page
    .getByRole("button", { name: "Buat Perintah Produksi" })
    .first()
    .click();

  const createDialog = page.getByRole("dialog", {
    name: "Buat Perintah Produksi",
  });
  await expect(createDialog).toBeVisible();

  await createDialog
    .getByRole("combobox", { name: "Pilih pelanggan" })
    .click();
  await page
    .getByRole("searchbox", { name: "Cari pilihan" })
    .fill("Toko Denim Jaya");
  await page.getByRole("option", { name: /Toko Denim Jaya/ }).click();

  await createDialog
    .getByRole("combobox", { name: "Model item 1" })
    .click();
  await page
    .getByRole("searchbox", { name: "Cari pilihan" })
    .fill("Jeans Slim Fit");
  await page
    .getByRole("option", { name: /Jeans Slim Fit/ })
    .first()
    .click();

  await createDialog.getByLabel("Jumlah", { exact: true }).fill("12");
  await createDialog.getByLabel("Catatan", { exact: true }).fill(uniqueNote);
  await createDialog
    .getByRole("button", { name: "Simpan Perintah" })
    .click();
  await expect(createDialog).toBeHidden();

  const search = page.getByLabel("Cari perintah produksi");
  await search.fill(uniqueNote);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator("tbody tr a.table-primary-link").first().click();
  await expect(page).toHaveURL(/\/perintah-produksi\/[0-9a-f-]+$/);

  const orderCode = (
    await page
      .locator(".page-title")
      .filter({ hasText: /^PRD-\d{4}-\d{3}$/ })
      .innerText()
  ).trim();
  expect(orderCode).toMatch(/^PRD-\d{4}-\d{3}$/);

  await page.getByRole("button", { name: "Mulai Cutting" }).click();
  const cuttingDialog = page.getByRole("dialog", { name: "Mulai Cutting" });
  await expect(cuttingDialog).toBeVisible();
  await cuttingDialog
    .getByRole("button", { name: "Mulai Cutting" })
    .click();
  await expect(cuttingDialog).toBeHidden();

  await page.getByRole("button", { name: "Catat Log Produksi" }).click();
  const logDialog = page.getByRole("dialog", { name: "Catat Log Produksi" });
  await expect(logDialog).toBeVisible();
  await logDialog.getByLabel("Output", { exact: true }).fill("12");
  await logDialog
    .getByLabel("Catatan (opsional)", { exact: true })
    .fill("Log E2E");
  await logDialog.getByRole("button", { name: "Simpan Log" }).click();
  await expect(logDialog).toBeHidden();
  await expect(page.locator(".order-log-table tbody tr")).toHaveCount(1);

  await page.getByRole("button", { name: "Selesaikan Cutting" }).click();
  const jahitDialog = page.getByRole("dialog", {
    name: "Selesaikan Cutting",
  });
  await expect(jahitDialog).toBeVisible();
  await jahitDialog
    .getByRole("button", { name: "Selesaikan Cutting" })
    .click();
  await expect(jahitDialog).toBeHidden();

  await page.getByRole("link", { name: "Lihat Laporan" }).click();
  await expect(page).toHaveURL(/\/laporan\?/);
  await expect(
    page.getByRole("heading", { name: "Laporan Produksi" }),
  ).toBeVisible();
  await expect(page.getByText("Filter perintah aktif")).toBeVisible();
  await expect(
    page.locator(".report-log-table tbody tr").filter({ hasText: orderCode }),
  ).toHaveCount(1);

  const exportButton = page.getByRole("button", {
    name: "Export laporan produksi ke CSV",
  });
  await expect(exportButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();

  const csv = await readFile(path!, "utf8");
  expect(csv).toContain(orderCode);
  expect(csv).toContain("Log E2E");
});

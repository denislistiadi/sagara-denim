import { expect, test } from "@playwright/test";
import { adminEmail, adminPassword, login } from "./helpers";

test("alur inventori: tambah bahan, mutasi masuk dan keluar, cek riwayat", async ({
  page,
}) => {
  const stamp = Date.now();
  const sku = `E2E-DNM-${stamp}`;
  const name = `Denim E2E ${stamp}`;
  const inboundNote = `Stok masuk E2E ${stamp}`;
  const outboundNote = `Stok keluar E2E ${stamp}`;

  await login(page, adminEmail, adminPassword);

  await page.goto("/bahan");
  await page.getByRole("button", { name: "Tambah Bahan" }).first().click();

  const createDialog = page.getByRole("dialog", { name: "Tambah Bahan" });
  await expect(createDialog).toBeVisible();

  await createDialog.getByRole("textbox", { name: "SKU", exact: true }).fill(sku);
  await createDialog
    .getByRole("textbox", { name: "Nama Bahan", exact: true })
    .fill(name);
  await createDialog
    .getByRole("combobox", { name: "Kategori", exact: true })
    .fill("Kain");
  await createDialog
    .getByRole("combobox", { name: "Satuan", exact: true })
    .fill("meter");
  await createDialog
    .getByRole("textbox", { name: "Minimum Stok", exact: true })
    .fill("10");
  await createDialog
    .getByRole("textbox", { name: "Stok Awal", exact: true })
    .fill("20");
  await createDialog
    .getByRole("button", { name: "Tambah Bahan" })
    .click();

  await expect(createDialog).toBeHidden();
  await expect(page.getByText("Bahan ditambahkan", { exact: true })).toBeVisible();

  const search = page.getByLabel("Cari bahan");
  await search.fill(sku);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/bahan\/[0-9a-f-]+$/);

  const hero = page.locator(".stock-hero");
  const history = page.locator(".material-history-table");

  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator(".stock-hero-value")).toContainText("20");
  await expect(page.locator(".stock-hero-value span")).toHaveText("meter");
  await expect(
    page.getByRole("heading", { name: "Riwayat Mutasi Stok" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Stok Masuk" }).click();
  const inboundDialog = page.getByRole("dialog", {
    name: "Catat Mutasi Stok",
  });
  await expect(inboundDialog).toBeVisible();
  await inboundDialog
    .getByRole("textbox", { name: "Jumlah", exact: true })
    .fill("5");
  await inboundDialog
    .getByRole("textbox", { name: "Catatan", exact: true })
    .fill(inboundNote);
  await inboundDialog.getByRole("button", { name: "Simpan Mutasi" }).click();

  await expect(inboundDialog).toBeHidden();
  await expect(hero).toContainText("25");
  await expect(history).toContainText(inboundNote);

  await page.getByRole("button", { name: "Stok Keluar" }).click();
  const outboundDialog = page.getByRole("dialog", {
    name: "Catat Mutasi Stok",
  });
  await expect(outboundDialog).toBeVisible();
  await outboundDialog
    .getByRole("textbox", { name: "Jumlah", exact: true })
    .fill("3");
  const orderField = outboundDialog.locator(".dialog-field", {
    hasText: "Tautkan ke Perintah Produksi",
  });
  await orderField.getByRole("combobox").click();
  await page
    .getByRole("searchbox", { name: "Cari pilihan" })
    .fill("PRD-2611-020");
  await page.getByRole("option", { name: /PRD-2611-020/ }).click();
  await outboundDialog
    .getByRole("textbox", { name: "Catatan", exact: true })
    .fill(outboundNote);
  await outboundDialog.getByRole("button", { name: "Simpan Mutasi" }).click();

  await expect(outboundDialog).toBeHidden();
  await expect(hero).toContainText("22");
  await expect(history).toContainText(outboundNote);
  await expect(history).toContainText("PRD-2611-020");
  await expect(history.locator("tbody tr")).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator(".stock-hero-value")).toContainText("22");
  await expect(page.locator(".material-history-table")).toContainText(inboundNote);
  await expect(page.locator(".material-history-table")).toContainText(
    outboundNote,
  );
});

import { expect, type Page } from "@playwright/test";

export const adminEmail =
  process.env.E2E_ADMIN_EMAIL ?? "admin@sagara.co.id";
export const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? "Admin#2026";
export const qcEmail = process.env.E2E_QC_EMAIL ?? "qc@sagara.co.id";
export const qcPassword = process.env.E2E_QC_PASSWORD ?? "QC#2026";

/** Login lewat UI lalu tunggu dashboard siap dipakai. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(
    page.getByRole("heading", { name: "Dashboard Produksi" }),
  ).toBeVisible();
}

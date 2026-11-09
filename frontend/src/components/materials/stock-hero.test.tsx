import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StockHero } from "@/components/materials/stock-hero";
import type { UserRole } from "@/types";
import { makeMaterial } from "@/test/fixtures";

function renderHero(role?: UserRole, isActive = true) {
  const onOpenMovement = vi.fn();
  render(
    <StockHero
      material={makeMaterial({ is_active: isActive })}
      role={role}
      onOpenMovement={onOpenMovement}
    />,
  );
  return { onOpenMovement };
}

describe("StockHero", () => {
  it("menampilkan semua aksi stok untuk admin", () => {
    renderHero("admin");

    expect(screen.getByRole("button", { name: "Stok Masuk" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stok Keluar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Penyesuaian" })).toBeVisible();
  });

  it("menyembunyikan penyesuaian untuk operator", () => {
    renderHero("operator");

    expect(screen.getByRole("button", { name: "Stok Masuk" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stok Keluar" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Penyesuaian" }),
    ).not.toBeInTheDocument();
  });

  it("tidak menampilkan aksi mutasi untuk QC", () => {
    renderHero("qc");

    expect(
      screen.queryByRole("button", { name: "Stok Masuk" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stok Keluar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Penyesuaian" }),
    ).not.toBeInTheDocument();
  });

  it("tidak menampilkan aksi mutasi untuk bahan nonaktif", () => {
    renderHero("admin", false);

    expect(
      screen.queryByRole("button", { name: "Stok Masuk" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stok Keluar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Penyesuaian" }),
    ).not.toBeInTheDocument();
  });

  it("meneruskan tipe mutasi yang dipilih ke parent", async () => {
    const user = userEvent.setup();
    const { onOpenMovement } = renderHero("admin");

    await user.click(screen.getByRole("button", { name: "Stok Keluar" }));

    expect(onOpenMovement).toHaveBeenCalledWith("keluar");
  });
});

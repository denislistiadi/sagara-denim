import {
  mdiAccountCogOutline,
  mdiAccountGroupOutline,
  mdiChartBoxOutline,
  mdiClipboardTextOutline,
  mdiFactory,
  mdiLayersOutline,
  mdiPaletteOutline,
  mdiTshirtCrewOutline,
  mdiVectorSquare,
  mdiViewDashboardOutline,
  mdiViewGridOutline,
} from "@mdi/js";
import type { NavItem, UserRole } from "@/types";

export const MAIN_NAV: readonly NavItem[] = [
  { label: "Dashboard", href: "/", icon: mdiViewDashboardOutline },
  {
    label: "Perintah Produksi",
    href: "/perintah-produksi",
    icon: mdiClipboardTextOutline,
  },
  {
    label: "Antrean Produksi",
    href: "/antrean-produksi",
    icon: mdiFactory,
  },
  {
    label: "Bahan & Aksesoris",
    href: "/bahan",
    icon: mdiLayersOutline,
  },
  {
    label: "Pelanggan",
    href: "/pelanggan",
    icon: mdiAccountGroupOutline,
  },
  {
    label: "Produk",
    href: "/produk",
    icon: mdiTshirtCrewOutline,
  },
  {
    label: "Pengguna",
    href: "/pengguna",
    icon: mdiAccountCogOutline,
    roles: ["admin"] as readonly UserRole[],
  },
  { label: "Laporan", href: "/laporan", icon: mdiChartBoxOutline },
] as const;

export const DOCS_NAV: readonly NavItem[] = [
  {
    label: "Fondasi",
    href: "/design-system/fondasi",
    icon: mdiPaletteOutline,
  },
  {
    label: "Komponen",
    href: "/design-system/komponen",
    icon: mdiViewGridOutline,
  },
  {
    label: "Pola",
    href: "/design-system/pola",
    icon: mdiVectorSquare,
  },
] as const;

export interface PageMeta {
  title: string;
  subtitle: string;
}

const PAGE_META: readonly (PageMeta & { match: string; exact?: boolean })[] = [
  {
    match: "/",
    exact: true,
    title: "Dashboard",
    subtitle: "Ringkasan produksi hari ini",
  },
  {
    match: "/perintah-produksi",
    title: "Perintah Produksi",
    subtitle: "Kelola perintah dari cutting sampai selesai",
  },
  {
    match: "/antrean-produksi",
    title: "Antrean Produksi",
    subtitle: "Pantau pergerakan tiap tahap produksi",
  },
  {
    match: "/bahan",
    title: "Bahan & Aksesoris",
    subtitle: "Stok kain, benang, dan aksesoris",
  },
  {
    match: "/pelanggan",
    title: "Pelanggan",
    subtitle: "Data master pelanggan produksi",
  },
  {
    match: "/produk",
    title: "Produk",
    subtitle: "Data master model produk",
  },
  {
    match: "/pengguna",
    title: "Pengguna",
    subtitle: "Kelola akses dan peran pengguna",
  },
  {
    match: "/laporan",
    title: "Laporan",
    subtitle: "Rekap output dan kualitas produksi",
  },
  {
    match: "/design-system",
    exact: true,
    title: "Design System",
    subtitle: "Fondasi visual Sagara Denim",
  },
  {
    match: "/design-system/fondasi",
    title: "Fondasi",
    subtitle: "Warna, tipografi, spacing, dan elevasi",
  },
  {
    match: "/design-system/komponen",
    title: "Komponen",
    subtitle: "Galeri komponen dan seluruh state",
  },
  {
    match: "/design-system/pola",
    title: "Pola",
    subtitle: "Susunan komponen menjadi halaman",
  },
] as const;

export function getPageMeta(pathname: string): PageMeta {
  const found = PAGE_META.find((item) =>
    item.exact ? pathname === item.match : pathname.startsWith(item.match),
  );

  return found
    ? { title: found.title, subtitle: found.subtitle }
    : { title: "Sagara Denim", subtitle: "Manajemen Produksi Celana Jeans" };
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

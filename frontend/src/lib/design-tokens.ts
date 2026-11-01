import {
  mdiAccountGroupOutline,
  mdiAlertCircleOutline,
  mdiCalendarOutline,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiContentCut,
  mdiFactory,
  mdiHanger,
  mdiInformationOutline,
  mdiLayersOutline,
  mdiPackageVariantClosed,
  mdiScissorsCutting,
  mdiTapeMeasure,
  mdiTshirtCrewOutline,
} from "@mdi/js";

export interface ColorToken {
  name: string;
  value: string;
  variable: string;
  description: string;
  dark?: boolean;
}

export const COLOR_TOKENS: readonly ColorToken[] = [
  {
    name: "Primary",
    value: "#FF5B00",
    variable: "--ds-primary",
    description: "Aksi utama, status aktif, dan aksen brand.",
  },
  {
    name: "Primary Text",
    value: "#C2410C",
    variable: "--ds-primary-text",
    description: "Teks oranye di atas latar terang agar kontras aman.",
  },
  {
    name: "Sidebar",
    value: "#16181D",
    variable: "--ds-sidebar-bg",
    description: "Latar navigasi utama dan elemen gelap.",
    dark: true,
  },
  {
    name: "Canvas",
    value: "#F8F9FA",
    variable: "--ds-canvas",
    description: "Latar halaman di belakang kartu.",
  },
  {
    name: "Surface",
    value: "#FFFFFF",
    variable: "--ds-surface",
    description: "Kartu, tabel, dialog, dan header.",
  },
  {
    name: "Border",
    value: "#EEEEF0",
    variable: "--ds-border",
    description: "Garis pemisah halus antar elemen.",
  },
  {
    name: "Border Strong",
    value: "#E5E7EB",
    variable: "--ds-border-strong",
    description: "Batas kontrol, tabel, dan header.",
  },
  {
    name: "Text",
    value: "#111827",
    variable: "--ds-text",
    description: "Judul dan teks utama.",
  },
  {
    name: "Text Muted",
    value: "#6B7280",
    variable: "--ds-text-muted",
    description: "Deskripsi dan metadata.",
  },
  {
    name: "Text Subtle",
    value: "#9CA3AF",
    variable: "--ds-text-subtle",
    description: "Placeholder dan label sekunder.",
  },
  {
    name: "Success",
    value: "#10B981",
    variable: "--ds-success",
    description: "Status selesai, stok aman, dan tren positif.",
  },
  {
    name: "Warning",
    value: "#F59E0B",
    variable: "--ds-warning",
    description: "Stok menipis dan peringatan.",
  },
  {
    name: "Danger",
    value: "#EF4444",
    variable: "--ds-danger",
    description: "Reject, pembatalan, dan aksi destruktif.",
  },
  {
    name: "Info",
    value: "#3B82F6",
    variable: "--ds-info",
    description: "Cutting, informasi, dan status netral aktif.",
  },
  {
    name: "Purple",
    value: "#8B5CF6",
    variable: "--ds-purple",
    description: "Finishing dan kategori sekunder.",
  },
] as const;

export interface TypeToken {
  name: string;
  sample: string;
  className: string;
  meta: string;
}

export const TYPE_TOKENS: readonly TypeToken[] = [
  {
    name: "Page Title",
    sample: "Dashboard Produksi",
    className: "type-page-title",
    meta: "19px · 700 · -0.01em",
  },
  {
    name: "Section Title",
    sample: "Output Harian",
    className: "type-section-title",
    meta: "15px · 600 · 0",
  },
  {
    name: "Body",
    sample: "Kelola perintah produksi dari cutting sampai selesai.",
    className: "type-body",
    meta: "14px · 400 · 1.55",
  },
  {
    name: "Label",
    sample: "STATUS PRODUKSI",
    className: "type-label",
    meta: "11.5px · 600 · 0.04em",
  },
  {
    name: "Caption",
    sample: "Diperbarui 5 menit lalu",
    className: "type-caption",
    meta: "12px · 400 · 1.4",
  },
] as const;

export const SPACING_TOKENS = [
  { name: "4", value: "4px" },
  { name: "8", value: "8px" },
  { name: "12", value: "12px" },
  { name: "16", value: "16px" },
  { name: "20", value: "20px" },
  { name: "24", value: "24px" },
  { name: "32", value: "32px" },
  { name: "40", value: "40px" },
] as const;

export const RADIUS_TOKENS = [
  { name: "Nav", value: "10px", note: "Item sidebar" },
  { name: "Input", value: "12px", note: "Field dan kartu data" },
  { name: "Button", value: "14px", note: "Tombol utama" },
  { name: "Card", value: "18px", note: "Kartu dan dialog" },
  { name: "Pill", value: "30px", note: "Search dan badge" },
] as const;

export const SHADOW_TOKENS = [
  {
    name: "Card",
    value: "0 4px 20px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.02)",
    className: "shadow-card",
  },
  {
    name: "Hover",
    value: "0 8px 26px rgba(0,0,0,.07)",
    className: "shadow-hover",
  },
  {
    name: "Orange Glow",
    value: "0 6px 18px rgba(255,91,0,.35)",
    className: "shadow-glow",
  },
] as const;

export const ICON_SAMPLES = [
  { name: "Dashboard", icon: mdiFactory },
  { name: "Order", icon: mdiPackageVariantClosed },
  { name: "Cutting", icon: mdiContentCut },
  { name: "Jahit", icon: mdiScissorsCutting },
  { name: "Finishing", icon: mdiHanger },
  { name: "Bahan", icon: mdiLayersOutline },
  { name: "Ukuran", icon: mdiTapeMeasure },
  { name: "Produk", icon: mdiTshirtCrewOutline },
  { name: "Tim", icon: mdiAccountGroupOutline },
  { name: "Jadwal", icon: mdiCalendarOutline },
  { name: "Durasi", icon: mdiClockOutline },
  { name: "Selesai", icon: mdiCheckCircleOutline },
  { name: "Peringatan", icon: mdiAlertCircleOutline },
  { name: "Informasi", icon: mdiInformationOutline },
] as const;

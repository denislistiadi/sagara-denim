const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatDate(date: string, withYear = false): string {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day || month < 1 || month > 12) {
    return date;
  }

  const base = `${String(day).padStart(2, "0")} ${MONTHS_SHORT[month - 1]}`;
  return withYear ? `${base} ${year}` : base;
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day || month < 1 || month > 12) {
    return date;
  }

  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

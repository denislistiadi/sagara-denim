export type ISODate = string;

export interface CalendarDay {
  iso: ISODate;
  day: number;
  inMonth: boolean;
  weekday: number;
  isWeekend: boolean;
}

export const MONTH_NAMES = [
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

export const MONTH_NAMES_SHORT = [
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

export const WEEKDAYS_SHORT = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
] as const;

export const WEEKDAYS_LONG = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISO(value: string): Date | null {
  const match = ISO_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isValidISO(value: string): boolean {
  return parseISO(value) !== null;
}

export function toISO(date: Date): ISODate {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function toWIBDate(value: string): ISODate | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value;

  const iso = `${read("year")}-${read("month")}-${read("day")}`;
  return isValidISO(iso) ? iso : null;
}

export function addDays(value: ISODate, amount: number): ISODate {
  const date = parseISO(value);

  if (!date) {
    return value;
  }

  date.setDate(date.getDate() + amount);
  return toISO(date);
}

export function startOfMonth(value: ISODate): ISODate {
  const date = parseISO(value);

  if (!date) {
    return value;
  }

  return toISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(value: ISODate): ISODate {
  const date = parseISO(value);

  if (!date) {
    return value;
  }

  return toISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function addMonths(value: ISODate, amount: number): ISODate {
  const date = parseISO(value);

  if (!date) {
    return value;
  }

  return toISO(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export function shiftMonth(value: ISODate, amount: number): ISODate {
  const date = parseISO(value);

  if (!date) {
    return value;
  }

  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

  target.setDate(Math.min(date.getDate(), lastDay));
  return toISO(target);
}

export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function getCalendarDays(month: ISODate): CalendarDay[] {
  const parsed = parseISO(month);

  if (!parsed) {
    return [];
  }

  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();
  const first = new Date(year, monthIndex, 1);
  const offset = weekdayIndex(first);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthIndex, index - offset + 1);
    const weekday = weekdayIndex(date);

    return {
      iso: toISO(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      weekday,
      isWeekend: weekday >= 5,
    };
  });
}

export function compareISO(a: ISODate, b: ISODate): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

export function normalizeRange(
  start: ISODate,
  end: ISODate,
): [ISODate, ISODate] {
  return compareISO(start, end) <= 0 ? [start, end] : [end, start];
}

export function isWithinRange(
  date: ISODate,
  start: ISODate | null | undefined,
  end: ISODate | null | undefined,
): boolean {
  if (!start || !end) {
    return false;
  }

  const [from, to] = normalizeRange(start, end);
  return compareISO(date, from) >= 0 && compareISO(date, to) <= 0;
}

export function isDateDisabled(
  date: ISODate,
  min?: ISODate,
  max?: ISODate,
): boolean {
  if (min && compareISO(date, min) < 0) {
    return true;
  }

  if (max && compareISO(date, max) > 0) {
    return true;
  }

  return false;
}

export function isToday(date: ISODate): boolean {
  return date === todayISO();
}

export function formatMonthYear(month: ISODate): string {
  const date = parseISO(month);

  if (!date) {
    return month;
  }

  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(date: ISODate): string {
  const parsed = parseISO(date);

  if (!parsed) {
    return date;
  }

  return `${parsed.getDate()} ${MONTH_NAMES_SHORT[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function formatDateLong(date: ISODate): string {
  const parsed = parseISO(date);

  if (!parsed) {
    return date;
  }

  return `${WEEKDAYS_LONG[weekdayIndex(parsed)]}, ${parsed.getDate()} ${
    MONTH_NAMES[parsed.getMonth()]
  } ${parsed.getFullYear()}`;
}

export function formatDateRange(
  start: ISODate | null | undefined,
  end: ISODate | null | undefined,
): string {
  if (!start && !end) {
    return "";
  }

  if (start && !end) {
    return `${formatDateShort(start)} – …`;
  }

  if (!start && end) {
    return `… – ${formatDateShort(end)}`;
  }

  return `${formatDateShort(start!)} – ${formatDateShort(end!)}`;
}

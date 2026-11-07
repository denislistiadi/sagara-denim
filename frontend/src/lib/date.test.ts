import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  compareISO,
  endOfMonth,
  formatDateLong,
  formatDateRange,
  formatDateShort,
  formatMonthYear,
  getCalendarDays,
  isDateDisabled,
  isToday,
  isWithinRange,
  isValidISO,
  normalizeRange,
  parseISO,
  shiftMonth,
  startOfMonth,
  toISO,
  toWIBDate,
  todayISO,
  weekdayIndex,
} from "@/lib/date";

describe("parseISO dan toISO", () => {
  it("mengurai tanggal ISO yang valid", () => {
    const parsed = parseISO("2024-02-29");

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(1);
    expect(parsed?.getDate()).toBe(29);
  });

  it("menolak format dan tanggal yang tidak valid", () => {
    expect(parseISO("2026-2-1")).toBeNull();
    expect(parseISO("2026-02-30")).toBeNull();
    expect(parseISO("2026-13-01")).toBeNull();
    expect(parseISO("bukan-tanggal")).toBeNull();
    expect(isValidISO("2026-02-29")).toBe(false);
    expect(isValidISO("2024-02-29")).toBe(true);
  });

  it("mengubah Date lokal menjadi ISO tanpa pergeseran zona waktu", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISO(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("aritmetika tanggal", () => {
  it("menambah dan mengurangi hari melewati batas bulan/tahun", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("mengembalikan nilai asli bila tanggal tidak valid", () => {
    expect(addDays("invalid", 1)).toBe("invalid");
    expect(startOfMonth("invalid")).toBe("invalid");
    expect(endOfMonth("invalid")).toBe("invalid");
    expect(addMonths("invalid", 1)).toBe("invalid");
    expect(shiftMonth("invalid", 1)).toBe("invalid");
  });

  it("menghitung awal dan akhir bulan", () => {
    expect(startOfMonth("2026-11-15")).toBe("2026-11-01");
    expect(endOfMonth("2026-11-15")).toBe("2026-11-30");
    expect(endOfMonth("2024-02-10")).toBe("2024-02-29");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
  });

  it("addMonths selalu memakai hari pertama", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(addMonths("2026-11-15", -2)).toBe("2026-09-01");
  });

  it("shiftMonth mempertahankan hari dan mengklip ke akhir bulan", () => {
    expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonth("2024-01-31", 1)).toBe("2024-02-29");
    expect(shiftMonth("2026-03-31", -1)).toBe("2026-02-28");
    expect(shiftMonth("2026-11-15", 1)).toBe("2026-12-15");
  });
});

describe("kalender", () => {
  it("menghasilkan 42 hari dengan offset Senin", () => {
    const days = getCalendarDays("2026-11-01");

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      iso: "2026-10-26",
      day: 26,
      inMonth: false,
      weekday: 0,
      isWeekend: false,
    });

    const firstOfMonth = days.find((day) => day.iso === "2026-11-01");
    expect(firstOfMonth).toMatchObject({
      inMonth: true,
      weekday: 6,
      isWeekend: true,
    });
  });

  it("mengembalikan array kosong untuk bulan tidak valid", () => {
    expect(getCalendarDays("2026-13-01")).toEqual([]);
  });

  it("menghitung indeks hari dengan Senin sebagai 0", () => {
    expect(weekdayIndex(new Date(2026, 10, 2))).toBe(0);
    expect(weekdayIndex(new Date(2026, 10, 8))).toBe(6);
  });
});

describe("perbandingan dan rentang", () => {
  it("membandingkan tanggal ISO secara leksikografis", () => {
    expect(compareISO("2026-01-01", "2026-01-01")).toBe(0);
    expect(compareISO("2026-01-01", "2026-01-02")).toBe(-1);
    expect(compareISO("2026-02-01", "2026-01-31")).toBe(1);
  });

  it("menormalkan rentang terbalik", () => {
    expect(normalizeRange("2026-11-10", "2026-11-01")).toEqual([
      "2026-11-01",
      "2026-11-10",
    ]);
  });

  it("memeriksa tanggal di dalam rentang", () => {
    expect(isWithinRange("2026-11-05", "2026-11-01", "2026-11-10")).toBe(true);
    expect(isWithinRange("2026-11-10", "2026-11-01", "2026-11-10")).toBe(true);
    expect(isWithinRange("2026-11-11", "2026-11-01", "2026-11-10")).toBe(false);
    expect(isWithinRange("2026-11-05", "2026-11-10", "2026-11-01")).toBe(true);
    expect(isWithinRange("2026-11-05", null, "2026-11-10")).toBe(false);
    expect(isWithinRange("2026-11-05", "2026-11-01", null)).toBe(false);
  });

  it("menonaktifkan tanggal di luar batas min/max", () => {
    expect(isDateDisabled("2026-11-04", "2026-11-05")).toBe(true);
    expect(isDateDisabled("2026-11-06", undefined, "2026-11-05")).toBe(true);
    expect(isDateDisabled("2026-11-05", "2026-11-05", "2026-11-05")).toBe(false);
    expect(isDateDisabled("2026-11-05")).toBe(false);
  });

  it("mengenali hari ini", () => {
    expect(isToday(todayISO())).toBe(true);
    expect(isToday("2000-01-01")).toBe(false);
  });
});

describe("format tanggal", () => {
  it("memformat bulan dan tahun", () => {
    expect(formatMonthYear("2026-11-01")).toBe("November 2026");
    expect(formatMonthYear("invalid")).toBe("invalid");
  });

  it("memformat tanggal pendek dan panjang", () => {
    expect(formatDateShort("2026-11-05")).toBe("5 Nov 2026");
    expect(formatDateLong("2026-11-05")).toBe("Kamis, 5 November 2026");
    expect(formatDateShort("invalid")).toBe("invalid");
    expect(formatDateLong("invalid")).toBe("invalid");
  });

  it("memformat rentang dengan sisi yang kosong", () => {
    expect(formatDateRange(null, null)).toBe("");
    expect(formatDateRange("2026-11-05", null)).toBe("5 Nov 2026 – …");
    expect(formatDateRange(null, "2026-11-07")).toBe("… – 7 Nov 2026");
    expect(formatDateRange("2026-11-05", "2026-11-07")).toBe(
      "5 Nov 2026 – 7 Nov 2026",
    );
  });
});

describe("toWIBDate", () => {
  it("mengubah timestamp UTC menjadi tanggal WIB", () => {
    expect(toWIBDate("2026-01-01T16:59:00Z")).toBe("2026-01-01");
    expect(toWIBDate("2026-01-01T17:00:00Z")).toBe("2026-01-02");
  });

  it("mengembalikan null untuk timestamp tidak valid", () => {
    expect(toWIBDate("bukan-timestamp")).toBeNull();
  });
});

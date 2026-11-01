"use client";

import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Icon } from "@/components/icon";
import {
  addDays,
  formatDateLong,
  formatMonthYear,
  getCalendarDays,
  isDateDisabled,
  isToday,
  normalizeRange,
  shiftMonth,
  startOfMonth,
  WEEKDAYS_SHORT,
  type ISODate,
} from "@/lib/date";
import { cn } from "@/lib/cn";

export interface CalendarRange {
  start?: ISODate | null;
  end?: ISODate | null;
}

export interface CalendarProps {
  month: ISODate;
  onMonthChange: (month: ISODate) => void;
  onSelect: (date: ISODate) => void;
  selected?: ISODate | null;
  range?: CalendarRange;
  hovered?: ISODate | null;
  onHover?: (date: ISODate | null) => void;
  min?: ISODate;
  max?: ISODate;
  className?: string;
}

export function Calendar({
  month,
  onMonthChange,
  onSelect,
  selected = null,
  range,
  hovered = null,
  onHover,
  min,
  max,
  className,
}: CalendarProps) {
  const days = getCalendarDays(month);
  const gridRef = useRef<HTMLDivElement>(null);
  const rangeStart = range?.start ?? null;
  const rangeEnd = range?.end ?? null;
  const isPreviewing = Boolean(rangeStart && !rangeEnd && hovered);
  const previewEnd = isPreviewing ? hovered : null;
  const effectiveEnd = rangeEnd ?? previewEnd;
  const normalizedRange =
    rangeStart && effectiveEnd
      ? normalizeRange(rangeStart, effectiveEnd)
      : rangeStart
        ? ([rangeStart, rangeStart] as const)
        : null;

  const initialFocus =
    selected ?? rangeStart ?? startOfMonth(month) ?? month;
  const [focusedDate, setFocusedDate] = useState<ISODate>(initialFocus);
  const pendingFocusRef = useRef<ISODate | null>(null);
  const activeDate = days.some((day) => day.iso === focusedDate)
    ? focusedDate
    : startOfMonth(month);

  useEffect(() => {
    const pending = pendingFocusRef.current;

    if (!pending) {
      return;
    }

    const target = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${pending}"]`,
    );

    if (target) {
      target.focus();
      pendingFocusRef.current = null;
    }
  }, [month]);

  function focusDay(date: ISODate) {
    if (isDateDisabled(date, min, max)) {
      return;
    }

    setFocusedDate(date);

    const target = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${date}"]`,
    );

    if (target) {
      target.focus();
      return;
    }

    pendingFocusRef.current = date;
    onMonthChange(startOfMonth(date));
  }

  function changeMonth(offset: -1 | 1) {
    const nextMonth = startOfMonth(
      addDays(month, offset === -1 ? -1 : 32),
    );

    setFocusedDate(nextMonth);
    onMonthChange(nextMonth);
  }

  function handleDayKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    date: ISODate,
    weekday: number,
  ) {
    let target: ISODate | null = null;

    switch (event.key) {
      case "ArrowLeft":
        target = addDays(date, -1);
        break;
      case "ArrowRight":
        target = addDays(date, 1);
        break;
      case "ArrowUp":
        target = addDays(date, -7);
        break;
      case "ArrowDown":
        target = addDays(date, 7);
        break;
      case "Home":
        target = addDays(date, -weekday);
        break;
      case "End":
        target = addDays(date, 6 - weekday);
        break;
      case "PageUp":
        target = shiftMonth(date, -1);
        break;
      case "PageDown":
        target = shiftMonth(date, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    focusDay(target);
  }

  return (
    <div className={cn("ds-calendar", className)}>
      <div className="ds-calendar-head">
        <button
          type="button"
          className="ds-calendar-nav"
          onClick={() => changeMonth(-1)}
          aria-label="Bulan sebelumnya"
        >
          <Icon path={mdiChevronLeft} size={18} />
        </button>
        <span className="ds-calendar-title" aria-live="polite">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          className="ds-calendar-nav"
          onClick={() => changeMonth(1)}
          aria-label="Bulan berikutnya"
        >
          <Icon path={mdiChevronRight} size={18} />
        </button>
      </div>

      <div className="ds-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS_SHORT.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div
        ref={gridRef}
        className="ds-calendar-grid"
        role="group"
        aria-label={`Kalender ${formatMonthYear(month)}`}
        onMouseLeave={() => onHover?.(null)}
      >
        {days.map((day, index) => {
          const disabled = isDateDisabled(day.iso, min, max);
          const isRangeStart = Boolean(rangeStart && day.iso === rangeStart);
          const isRangeEnd = Boolean(rangeEnd && day.iso === rangeEnd);
          const inRange = Boolean(
            !disabled &&
              normalizedRange &&
              day.iso >= normalizedRange[0] &&
              day.iso <= normalizedRange[1],
          );
          const isSelected =
            !disabled &&
            (selected === day.iso || isRangeStart || isRangeEnd);
          const showRange = Boolean(
            normalizedRange && normalizedRange[0] !== normalizedRange[1],
          );
          const rangeBoundaryStart = Boolean(
            showRange && normalizedRange && day.iso === normalizedRange[0],
          );
          const rangeBoundaryEnd = Boolean(
            showRange && normalizedRange && day.iso === normalizedRange[1],
          );

          return (
            <button
              key={day.iso}
              type="button"
              data-date={day.iso}
              className={cn(
                "ds-calendar-day",
                !day.inMonth && "ds-calendar-day-outside",
                day.isWeekend && "ds-calendar-day-weekend",
                isToday(day.iso) && "ds-calendar-day-today",
                isSelected && "ds-calendar-day-selected",
                rangeBoundaryStart && "ds-calendar-day-range-start",
                rangeBoundaryEnd && "ds-calendar-day-range-end",
                inRange &&
                  !isSelected &&
                  showRange &&
                  (isPreviewing
                    ? "ds-calendar-day-preview"
                    : "ds-calendar-day-range"),
                inRange &&
                  index % 7 === 0 &&
                  !rangeBoundaryStart &&
                  "ds-calendar-day-week-start",
                inRange &&
                  index % 7 === 6 &&
                  !rangeBoundaryEnd &&
                  "ds-calendar-day-week-end",
                disabled && "ds-calendar-day-disabled",
                activeDate === day.iso && "ds-calendar-day-focus",
              )}
              aria-label={formatDateLong(day.iso)}
              aria-pressed={isSelected || undefined}
              aria-current={isToday(day.iso) ? "date" : undefined}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              tabIndex={activeDate === day.iso ? 0 : -1}
              onClick={() => onSelect(day.iso)}
              onFocus={() => setFocusedDate(day.iso)}
              onMouseEnter={() => onHover?.(day.iso)}
              onKeyDown={(event) =>
                handleDayKeyDown(event, day.iso, day.weekday)
              }
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

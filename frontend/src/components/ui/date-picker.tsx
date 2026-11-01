"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { mdiCalendarOutline, mdiCalendarRange, mdiClose } from "@mdi/js";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ControlShell } from "@/components/ui/control-shell";
import {
  compareISO,
  formatDateRange,
  formatDateShort,
  isDateDisabled,
  startOfMonth,
  todayISO,
  type ISODate,
} from "@/lib/date";
import { cn } from "@/lib/cn";

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

// Placeholder for the first render only; the real month is resolved when the
// popover opens so the component stays deterministic during prerender.
const INITIAL_MONTH: ISODate = "2026-11-01";

interface DateTriggerProps {
  prefix: ReactNode;
  label: string;
  placeholder: string;
  hasValue: boolean;
  disabled: boolean;
  invalid: boolean;
  open: boolean;
  clearable: boolean;
  clearLabel: string;
  onClear: (event: MouseEvent<HTMLButtonElement>) => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

function DateTrigger({
  prefix,
  label,
  placeholder,
  hasValue,
  disabled,
  invalid,
  open,
  clearable,
  clearLabel,
  onClear,
  id,
  className,
  ariaLabel,
}: DateTriggerProps) {
  return (
    <ControlShell
      className={cn("ds-datepicker-control", className)}
      prefix={prefix}
      suffix={
        clearable && hasValue ? (
          <button
            type="button"
            className="ds-control-clear"
            onClick={onClear}
            disabled={disabled}
            aria-label={clearLabel}
          >
            <Icon path={mdiClose} size={15} />
          </button>
        ) : undefined
      }
      invalid={invalid}
      disabled={disabled}
      data-state={open ? "open" : undefined}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          className="ds-datepicker-trigger"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
        >
          <span
            className={cn(
              "ds-control-value",
              !hasValue && "ds-control-placeholder",
            )}
          >
            {hasValue ? label : placeholder}
          </span>
        </button>
      </PopoverPrimitive.Trigger>
    </ControlShell>
  );
}

export interface DatePickerProps {
  value?: ISODate;
  defaultValue?: ISODate;
  onChange?: (value: ISODate) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  min?: ISODate;
  max?: ISODate;
  id?: string;
  name?: string;
  className?: string;
  align?: "start" | "center" | "end";
  ariaLabel?: string;
}

export function DatePicker({
  value,
  defaultValue = "",
  onChange,
  placeholder = "Pilih tanggal",
  disabled = false,
  invalid = false,
  clearable = true,
  min,
  max,
  id,
  name,
  className,
  align = "start",
  ariaLabel = "Pilih tanggal",
}: DatePickerProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const currentValue = value !== undefined ? value : uncontrolledValue;
  const validValue = currentValue || null;
  const [today, setToday] = useState<ISODate>(INITIAL_MONTH);
  const [month, setMonth] = useState(
    startOfMonth(validValue ?? INITIAL_MONTH),
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      const now = todayISO();
      setToday(now);
      setMonth(startOfMonth(validValue ?? now));
    }
  }

  function commit(nextValue: ISODate) {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }

    onChange?.(nextValue);
    setOpen(false);
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (value === undefined) {
      setUncontrolledValue("");
    }

    onChange?.("");
  }

  const todayDisabled = isDateDisabled(today, min, max);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DateTrigger
        prefix={<Icon path={mdiCalendarOutline} size={17} />}
        label={validValue ? formatDateShort(validValue) : ""}
        placeholder={placeholder}
        hasValue={Boolean(validValue)}
        disabled={disabled}
        invalid={invalid}
        open={open}
        clearable={clearable}
        clearLabel="Hapus tanggal"
        onClear={clear}
        id={id}
        className={className}
        ariaLabel={ariaLabel}
      />

      {name ? <input type="hidden" name={name} value={currentValue} /> : null}

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="ds-popover ds-datepicker-content"
          data-ds-overlay=""
          align={align}
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const content = event.currentTarget as HTMLElement;
            const target = content.querySelector<HTMLElement>(
              ".ds-calendar-day[tabindex='0']",
            );
            (target ?? content.querySelector<HTMLElement>(".ds-calendar-day"))?.focus();
          }}
        >
          <Calendar
            month={month}
            onMonthChange={setMonth}
            selected={validValue}
            min={min}
            max={max}
            onSelect={commit}
          />

          <div className="ds-datepicker-footer">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!validValue}
              onClick={() => {
                if (value === undefined) {
                  setUncontrolledValue("");
                }
                onChange?.("");
              }}
            >
              Bersihkan
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={todayDisabled}
              onClick={() => commit(today)}
            >
              Hari ini
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export interface DateRangePickerProps {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  min?: ISODate;
  max?: ISODate;
  id?: string;
  className?: string;
  align?: "start" | "center" | "end";
  ariaLabel?: string;
}

export function DateRangePicker({
  value,
  defaultValue = null,
  onChange,
  placeholder = "Pilih rentang tanggal",
  disabled = false,
  invalid = false,
  clearable = true,
  min,
  max,
  id,
  className,
  align = "start",
  ariaLabel = "Pilih rentang tanggal",
}: DateRangePickerProps) {
  const [uncontrolledValue, setUncontrolledValue] =
    useState<DateRange | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const currentValue = value !== undefined ? value : uncontrolledValue;
  const [draft, setDraft] = useState<{
    start: ISODate | null;
    end: ISODate | null;
  }>({
    start: currentValue?.start ?? null,
    end: currentValue?.end ?? null,
  });
  const [hovered, setHovered] = useState<ISODate | null>(null);
  const [month, setMonth] = useState(
    startOfMonth(currentValue?.start ?? INITIAL_MONTH),
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraft({
        start: currentValue?.start ?? null,
        end: currentValue?.end ?? null,
      });
      setHovered(null);
      setMonth(startOfMonth(currentValue?.start ?? todayISO()));
    }
  }

  function handleSelect(date: ISODate) {
    if (!draft.start || draft.end) {
      setDraft({ start: date, end: null });
      setHovered(null);
      return;
    }

    if (compareISO(date, draft.start) < 0) {
      setDraft({ start: date, end: draft.start });
    } else {
      setDraft({ start: draft.start, end: date });
    }

    setHovered(null);
  }

  function apply() {
    if (!draft.start || !draft.end) {
      return;
    }

    const nextValue = { start: draft.start, end: draft.end };

    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }

    onChange?.(nextValue);
    setOpen(false);
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (value === undefined) {
      setUncontrolledValue(null);
    }

    onChange?.(null);
  }

  const canApply = Boolean(draft.start && draft.end);
  const isEmptyDraft = !draft.start && !draft.end;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DateTrigger
        prefix={<Icon path={mdiCalendarRange} size={17} />}
        label={currentValue ? formatDateRange(currentValue.start, currentValue.end) : ""}
        placeholder={placeholder}
        hasValue={Boolean(currentValue)}
        disabled={disabled}
        invalid={invalid}
        open={open}
        clearable={clearable}
        clearLabel="Hapus rentang tanggal"
        onClear={clear}
        id={id}
        className={className}
        ariaLabel={ariaLabel}
      />

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="ds-popover ds-datepicker-content ds-datepicker-range-content"
          data-ds-overlay=""
          align={align}
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const content = event.currentTarget as HTMLElement;
            const target = content.querySelector<HTMLElement>(
              ".ds-calendar-day[tabindex='0']",
            );
            (target ?? content.querySelector<HTMLElement>(".ds-calendar-day"))?.focus();
          }}
        >
          <div className="ds-datepicker-range-intro">
            <span>
              {draft.start && !draft.end
                ? "Pilih tanggal akhir"
                : draft.start && draft.end
                  ? "Rentang siap diterapkan"
                  : "Pilih tanggal mulai"}
            </span>
          </div>

          <Calendar
            month={month}
            onMonthChange={setMonth}
            range={draft}
            hovered={hovered}
            onHover={(date) => {
              if (draft.start && !draft.end) {
                setHovered(date);
              }
            }}
            min={min}
            max={max}
            onSelect={handleSelect}
          />

          <div className="ds-range-summary">
            <div>
              <span>Mulai</span>
              <strong>
                {draft.start ? formatDateShort(draft.start) : "Belum dipilih"}
              </strong>
            </div>
            <div>
              <span>Akhir</span>
              <strong>
                {draft.end ? formatDateShort(draft.end) : "Belum dipilih"}
              </strong>
            </div>
          </div>

          <div className="ds-datepicker-footer ds-datepicker-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isEmptyDraft}
              onClick={() => {
                setDraft({ start: null, end: null });
                setHovered(null);

                if (value === undefined) {
                  setUncontrolledValue(null);
                }

                onChange?.(null);
                setOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canApply}
              onClick={apply}
            >
              Terapkan
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

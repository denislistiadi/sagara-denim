"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { mdiCheck, mdiChevronDown, mdiClose } from "@mdi/js";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icon";
import { ControlShell } from "@/components/ui/control-shell";
import { SearchInput } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  prefix?: ReactNode;
  id?: string;
  name?: string;
  className?: string;
  align?: "start" | "center" | "end";
  ariaLabel?: string;
}

export function Combobox({
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ada hasil.",
  disabled = false,
  invalid = false,
  clearable = true,
  prefix,
  id,
  name,
  className,
  align = "start",
  ariaLabel,
}: ComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const currentValue =
    value !== undefined ? value : uncontrolledValue;
  const selectedOption = options.find(
    (option) => option.value === currentValue,
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filteredOptions.length]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      const selectedIndex = options.findIndex(
        (option) => option.value === currentValue,
      );
      setQuery("");
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) {
      return;
    }

    if (value === undefined) {
      setUncontrolledValue(option.value);
    }

    onValueChange?.(option.value);
    setOpen(false);
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (disabled) {
      return;
    }

    if (value === undefined) {
      setUncontrolledValue("");
    }

    onValueChange?.("");
  }

  function moveActive(direction: 1 | -1) {
    if (filteredOptions.length === 0) {
      return;
    }

    let nextIndex = activeIndex;

    for (let step = 0; step < filteredOptions.length; step += 1) {
      nextIndex =
        (nextIndex + direction + filteredOptions.length) %
        filteredOptions.length;

      if (!filteredOptions[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        commit(option);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <ControlShell
        className={cn("ds-combobox", className)}
        prefix={prefix}
        suffix={
          clearable && selectedOption ? (
            <button
              type="button"
              className="ds-control-clear"
              onClick={clear}
              disabled={disabled}
              aria-label="Hapus pilihan"
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
            className="ds-combobox-trigger"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? listboxId : undefined}
            disabled={disabled}
          >
            <span
              className={cn(
                "ds-control-value",
                !selectedOption && "ds-control-placeholder",
              )}
            >
              {selectedOption?.label ?? placeholder}
            </span>
            <Icon
              path={mdiChevronDown}
              size={18}
              className="ds-combobox-chevron"
            />
          </button>
        </PopoverPrimitive.Trigger>
      </ControlShell>

      {name ? <input type="hidden" name={name} value={currentValue} /> : null}

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="ds-popover ds-combobox-content"
          data-ds-overlay=""
          align={align}
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label="Cari pilihan"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              filteredOptions[activeIndex]
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            wrapperClassName="ds-combobox-search"
          />

          <div
            ref={listRef}
            id={listboxId}
            className="ds-combobox-list"
            role="listbox"
            aria-label={ariaLabel ?? "Daftar pilihan"}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === currentValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    id={`${listboxId}-option-${index}`}
                    data-option-index={index}
                    className={cn(
                      "ds-combobox-option",
                      index === activeIndex && "ds-combobox-option-active",
                      isSelected && "ds-combobox-option-selected",
                    )}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    disabled={option.disabled}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(option)}
                  >
                    <span className="ds-combobox-option-copy">
                      <span className="ds-combobox-option-label">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="ds-combobox-option-description">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Icon
                        path={mdiCheck}
                        size={16}
                        className="ds-combobox-option-check"
                      />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="ds-combobox-empty">{emptyMessage}</div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

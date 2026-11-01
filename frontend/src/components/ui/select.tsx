"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { mdiCheck, mdiChevronDown } from "@mdi/js";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps
  extends Omit<
    ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    "prefix" | "suffix"
  > {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, invalid = false, prefix, suffix, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn("ds-control ds-select-trigger", className)}
    aria-invalid={invalid || undefined}
    data-invalid={invalid || undefined}
    {...props}
  >
    {prefix ? <span className="ds-control-prefix">{prefix}</span> : null}
    <span className="ds-control-value ds-select-value">{children}</span>
    {suffix ? <span className="ds-control-suffix">{suffix}</span> : null}
    <SelectPrimitive.Icon asChild>
      <Icon path={mdiChevronDown} size={18} className="ds-select-chevron" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, sideOffset = 6, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      sideOffset={sideOffset}
      className={cn("ds-select-content", className)}
      data-ds-overlay=""
      {...props}
    >
      <SelectPrimitive.Viewport className="ds-select-viewport">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

SelectContent.displayName = "SelectContent";

export const SelectLabel = forwardRef<
  ElementRef<typeof SelectPrimitive.Label>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("ds-select-label", className)}
    {...props}
  />
));

SelectLabel.displayName = "SelectLabel";

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn("ds-select-item", className)}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ds-select-indicator">
      <Icon path={mdiCheck} size={16} />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

SelectItem.displayName = "SelectItem";

export const SelectSeparator = forwardRef<
  ElementRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("ds-select-separator", className)}
    {...props}
  />
));

SelectSeparator.displayName = "SelectSeparator";

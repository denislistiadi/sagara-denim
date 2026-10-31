"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { mdiCheck } from "@mdi/js";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn("ds-checkbox", className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="ds-checkbox-indicator">
      <Icon path={mdiCheck} size={14} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = "Checkbox";

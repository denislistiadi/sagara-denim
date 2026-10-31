"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn("ds-switch", className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className="ds-switch-thumb" />
  </SwitchPrimitive.Root>
));

Switch.displayName = "Switch";

"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { mdiClose } from "@mdi/js";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="ds-dialog-overlay" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn("ds-dialog-content", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="ds-dialog-close" aria-label="Tutup dialog">
        <Icon path={mdiClose} size={18} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

DialogContent.displayName = "DialogContent";

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("ds-dialog-title", className)}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("ds-dialog-description", className)}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ds-dialog-header", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ds-dialog-footer", className)} {...props} />;
}

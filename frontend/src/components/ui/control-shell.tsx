import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ControlShellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "prefix" | "suffix"> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  prefixClassName?: string;
  suffixClassName?: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ControlShell({
  prefix,
  suffix,
  prefixClassName,
  suffixClassName,
  invalid = false,
  disabled = false,
  readOnly = false,
  className,
  children,
  ...props
}: ControlShellProps) {
  return (
    <div
      className={cn("ds-control", className)}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      {...props}
    >
      {prefix ? (
        <span className={cn("ds-control-prefix", prefixClassName)}>{prefix}</span>
      ) : null}
      {children}
      {suffix ? (
        <span className={cn("ds-control-suffix", suffixClassName)}>{suffix}</span>
      ) : null}
    </div>
  );
}

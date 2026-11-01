import { mdiMagnify } from "@mdi/js";
import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/icon";
import { ControlShell } from "@/components/ui/control-shell";
import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      prefix,
      suffix,
      invalid = false,
      disabled,
      ...props
    },
    ref,
  ) => (
    <ControlShell
      className={cn("ds-input-shell", wrapperClassName)}
      prefix={prefix}
      suffix={suffix}
      invalid={invalid}
      disabled={disabled}
    >
      <input
        ref={ref}
        className={cn("ds-input ds-control-input", className)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
    </ControlShell>
  ),
);

Input.displayName = "Input";

export interface SearchInputProps extends InputProps {
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      wrapperClassName,
      prefix,
      suffix,
      invalid = false,
      disabled,
      ...props
    },
    ref,
  ) => (
    <ControlShell
      className={cn("ds-search", wrapperClassName)}
      prefix={
        prefix ?? <Icon path={mdiMagnify} size={19} aria-hidden="true" />
      }
      suffix={suffix}
      invalid={invalid}
      disabled={disabled}
    >
      <input
        ref={ref}
        type="search"
        className={cn("ds-input ds-control-input ds-search-input", className)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
    </ControlShell>
  ),
);

SearchInput.displayName = "SearchInput";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("ds-textarea", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export interface FieldRenderProps {
  describedBy?: string;
  invalid: boolean;
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode | ((props: FieldRenderProps) => ReactNode);
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
  ...props
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const content =
    typeof children === "function"
      ? children({ describedBy, invalid: Boolean(error) })
      : children;

  return (
    <div className={cn("dialog-field", className)} {...props}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ds-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {content}
      {error ? (
        <span id={errorId} className="ds-field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("ds-label", className)}>
      {children}
    </label>
  );
}

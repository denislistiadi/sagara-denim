import { mdiChevronDown, mdiMagnify } from "@mdi/js";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("ds-input", className)} {...props} />
  ),
);

Input.displayName = "Input";

interface SearchInputProps extends InputProps {
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn("ds-search", wrapperClassName)}>
      <Icon path={mdiMagnify} size={19} className="ds-search-icon" />
      <input
        ref={ref}
        type="search"
        className={cn("ds-input ds-search-input", className)}
        {...props}
      />
    </div>
  ),
);

SearchInput.displayName = "SearchInput";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn("ds-select-wrap", wrapperClassName)}>
      <select ref={ref} className={cn("ds-select", className)} {...props}>
        {children}
      </select>
      <Icon path={mdiChevronDown} size={18} className="ds-select-icon" />
    </div>
  ),
);

Select.displayName = "Select";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("ds-textarea", className)} {...props} />
  ),
);

Textarea.displayName = "Textarea";

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

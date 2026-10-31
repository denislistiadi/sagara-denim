import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva("ds-btn", {
  variants: {
    variant: {
      primary: "ds-btn-primary",
      secondary: "ds-btn-secondary",
      ghost: "ds-btn-ghost",
      danger: "ds-btn-danger",
    },
    size: {
      sm: "ds-btn-sm",
      md: "",
      lg: "ds-btn-lg",
      icon: "ds-btn-icon",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <span className="ds-spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };

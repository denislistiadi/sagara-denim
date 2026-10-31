import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ds-card", className)} {...props} />;
}

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  contentClassName?: string;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
  ...props
}: SectionCardProps) {
  return (
    <section className={cn("section-card", className)} {...props}>
      {(title || subtitle || action) && (
        <div className="section-card-header">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="section-card-action">{action}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

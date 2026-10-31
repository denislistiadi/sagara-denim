import { mdiInboxOutline } from "@mdi/js";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = mdiInboxOutline,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("ds-empty-state", className)}>
      <span className="ds-empty-icon">
        <Icon path={icon} size={26} />
      </span>
      <h3 className="ds-empty-title">{title}</h3>
      <p className="ds-empty-description">{description}</p>
      {action && <div className="ds-empty-action">{action}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ORDER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { OrderStatus, Priority } from "@/types";

export type BadgeTone =
  | "neutral"
  | "orange"
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "red";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span className={cn("ds-badge", `ds-badge-${tone}`, className)}>
      {dot && <span className="ds-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  menunggu: "neutral",
  cutting: "blue",
  jahit: "orange",
  finishing: "purple",
  qc: "amber",
  selesai: "green",
  dibatalkan: "red",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  tinggi: "red",
  normal: "blue",
  rendah: "neutral",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

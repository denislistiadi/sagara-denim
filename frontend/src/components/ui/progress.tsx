import { cn } from "@/lib/cn";

interface ProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "orange" | "green" | "blue" | "purple" | "amber" | "red";
  label?: string;
}

export function Progress({
  value,
  className,
  barClassName,
  tone = "orange",
  label,
}: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("ds-progress", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      aria-label={label}
    >
      <div
        className={cn("ds-progress-bar", `ds-progress-${tone}`, barClassName)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

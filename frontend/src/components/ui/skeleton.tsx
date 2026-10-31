import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ds-skeleton", className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="ds-table-skeleton" aria-label="Memuat data" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="ds-table-skeleton-row" key={index}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      className={cn("ds-pagination", className)}
      aria-label="Navigasi halaman"
    >
      <button
        type="button"
        className="ds-pagination-btn"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
      >
        <Icon path={mdiChevronLeft} size={17} />
      </button>

      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            "ds-pagination-btn",
            item === page && "ds-pagination-btn-active",
          )}
          onClick={() => onPageChange(item)}
          aria-current={item === page ? "page" : undefined}
        >
          {item}
        </button>
      ))}

      <button
        type="button"
        className="ds-pagination-btn"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
      >
        <Icon path={mdiChevronRight} size={17} />
      </button>
    </nav>
  );
}

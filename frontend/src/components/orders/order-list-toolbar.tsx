"use client";

import type { OrderStatus, Priority } from "@/types";
import { SearchInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORDER_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/labels";

export const ALL = "semua";

export type StatusFilter = OrderStatus | typeof ALL;
export type PriorityFilter = Priority | typeof ALL;

interface OrderListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
}

/** Kotak pencarian dan dua dropdown filter untuk daftar perintah produksi. */
export function OrderListToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
}: OrderListToolbarProps) {
  return (
    <div className="table-toolbar">
      <SearchInput
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Cari kode, model, pelanggan, atau catatan..."
        aria-label="Cari perintah produksi"
        wrapperClassName="table-search"
      />

      <div className="table-toolbar-actions">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as StatusFilter)
          }
        >
          <SelectTrigger className="table-filter" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={ALL}>Semua status</SelectItem>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(value) =>
            onPriorityFilterChange(value as PriorityFilter)
          }
        >
          <SelectTrigger className="table-filter" aria-label="Filter prioritas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={ALL}>Semua prioritas</SelectItem>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

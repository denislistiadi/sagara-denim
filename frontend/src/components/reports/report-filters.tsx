"use client";

import { formatDateRange } from "@/lib/date";
import { PRODUCTION_STAGE_OPTIONS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductionStage } from "@/types";

export type ReportStageFilter = ProductionStage | "all";

interface ReportFiltersProps {
  range: DateRange;
  stage: ReportStageFilter;
  onRangeChange: (range: DateRange) => void;
  onStageChange: (stage: ReportStageFilter) => void;
  onReset: () => void;
}

export function ReportFilters({
  range,
  stage,
  onRangeChange,
  onStageChange,
  onReset,
}: ReportFiltersProps) {
  return (
    <section className="report-filter-card" aria-label="Filter laporan">
      <div className="report-filter-grid">
        <div className="report-filter-field">
          <span className="report-filter-label">Periode</span>
          <DateRangePicker
            value={range}
            onChange={(next) => {
              if (next) {
                onRangeChange(next);
              }
            }}
            ariaLabel="Pilih periode laporan"
            clearable={false}
            className="report-filter-date"
          />
        </div>

        <div className="report-filter-field">
          <span className="report-filter-label">Tahap</span>
          <Select
            value={stage}
            onValueChange={(value) => {
              onStageChange(value as ReportStageFilter);
            }}
          >
            <SelectTrigger
              className="report-filter-select"
              aria-label="Filter tahap produksi"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Semua tahap</SelectItem>
              {PRODUCTION_STAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="report-filter-actions">
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Atur ulang
          </Button>
        </div>
      </div>

      <p className="report-filter-period">
        Periode aktif: <strong>{formatDateRange(range.start, range.end)}</strong>
      </p>
    </section>
  );
}

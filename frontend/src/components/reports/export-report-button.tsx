"use client";

import { mdiDownload } from "@mdi/js";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

interface ExportReportButtonProps {
  loading: boolean;
  disabled: boolean;
  onExport: () => void;
}

export function ExportReportButton({
  loading,
  disabled,
  onExport,
}: ExportReportButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onExport}
      loading={loading}
      disabled={disabled}
      aria-label="Export laporan produksi ke CSV"
    >
      {!loading && <Icon path={mdiDownload} size={18} />}
      {loading ? "Menyiapkan…" : "Export CSV"}
    </Button>
  );
}

import { mdiAlertOutline, mdiArrowRight } from "@mdi/js";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

interface LowStockBannerProps {
  count: number;
  onShowLowStock: () => void;
}

export function LowStockBanner({ count, onShowLowStock }: LowStockBannerProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <section className="low-stock-banner" role="status">
      <span className="low-stock-banner-icon" aria-hidden="true">
        <Icon path={mdiAlertOutline} size={22} />
      </span>
      <div className="low-stock-banner-copy">
        <strong>{count} bahan perlu restock</strong>
        <p>
          Ada bahan habis atau saldonya sudah menyentuh batas minimum. Periksa
          daftar restock agar produksi tidak terhenti.
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="low-stock-banner-action"
        onClick={onShowLowStock}
      >
        Tampilkan yang perlu restock
        <Icon path={mdiArrowRight} size={16} />
      </Button>
    </section>
  );
}

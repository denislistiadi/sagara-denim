import { mdiWaves } from "@mdi/js";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <span className={cn("brand-mark", className)}>
      <span className="brand-logo-box" aria-hidden="true">
        <Icon path={mdiWaves} size={19} />
      </span>
      {!compact && (
        <span className="brand-text">
          <span className="brand-title">
            SAGARA <span className="brand-title-accent">DENIM</span>
          </span>
          <span className="brand-subtitle">Produksi Celana Jeans</span>
        </span>
      )}
    </span>
  );
}

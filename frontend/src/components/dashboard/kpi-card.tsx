import { mdiTrendingDown, mdiTrendingUp } from "@mdi/js";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";
import type { KpiItem } from "@/types";

export function KpiCard({ item }: { item: KpiItem }) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{item.label}</span>
        <span className={cn("kpi-icon-box", `kpi-icon-${item.tone}`)}>
          <Icon path={item.icon} size={18} />
        </span>
      </div>

      <div className="kpi-value">
        {item.value}
        {item.unit && (
          <span
            className={cn(
              "kpi-unit",
              item.unit === "%" && "kpi-unit-tight",
            )}
          >
            {item.unit}
          </span>
        )}
      </div>

      <div className="kpi-footer">
        <span className="kpi-subtext">{item.subtext}</span>
        {item.trend && (
          <span className="kpi-trend">
            <Icon
              path={
                item.trendDirection === "down"
                  ? mdiTrendingDown
                  : mdiTrendingUp
              }
              size={14}
            />
            {item.trend}
          </span>
        )}
      </div>
    </article>
  );
}

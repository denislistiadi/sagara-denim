import { mdiArrowRight } from "@mdi/js";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/icon";
import type { StockItem } from "@/types";

const STOCK_TONE: Record<StockItem["status"], BadgeTone> = {
  Habis: "red",
  Kritis: "red",
  Menipis: "amber",
  Aman: "green",
};

const STOCK_PROGRESS_TONE = {
  Habis: "red",
  Kritis: "red",
  Menipis: "amber",
  Aman: "green",
} as const;

export function StockCard({ items }: { items: readonly StockItem[] }) {
  return (
    <SectionCard
      className="dashboard-panel"
      title="Stok Kritis"
      subtitle="Bahan di bawah batas aman"
      action={
        <Link href="/bahan" className="section-link">
          Lihat stok
          <Icon path={mdiArrowRight} size={15} />
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="dashboard-panel-empty">
          Semua bahan aktif berada pada stok aman.
        </p>
      ) : (
        <div className="stock-list">
          {items.map((item) => (
            <div className="stock-item" key={item.name}>
              <div className="stock-head">
                <div>
                  <span className="stock-name">{item.name}</span>
                  <span className="stock-detail">{item.detail}</span>
                </div>
                <div className="stock-value">
                  <strong>{item.stock}</strong>
                  <Badge tone={STOCK_TONE[item.status]}>{item.status}</Badge>
                </div>
              </div>
              <Progress
                value={item.percent}
                tone={STOCK_PROGRESS_TONE[item.status]}
                label={`${item.name}: ${item.stock}`}
                className="stock-progress"
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

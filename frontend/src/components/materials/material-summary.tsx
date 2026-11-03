import {
  mdiAlertCircleOutline,
  mdiLayersOutline,
  mdiTagMultipleOutline,
  mdiTrendingDown,
} from "@mdi/js";
import { Icon } from "@/components/icon";
import type { MaterialInventorySummary } from "@/types";

interface MaterialSummaryCardsProps {
  summary: MaterialInventorySummary;
}

export function MaterialSummaryCards({ summary }: MaterialSummaryCardsProps) {
  const cards = [
    {
      label: "Bahan Aktif",
      value: summary.total_active,
      hint: "Terdaftar dan dapat dimutasi",
      icon: mdiLayersOutline,
      tone: "blue",
      unit: "bahan",
    },
    {
      label: "Stok Habis",
      value: summary.out_of_stock,
      hint: "Saldo nol, perlu restock",
      icon: mdiAlertCircleOutline,
      tone: "red",
      unit: "bahan",
    },
    {
      label: "Di Bawah Minimum",
      value: summary.below_minimum,
      hint: "Kritis atau menipis",
      icon: mdiTrendingDown,
      tone: "amber",
      unit: "bahan",
    },
    {
      label: "Kategori",
      value: summary.categories.length,
      hint: "Kain, benang, aksesoris, dan lainnya",
      icon: mdiTagMultipleOutline,
      tone: "purple",
      unit: "kategori",
    },
  ] as const;

  return (
    <div className="materials-summary-grid">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`material-summary-card material-summary-${card.tone}`}
        >
          <span className="material-summary-icon" aria-hidden="true">
            <Icon path={card.icon} size={20} />
          </span>
          <div className="material-summary-copy">
            <span className="material-summary-label">{card.label}</span>
            <strong className="material-summary-value">
              {card.value}
              <span className="material-summary-unit">{card.unit}</span>
            </strong>
            <span className="material-summary-hint">{card.hint}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

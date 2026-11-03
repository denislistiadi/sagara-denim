"use client";

import {
  mdiArrowDown,
  mdiArrowUp,
  mdiScaleBalance,
} from "@mdi/js";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { STOCK_STATUS_LABELS } from "@/lib/labels";
import {
  canAdjustStock,
  canRecordStock,
  stockProgress,
  stockStatusTone,
} from "@/lib/materials";
import type {
  MaterialDetail,
  StockMovementType,
  UserRole,
} from "@/types";

interface StockHeroProps {
  material: MaterialDetail;
  role?: UserRole;
  onOpenMovement: (type: StockMovementType) => void;
}

export function StockHero({ material, role, onOpenMovement }: StockHeroProps) {
  const canRecord = canRecordStock(role) && material.is_active;
  const canAdjust = canAdjustStock(role) && material.is_active;

  return (
    <section className="stock-hero">
      <div className="stock-hero-main">
        <span className="stock-hero-eyebrow">Saldo stok saat ini</span>
        <div className="stock-hero-value">
          {formatQuantity(material.stock_qty)}
          <span>{material.unit}</span>
        </div>
        <div className="stock-hero-badges">
          <Badge tone={stockStatusTone(material.status)} dot>
            {STOCK_STATUS_LABELS[material.status]}
          </Badge>
          <Badge tone={material.is_active ? "green" : "neutral"}>
            {material.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>

        <dl className="stock-hero-meta">
          <div>
            <dt>Minimum stok</dt>
            <dd>
              {formatQuantity(material.minimum_stock)} {material.unit}
            </dd>
          </div>
          <div>
            <dt>Mutasi tercatat</dt>
            <dd>{material.movement_count} mutasi</dd>
          </div>
          <div>
            <dt>Terakhir diperbarui</dt>
            <dd>{formatDateTime(material.updated_at)}</dd>
          </div>
        </dl>

        <div className="stock-hero-progress">
          <Progress
            value={stockProgress(material)}
            tone={stockStatusTone(material.status)}
            label={`Stok ${material.name} terhadap minimum`}
          />
          <span>{stockProgress(material)}% dari minimum</span>
        </div>
      </div>

      <div className="stock-hero-actions">
        {canRecord && (
          <>
            <Button
              type="button"
              onClick={() => onOpenMovement("masuk")}
            >
              <Icon path={mdiArrowDown} size={17} />
              Stok Masuk
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenMovement("keluar")}
            >
              <Icon path={mdiArrowUp} size={17} />
              Stok Keluar
            </Button>
          </>
        )}
        {canAdjust && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenMovement("penyesuaian")}
          >
            <Icon path={mdiScaleBalance} size={17} />
            Penyesuaian
          </Button>
        )}
      </div>
    </section>
  );
}

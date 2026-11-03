"use client";

import {
  mdiDotsHorizontal,
  mdiEyeOutline,
  mdiPencilOutline,
  mdiPlusCircleOutline,
  mdiPowerPlugOutline,
  mdiPowerPlugOffOutline,
} from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { STOCK_STATUS_LABELS } from "@/lib/labels";
import {
  canManageMaterials,
  canRecordStock,
  stockStatusTone,
} from "@/lib/materials";
import type { MaterialSummary, UserRole } from "@/types";

interface MaterialTableProps {
  materials: MaterialSummary[];
  role?: UserRole;
  onEdit: (material: MaterialSummary) => void;
  onToggleActive: (material: MaterialSummary) => void;
}

function MaterialStatusBadge({ material }: { material: MaterialSummary }) {
  return (
    <div className="material-status-stack">
      <Badge tone={stockStatusTone(material.status)} dot>
        {STOCK_STATUS_LABELS[material.status]}
      </Badge>
      {!material.is_active && <Badge tone="neutral">Nonaktif</Badge>}
    </div>
  );
}

export function MaterialTable({
  materials,
  role,
  onEdit,
  onToggleActive,
}: MaterialTableProps) {
  const manage = canManageMaterials(role);
  const record = canRecordStock(role);

  return (
    <div className="table-scroll">
      <table className="ds-table material-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nama &amp; Kategori</th>
            <th>Stok</th>
            <th>Minimum</th>
            <th>Status</th>
            <th>Diperbarui</th>
            <th scope="col" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id}>
              <td>
                <span className="code-badge">{material.sku}</span>
              </td>
              <td>
                <Link
                  href={`/bahan/${material.id}`}
                  className="table-primary table-primary-link"
                >
                  {material.name}
                </Link>
                <div className="table-secondary">{material.category}</div>
              </td>
              <td>
                <span className="table-number material-stock-value">
                  {formatQuantity(material.stock_qty)}
                </span>{" "}
                <span className="table-unit">{material.unit}</span>
              </td>
              <td>
                <span className="table-number">
                  {formatQuantity(material.minimum_stock)}
                </span>{" "}
                <span className="table-unit">{material.unit}</span>
              </td>
              <td>
                <MaterialStatusBadge material={material} />
              </td>
              <td>
                <span className="table-date">
                  {formatDateTime(material.updated_at)}
                </span>
              </td>
              <td>
                {role === "qc" ? (
                  <Link
                    href={`/bahan/${material.id}`}
                    className="table-detail-link"
                  >
                    Lihat detail
                  </Link>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Aksi untuk ${material.sku}`}
                      >
                        <Icon path={mdiDotsHorizontal} size={19} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/bahan/${material.id}`}
                          className="ds-dropdown-item"
                        >
                          <Icon path={mdiEyeOutline} size={17} />
                          Lihat detail
                        </Link>
                      </DropdownMenuItem>

                      {manage && (
                        <DropdownMenuItem onSelect={() => onEdit(material)}>
                          <Icon path={mdiPencilOutline} size={17} />
                          Ubah bahan
                        </DropdownMenuItem>
                      )}

                      {record && material.is_active && (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/bahan/${material.id}?aksi=stok`}
                            className="ds-dropdown-item"
                          >
                            <Icon path={mdiPlusCircleOutline} size={17} />
                            Catat stok
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {manage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            danger={material.is_active}
                            onSelect={() => onToggleActive(material)}
                          >
                            <Icon
                              path={
                                material.is_active
                                  ? mdiPowerPlugOffOutline
                                  : mdiPowerPlugOutline
                              }
                              size={17}
                            />
                            {material.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

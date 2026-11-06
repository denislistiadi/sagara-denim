"use client";

import {
  mdiDotsHorizontal,
  mdiPencilOutline,
  mdiPowerPlugOffOutline,
  mdiPowerPlugOutline,
} from "@mdi/js";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import type { ProductRecord } from "@/types";

interface ProductTableProps {
  products: ProductRecord[];
  canManage: boolean;
  onEdit: (product: ProductRecord) => void;
  onToggleActive: (product: ProductRecord) => void;
}

function variantLabel(product: ProductRecord): string {
  const parts = [product.size && `Ukuran ${product.size}`, product.color].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" · ") : "Tanpa varian";
}

export function ProductTable({
  products,
  canManage,
  onEdit,
  onToggleActive,
}: ProductTableProps) {
  return (
    <div className="table-scroll">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama &amp; Varian</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Diperbarui</th>
            {canManage && <th scope="col" aria-label="Aksi" />}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <span className="code-badge">{product.code}</span>
              </td>
              <td>
                <span className="table-primary">{product.name}</span>
                <div className="table-secondary">{variantLabel(product)}</div>
              </td>
              <td>
                <span
                  className="table-secondary"
                  title={product.description ?? ""}
                >
                  {product.description || "—"}
                </span>
              </td>
              <td>
                <Badge tone={product.is_active ? "green" : "neutral"} dot>
                  {product.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </td>
              <td>
                <span className="table-date">
                  {formatDateTime(product.updated_at)}
                </span>
              </td>
              {canManage && (
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Aksi untuk ${product.code}`}
                      >
                        <Icon path={mdiDotsHorizontal} size={19} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(product)}>
                        <Icon path={mdiPencilOutline} size={17} />
                        Ubah produk
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        danger={product.is_active}
                        onSelect={() => onToggleActive(product)}
                      >
                        <Icon
                          path={
                            product.is_active
                              ? mdiPowerPlugOffOutline
                              : mdiPowerPlugOutline
                          }
                          size={17}
                        />
                        {product.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

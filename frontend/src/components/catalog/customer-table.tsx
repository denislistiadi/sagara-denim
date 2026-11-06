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
import type { CustomerRecord } from "@/types";

interface CustomerTableProps {
  customers: CustomerRecord[];
  canManage: boolean;
  onEdit: (customer: CustomerRecord) => void;
  onToggleActive: (customer: CustomerRecord) => void;
}

export function CustomerTable({
  customers,
  canManage,
  onEdit,
  onToggleActive,
}: CustomerTableProps) {
  return (
    <div className="table-scroll">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama &amp; Kontak</th>
            <th>Email</th>
            <th>Alamat</th>
            <th>Status</th>
            <th>Diperbarui</th>
            {canManage && <th scope="col" aria-label="Aksi" />}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <span className="code-badge">{customer.code}</span>
              </td>
              <td>
                <span className="table-primary">{customer.name}</span>
                <div className="table-secondary">
                  {customer.phone || "Telepon belum diisi"}
                </div>
              </td>
              <td>
                <span className="table-secondary">
                  {customer.email || "—"}
                </span>
              </td>
              <td>
                <span className="table-secondary" title={customer.address ?? ""}>
                  {customer.address || "—"}
                </span>
              </td>
              <td>
                <Badge tone={customer.is_active ? "green" : "neutral"} dot>
                  {customer.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </td>
              <td>
                <span className="table-date">
                  {formatDateTime(customer.updated_at)}
                </span>
              </td>
              {canManage && (
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Aksi untuk ${customer.code}`}
                      >
                        <Icon path={mdiDotsHorizontal} size={19} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(customer)}>
                        <Icon path={mdiPencilOutline} size={17} />
                        Ubah pelanggan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        danger={customer.is_active}
                        onSelect={() => onToggleActive(customer)}
                      >
                        <Icon
                          path={
                            customer.is_active
                              ? mdiPowerPlugOffOutline
                              : mdiPowerPlugOutline
                          }
                          size={17}
                        />
                        {customer.is_active ? "Nonaktifkan" : "Aktifkan"}
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

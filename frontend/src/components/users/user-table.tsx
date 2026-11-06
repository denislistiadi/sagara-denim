"use client";

import {
  mdiDotsHorizontal,
  mdiLockReset,
  mdiPencilOutline,
  mdiPowerPlugOffOutline,
  mdiPowerPlugOutline,
} from "@mdi/js";
import { Icon } from "@/components/icon";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import { USER_ROLE_LABELS } from "@/lib/labels";
import type { UserRecord, UserRole } from "@/types";

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  admin: "orange",
  operator: "blue",
  qc: "purple",
};

interface UserTableProps {
  users: UserRecord[];
  currentUserId?: string;
  onEdit: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onToggleActive: (user: UserRecord) => void;
}

export function UserTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleActive,
}: UserTableProps) {
  return (
    <div className="table-scroll">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Nama &amp; Email</th>
            <th>Peran</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th scope="col" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;

            return (
              <tr key={user.id}>
                <td>
                  <span className="table-primary">{user.name}</span>
                  <div className="table-secondary">{user.email}</div>
                </td>
                <td>
                  <Badge tone={ROLE_TONE[user.role]}>
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
                </td>
                <td>
                  <div className="table-inline-badges">
                    <Badge tone={user.is_active ? "green" : "neutral"} dot>
                      {user.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    {isSelf && <Badge tone="neutral">Akun Anda</Badge>}
                  </div>
                </td>
                <td>
                  <span className="table-date">
                    {formatDateTime(user.created_at)}
                  </span>
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Aksi untuk ${user.name}`}
                      >
                        <Icon path={mdiDotsHorizontal} size={19} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(user)}>
                        <Icon path={mdiPencilOutline} size={17} />
                        Ubah pengguna
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onResetPassword(user)}>
                        <Icon path={mdiLockReset} size={17} />
                        Reset kata sandi
                      </DropdownMenuItem>
                      {!isSelf && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            danger={user.is_active}
                            onSelect={() => onToggleActive(user)}
                          >
                            <Icon
                              path={
                                user.is_active
                                  ? mdiPowerPlugOffOutline
                                  : mdiPowerPlugOutline
                              }
                              size={17}
                            />
                            {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

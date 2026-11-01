"use client";

import { mdiChevronDown, mdiLogout } from "@mdi/js";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ROLE_LABELS } from "@/lib/labels";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const roleLabel = USER_ROLE_LABELS[user.role];

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    await logout();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="user-profile-btn"
          aria-label={`Menu profil ${user.name}`}
        >
          <Avatar name={user.name} size="sm" />
          <span className="user-info-text">
            <span className="user-name-text">{user.name}</span>
            <span className="user-role-text">{roleLabel}</span>
          </span>
          <Icon
            path={mdiChevronDown}
            size={17}
            className="user-menu-chevron"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="user-menu-content">
        <DropdownMenuLabel>
          <div className="user-menu-header">
            <Avatar name={user.name} size="md" />
            <div className="user-menu-identity">
              <div className="user-popup-name">{user.name}</div>
              <div className="user-popup-email">{user.email}</div>
              <span className="user-role-badge">{roleLabel}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          danger
          disabled={loggingOut}
          onSelect={() => {
            void handleLogout();
          }}
        >
          <Icon path={mdiLogout} size={18} />
          {loggingOut ? "Sedang keluar..." : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import {
  mdiAccountOutline,
  mdiChevronDown,
  mdiCogOutline,
  mdiLogout,
} from "@mdi/js";
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
import { useToast } from "@/components/ui/toast";

export function UserMenu() {
  const { toast } = useToast();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="user-profile-btn"
          aria-label="Menu profil Andi Pratama"
        >
          <Avatar name="Andi Pratama" size="sm" />
          <span className="user-info-text">
            <span className="user-name-text">Andi Pratama</span>
            <span className="user-role-text">Admin Produksi</span>
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
            <Avatar name="Andi Pratama" size="md" />
            <div className="user-menu-identity">
              <div className="user-popup-name">Andi Pratama</div>
              <div className="user-popup-email">andi@sagaradenim.id</div>
              <span className="user-role-badge">Admin Produksi</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() =>
            toast({
              title: "Profil belum aktif",
              description:
                "Halaman profil akan tersedia saat integrasi backend FastAPI.",
              variant: "info",
            })
          }
        >
          <Icon path={mdiAccountOutline} size={18} />
          Profil Saya
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() =>
            toast({
              title: "Pengaturan belum aktif",
              description:
                "Pengaturan akun akan tersedia pada tahap aplikasi penuh.",
              variant: "info",
            })
          }
        >
          <Icon path={mdiCogOutline} size={18} />
          Pengaturan
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          danger
          onSelect={() =>
            toast({
              title: "Mode demo",
              description:
                "Belum ada autentikasi. Logout akan aktif setelah backend FastAPI terpasang.",
              variant: "info",
            })
          }
        >
          <Icon path={mdiLogout} size={18} />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

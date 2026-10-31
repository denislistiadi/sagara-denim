"use client";

import { mdiClose, mdiMenu, mdiMenuOpen } from "@mdi/js";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { UserMenu } from "@/components/layout/user-menu";
import { getPageMeta } from "@/lib/navigation";
import { useMediaQuery } from "@/lib/use-media-query";

interface HeaderProps {
  expanded: boolean;
  mobileOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  expanded,
  mobileOpen,
  onToggleSidebar,
}: HeaderProps) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const isMobile = useMediaQuery("(max-width: 959px)");

  const toggleIcon = isMobile
    ? mobileOpen
      ? mdiClose
      : mdiMenu
    : expanded
      ? mdiMenuOpen
      : mdiMenu;

  const toggleLabel = isMobile
    ? mobileOpen
      ? "Tutup menu"
      : "Buka menu"
    : expanded
      ? "Kecilkan sidebar"
      : "Perluas sidebar";

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <Icon path={toggleIcon} size={19} />
        </button>

        <div className="header-breadcrumb">
          <span className="header-page-title">{meta.title}</span>
          <span className="header-slash" aria-hidden="true">
            /
          </span>
          <span className="header-subtitle">{meta.subtitle}</span>
        </div>
      </div>

      <div className="header-right">
        <UserMenu />
      </div>
    </header>
  );
}

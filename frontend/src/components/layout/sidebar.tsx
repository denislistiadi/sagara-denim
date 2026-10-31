"use client";

import { mdiClose } from "@mdi/js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { DOCS_NAV, MAIN_NAV, isNavActive } from "@/lib/navigation";
import { useMediaQuery } from "@/lib/use-media-query";
import type { NavItem } from "@/types";

interface SidebarProps {
  expanded: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  rail: boolean;
  onNavigate: () => void;
}

function SidebarLink({ item, active, rail, onNavigate }: SidebarLinkProps) {
  const link = (
    <Link
      href={item.href}
      className={cn("sidebar-nav-item", active && "is-active")}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon path={item.icon} size={20} className="sidebar-nav-icon" />
      <span className="sidebar-nav-label">{item.label}</span>
    </Link>
  );

  if (!rail) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ expanded, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 959px)");
  const showLabels = expanded || isMobile;
  const rail = !showLabels;
  const hiddenOnMobile = isMobile && !mobileOpen;

  return (
    <aside
      className="app-sidebar"
      data-expanded={showLabels ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      aria-label="Sidebar navigasi"
      aria-hidden={hiddenOnMobile || undefined}
      inert={hiddenOnMobile || undefined}
    >
      <div className="sidebar-inner">
        <div className="sidebar-brand-row">
          <Link
            href="/"
            className="sidebar-brand-link"
            aria-label="Sagara Denim, kembali ke dashboard"
            onClick={onClose}
          >
            <BrandMark compact={rail} />
          </Link>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <Icon path={mdiClose} size={18} />
          </button>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav" aria-label="Navigasi utama">
          {MAIN_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isNavActive(item.href, pathname)}
              rail={rail}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          {!rail && <div className="sidebar-section-label">Design System</div>}
          <nav className="sidebar-nav sidebar-nav-docs" aria-label="Design system">
            {DOCS_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isNavActive(item.href, pathname)}
                rail={rail}
                onNavigate={onClose}
              />
            ))}
          </nav>
          {!rail && (
            <div className="sidebar-version">
              <span className="sidebar-version-dot" />
              v1.0 · Design System
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

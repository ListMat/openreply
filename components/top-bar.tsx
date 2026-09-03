"use client";

/**
 * Top Bar
 *
 * Page title, mobile hamburger, and connection status.
 */

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

interface TopBarProps {
  onMenuClick: () => void;
  instagramUsername: string | null;
  instagramAccountCount: number;
}

export default function TopBar({
  onMenuClick,
  instagramUsername,
  instagramAccountCount,
}: TopBarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  const getPageTitle = (path: string): string => {
    if (path === "/dashboard") return t.nav.dashboard;
    if (path === "/overview") return t.nav.overview;
    if (path === "/inbox") return t.nav.inbox;
    if (path === "/campaigns" || path === "/automations") return t.nav.campaigns;
    if (path === "/campaigns/new" || path === "/automations/new") return t.builder.newTitle;
    if (path.startsWith("/campaigns/") || path.startsWith("/automations/")) return t.builder.editTitle;
    if (path === "/logs") return t.nav.logs;
    if (path === "/settings") return t.nav.settings;
    if (path === "/diagnostics") return t.nav.diagnostics;
    return t.nav.dashboard;
  };

  const title = getPageTitle(pathname);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 lg:px-8 border-b border-border bg-background"
      // Installed to the home screen the app starts at the very top of the
      // display, so without this the title sits under the clock and battery.
      // The inset is 0 in a browser tab and on desktop.
      style={{
        height: "calc(4rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 px-2.5 py-1.5 rounded border border-border text-sm text-muted hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          Menu
        </button>
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick language toggle */}
        <button
          onClick={() => setLocale(locale === "pt-BR" ? "en" : "pt-BR")}
          className="px-2 py-1 text-xs font-medium rounded border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
          title={t.topBar.language}
        >
          <span>{locale === "pt-BR" ? "🇧🇷 PT-BR" : "🇺🇸 EN"}</span>
        </button>

        {instagramAccountCount > 0 ? (
          <p className="shrink-0 truncate text-sm text-muted">
            {instagramAccountCount > 1
              ? `${instagramAccountCount} ${t.topBar.connectedAccounts}`
              : `@${instagramUsername}`}
          </p>
        ) : (
          <a
            href="/api/instagram/connect"
            className="shrink-0 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover"
          >
            <span className="sm:hidden">{t.topBar.connectInstagram}</span>
            <span className="hidden sm:inline">{t.topBar.connectInstagram}</span>
          </a>
        )}
      </div>
    </header>
  );
}

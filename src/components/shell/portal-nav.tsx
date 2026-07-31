"use client";

import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type PortalNavItem = {
  href: string;
  label: string;
  /** Lucide icon name, e.g. "LayoutDashboard" — kept as a string so the nav
   *  definition can live in a server component. */
  icon: string;
  badge?: number;
  exact?: boolean;
};

function resolveIcon(name: string): LucideIcon {
  const icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return icon ?? Icons.Circle;
}

export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();

  const isActive = (item: PortalNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <nav className="lg:w-60 lg:shrink-0">
      <ul className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const Icon = resolveIcon(item.icon);
          const active = isActive(item);

          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border border-primary/30 bg-primary/15 text-foreground"
                    : "border border-transparent text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="ml-auto hidden rounded-full bg-amber-500/25 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-200 lg:inline">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

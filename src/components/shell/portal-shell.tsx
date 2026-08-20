import { LogoLockup } from "@/components/shared/logo";
import { PortalNav, type PortalNavItem } from "@/components/shell/portal-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { EventStatusBadge } from "@/components/shared/status-badges";
import type { EventStatus } from "@prisma/client";

/**
 * Shared chrome for the three authenticated areas. Sidebar on desktop,
 * horizontal scroller on mobile — the nav lists differ, the frame does not.
 */
export function PortalShell({
  items,
  user,
  eventStatus,
  areaLabel,
  children,
}: {
  items: PortalNavItem[];
  user: {
    name: string;
    email: string;
    role: string;
    contestantId?: string | null;
    avatarUrl?: string | null;
  };
  eventStatus?: EventStatus;
  areaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-arena-glow opacity-70"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a09]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoLockup
              size={36}
              priority
              nameClassName="hidden text-sm sm:block sm:text-sm"
            />
            <span className="hidden h-5 w-px bg-white/15 sm:block" />
            <p className="truncate text-sm font-medium text-muted-foreground">
              {areaLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {eventStatus ? (
              <span className="hidden sm:block">
                <EventStatusBadge status={eventStatus} />
              </span>
            ) : null}
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8">
        <PortalNav items={items} />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { Home, LogOut, User } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/server/actions/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; role: string; contestantId?: string | null };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-strike text-xs font-bold text-white">
          {initials(user.name) || <User className="size-4" />}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight">
            {user.name}
          </span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            {user.contestantId ?? user.role.toLowerCase()}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-3 pb-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          {user.contestantId ? (
            <p className="mt-1 font-mono text-xs tracking-wider text-sky-300">
              {user.contestantId}
            </p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home />
            Public site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem className="text-rose-300 focus:bg-rose-500/15 focus:text-rose-200">
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

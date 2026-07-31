import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth-actions";

/**
 * Icon-only sign-out, for placing beside a dashboard link.
 *
 * A form posting a server action rather than a click handler, so it works
 * without JS and cannot be triggered by a cross-site GET.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
        <LogOut />
      </Button>
    </form>
  );
}

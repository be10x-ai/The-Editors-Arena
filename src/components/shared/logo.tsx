import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The crest.
 *
 * The artwork is a square plate lit on black, so it is composited two ways:
 *
 * - `tile` (default) frames it as a bevelled emblem — correct at nav scale,
 *   where the internal wordmark is too small to read anyway.
 * - `bare` drops the plate out with `mix-blend-screen`, letting the metal and
 *   its own glow float on the page. Only use this on a near-black surface;
 *   anywhere lighter the blend lifts the black instead of hiding it.
 */
export function LogoMark({
  size = 36,
  variant = "tile",
  className,
  priority = false,
}: {
  size?: number;
  variant?: "tile" | "bare";
  className?: string;
  priority?: boolean;
}) {
  const src = size <= 80 ? "/logo-mark.png" : "/logo.png";

  if (variant === "bare") {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority={priority}
        className={cn("crest-blend select-none", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl",
        "ring-white/12 bg-arena-ink ring-1 ring-inset",
        "shadow-[0_2px_10px_-2px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(240,178,19,0.22)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        aria-hidden
        width={size * 2}
        height={size * 2}
        priority={priority}
        /* The artwork carries its own padding; scale past the frame so the
           shield fills the tile instead of floating in it. */
        className="h-[125%] w-[125%] max-w-none select-none object-contain"
      />
    </span>
  );
}

/**
 * Crest + wordmark, linked home. Used in the landing nav, the footer and the
 * three portal shells so the lockup is identical everywhere.
 */
export function LogoLockup({
  href = "/",
  size = 36,
  showName = true,
  nameClassName,
  className,
  onClick,
  priority = false,
}: {
  href?: string;
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={BRAND.name}
    >
      <LogoMark
        variant="bare"
        size={size}
        priority={priority}
        className="shrink-0 transition duration-300 group-hover:brightness-125"
      />
      <span
        className={cn(
          "font-display text-[15px] font-bold tracking-tight sm:text-base",
          showName ? "" : "sr-only",
          nameClassName,
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}

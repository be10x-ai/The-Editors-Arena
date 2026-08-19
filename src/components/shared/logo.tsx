import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The EA monogram.
 *
 * The supplied artwork is lit on black; its alpha was rebuilt from luminance at
 * build time, so the glow falls away to transparent instead of carrying a black
 * plate. It therefore composites on any dark surface with no blend mode.
 *
 * - `tile` (default) frames it on a navy plate with a blue inner bevel.
 * - `bare` places it directly on the page — preferred, since the mark already
 *   carries its own glow.
 *
 * `size` always means rendered *height*. The mark is roughly 2:1, so width is
 * derived; treating `size` as a square box left it drawn at half scale inside
 * its own padding.
 */
const MARK_ASPECT = 2.017;
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
  const src = size <= 120 ? "/logo-mark.png" : "/logo.png";

  if (variant === "bare") {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden
        width={Math.round(size * MARK_ASPECT)}
        height={size}
        priority={priority}
        className={cn("w-auto select-none", className)}
        style={{ height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl",
        "bg-arena-ink ring-1 ring-inset ring-primary/25",
        "shadow-[0_2px_10px_-2px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(79,168,255,0.28)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        aria-hidden
        width={Math.round(size * MARK_ASPECT)}
        height={size}
        priority={priority}
        /* Fits to the tile's width, since the mark is wider than it is tall. */
        className="h-auto w-[86%] max-w-none select-none object-contain"
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

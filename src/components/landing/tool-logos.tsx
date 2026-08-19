import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The toolchain, drawn as SVG rather than shipped as bitmaps.
 *
 * Every icon here is vector, so the row is one HTTP request (the document) and
 * stays sharp at any size — a strip of ten PNG app icons would have been ten
 * more requests on the critical path for artwork that renders at 32px.
 *
 * Faithfulness note: the Adobe apps genuinely are a tinted rounded square with
 * a two-letter monogram, so those are accurate by construction. Resolve and
 * Final Cut are redrawn approximations of their real icons.
 *
 * Trademark note: these are third-party marks, reproduced to say "bring the
 * tool you already own". That is nominative use, but Adobe, Apple, Blackmagic
 * and Maxon each publish brand guidelines that restrict reproduction of their
 * icons. Worth a look from whoever owns brand risk before this runs as paid
 * media. Swapping in official artwork later means replacing `Glyph` only.
 */

type ToolId =
  | "premiere"
  | "aftereffects"
  | "photoshop"
  | "audition"
  | "resolve"
  | "finalcut";

export type Tool = {
  id: ToolId;
  label: string;
  tint: string;
  /** Real artwork under `public/tools`. When set, `Glyph` is not used. */
  src?: string;
};

/** The NLEs and finishing apps, drawn. Brand colours from each app's icon. */
export const EDITING_TOOLS: Tool[] = [
  { id: "premiere", label: "Premiere Pro", tint: "#9999ff" },
  { id: "aftereffects", label: "After Effects", tint: "#9999ff" },
  { id: "resolve", label: "DaVinci Resolve", tint: "#61b7e8", src: "/tools/resolve.png" },
  { id: "finalcut", label: "Final Cut Pro", tint: "#c9b6e4", src: "/tools/finalcut.png" },
  { id: "photoshop", label: "Photoshop", tint: "#31a8ff" },
  { id: "audition", label: "Audition", tint: "#00e4bb" },
];

/**
 * The generative side of the toolchain, shipped as real artwork under
 * `public/tools`. These are logos we hold files for, so there is nothing to
 * redraw — each is normalised to a square with a transparent ground, and the
 * two that are drawn in black on transparent (Sora, ElevenLabs) were lifted to
 * near-white so they are visible on the page plate.
 *
 * This row is not decoration: the rulebook allows AI tools from a named
 * whitelist, and this is that whitelist made visible.
 */
export type AiTool = { slug: string; label: string };

export const AI_TOOLS: AiTool[] = [
  { slug: "runway", label: "Runway" },
  { slug: "sora", label: "Sora" },
  { slug: "veo", label: "Veo" },
  { slug: "kling", label: "Kling" },
  { slug: "luma", label: "Luma" },
  { slug: "pika", label: "Pika" },
  { slug: "higgsfield", label: "Higgsfield" },
  { slug: "elevenlabs", label: "ElevenLabs" },
  { slug: "descript", label: "Descript" },
  { slug: "opusclip", label: "Opus Clip" },
];

/** Adobe's own scheme: near-black brand-tinted plate, accent rule, monogram. */
function AdobeTile({
  plate,
  accent,
  letters,
}: {
  plate: string;
  accent: string;
  letters: string;
}) {
  return (
    <>
      <rect x="1" y="1" width="46" height="46" rx="10" fill={plate} />
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="10"
        fill="none"
        stroke={accent}
        strokeWidth="2"
      />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fill={accent}
        fontSize="19"
        fontWeight="700"
        fontFamily="var(--font-display), system-ui, sans-serif"
      >
        {letters}
      </text>
    </>
  );
}

function Glyph({ id }: { id: ToolId }) {
  switch (id) {
    case "premiere":
      return <AdobeTile plate="#2a0634" accent="#9999ff" letters="Pr" />;
    case "aftereffects":
      return <AdobeTile plate="#00005b" accent="#9999ff" letters="Ae" />;
    case "photoshop":
      return <AdobeTile plate="#001e36" accent="#31a8ff" letters="Ps" />;
    case "audition":
      return <AdobeTile plate="#00303a" accent="#00e4bb" letters="Au" />;

    /* Resolve and Final Cut ship real artwork — see `src` on the tool. */
    case "resolve":
    case "finalcut":
      return null;
  }
}

export function ToolIcon({
  tool,
  className,
  size = 40,
}: {
  tool: Tool;
  className?: string;
  size?: number;
}) {
  if (tool.src) {
    return (
      <Image
        src={tool.src}
        alt={tool.label}
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-[22%] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={tool.label}
      className={cn("shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]", className)}
    >
      <Glyph id={tool.id} />
    </svg>
  );
}

/**
 * The editing toolchain, with names — a "bring your own tools" statement.
 * Every one of these is allowed in the arena.
 */
export function ToolStrip({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-7",
        className,
      )}
    >
      {EDITING_TOOLS.map((tool) => (
        <li key={tool.id} className="flex items-center gap-2">
          <ToolIcon tool={tool} size={34} />
          <span className="text-xs font-medium text-muted-foreground sm:text-[13px]">
            {tool.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The whitelisted generative tools, from real artwork. */
export function AiToolStrip({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-7",
        className,
      )}
    >
      {AI_TOOLS.map((tool) => (
        <li key={tool.slug} className="flex items-center gap-2">
          <Image
            src={`/tools/${tool.slug}.png`}
            alt={tool.label}
            width={34}
            height={34}
            /* Square logos with their own plate get the corner rounded so the
               row does not read as a mix of stickers and tiles. */
            className="size-[34px] shrink-0 rounded-lg object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
          />
          <span className="text-xs font-medium text-muted-foreground sm:text-[13px]">
            {tool.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

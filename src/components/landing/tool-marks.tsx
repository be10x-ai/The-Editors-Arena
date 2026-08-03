/**
 * The toolchain, drifting behind the arena.
 *
 * Monograms rather than real logos: two letters in a tinted tile is how these
 * apps mark themselves anyway, it needs no third-party artwork, and it keeps
 * the row honest at 40px where a fetched logo would turn to mush.
 *
 * Everything here is decoration — aria-hidden, no pointer events, absolutely
 * positioned so it can never move the headline. The caller places it inside the
 * backdrop stack so the vignette and floor fade land on these too; on its own it
 * reads as stickers pasted over the scene.
 */

type Mark = { short: string; label: string; tint: string };

const EDIT: Mark[] = [
  { short: "Pr", label: "Premiere Pro", tint: "#9a7cff" },
  { short: "Ae", label: "After Effects", tint: "#b39bff" },
  { short: "Ps", label: "Photoshop", tint: "#5ca8ff" },
  { short: "Dv", label: "DaVinci Resolve", tint: "#ff9a5c" },
  { short: "Fc", label: "Final Cut Pro", tint: "#c9d3e0" },
  { short: "Au", label: "Audition", tint: "#7ee0a8" },
  { short: "Cv", label: "Canva", tint: "#4fd1c5" },
];

const AI: Mark[] = [
  { short: "Cl", label: "Claude", tint: "#ff9a62" },
  { short: "Hf", label: "Higgsfield", tint: "#8ab4ff" },
  { short: "Rw", label: "Runway", tint: "#d7dee8" },
  { short: "So", label: "Sora", tint: "#a5b4c6" },
  { short: "11", label: "ElevenLabs", tint: "#c4b5fd" },
  { short: "Mj", label: "Midjourney", tint: "#9fb6d4" },
  { short: "Ds", label: "Descript", tint: "#6ee7b7" },
  { short: "Tz", label: "Topaz Labs", tint: "#f0b213" },
];

function Row({ marks, className }: { marks: Mark[]; className: string }) {
  // Rendered twice, back to back: the track translates by exactly half its
  // width, so the seam lands where the copy repeats and the loop is invisible.
  const doubled = [...marks, ...marks];

  return (
    <div className={className}>
      {doubled.map((mark, index) => (
        <span
          key={`${mark.short}-${index}`}
          title={mark.label}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] font-display text-sm font-bold backdrop-blur-[1px] sm:size-14 sm:rounded-2xl sm:text-base"
          style={{ color: mark.tint }}
        >
          {mark.short}
        </span>
      ))}
    </div>
  );
}

export function ToolMarks({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`tool-marks pointer-events-none ${className ?? ""}`}>
      <Row marks={EDIT} className="tool-marks-track tool-marks-left" />
      <Row marks={AI} className="tool-marks-track tool-marks-right" />
    </div>
  );
}

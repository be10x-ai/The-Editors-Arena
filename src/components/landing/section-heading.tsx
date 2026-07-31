import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  /**
   * Trailing word(s) struck in gold brush, the way ARENA sits under EDITOR'S
   * on the crest. Omit it and the heading is plain milled steel.
   */
  accent?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      <p className="label-eyebrow">{eyebrow}</p>
      <h2 className="mt-3">
        <span className="type-chrome block text-2xl leading-tight sm:text-[1.9rem] lg:text-[2.2rem]">
          {title}
        </span>
        {accent ? (
          <span className="type-arena mt-2 block pb-1 text-[2.1rem] leading-[1] sm:text-5xl lg:text-[3.4rem]">
            {accent}
          </span>
        ) : null}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

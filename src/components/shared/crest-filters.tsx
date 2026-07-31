/**
 * Zero-size SVG defs mounted once at the document root.
 *
 * `#brush-rough` chews the edges off the ARENA wordmark so it reads as a laid
 * brush stroke rather than clean vector type — the roughness the licensed Road
 * Rage face carries in its outlines. `#metal-grain` adds the fine pitting on
 * the EDITOR'S plate. Both are referenced from `globals.css` via `filter:url()`.
 */
export function CrestFilters() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <filter id="brush-rough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.35"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="metal-grain" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="3"
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="0.9"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

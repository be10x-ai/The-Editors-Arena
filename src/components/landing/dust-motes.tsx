"use client";

import * as React from "react";

/**
 * Dust drifting through the hero's light shaft.
 *
 * Canvas rather than CSS: the effect needs per-mote brightness driven by how
 * close each one sits to the beam, which a keyframe animation cannot express.
 *
 * Cheap by construction — one pre-rendered sprite blitted per mote (no
 * per-particle shadowBlur, which is what makes naive versions stutter), the
 * loop parked whenever the tab is hidden or the hero is scrolled out of view,
 * and nothing at all under prefers-reduced-motion beyond a single static frame.
 */

/** Light shaft axis in canvas-relative coords, matching the artwork's beam:
 *  down-left from the top-right corner. */
const BEAM_FROM = { x: 0.9, y: -0.1 };
const BEAM_TO = { x: 0.5, y: 1.05 };
/** Half-width of the beam's falloff, as a fraction of canvas width. */
const BEAM_SPREAD = 0.26;

type Mote = {
  x: number;
  y: number;
  /** Radius in CSS px. Larger motes read as nearer, so they also move faster. */
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  /** Phase and rate of the sideways wobble that reads as air movement. */
  phase: number;
  wobble: number;
};

/** Perpendicular distance from the beam axis, normalised by canvas width. */
function beamProximity(x: number, y: number, aspect: number): number {
  // Work in x-normalised space so the falloff is circular, not stretched.
  const ax = BEAM_FROM.x;
  const ay = BEAM_FROM.y / aspect;
  const bx = BEAM_TO.x;
  const by = BEAM_TO.y / aspect;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y / aspect - ay) * dy) / lenSq));
  const px = ax + t * dx;
  const py = ay + t * dy;
  const dist = Math.hypot(x - px, y / aspect - py);

  // Gaussian core, plus a wide dim halo so a few motes catch light off-beam.
  const core = Math.exp(-((dist / BEAM_SPREAD) ** 2));
  const halo = 0.16 * Math.exp(-((dist / (BEAM_SPREAD * 2.6)) ** 2));
  // Fade toward the very bottom, where the artwork's beam has died out.
  const depth = 1 - Math.max(0, (y - 0.72) / 0.28) * 0.75;
  return Math.max(0, (core + halo) * depth);
}

function makeSprite(): HTMLCanvasElement {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(255,245,214,1)");
    grad.addColorStop(0.25, "rgba(252,222,150,0.7)");
    grad.addColorStop(1, "rgba(240,178,19,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return c;
}

export function DustMotes({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprite = makeSprite();

    let motes: Mote[] = [];
    let w = 0;
    let h = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    let onScreen = true;

    const seed = (count: number) => {
      motes = Array.from({ length: count }, () => {
        const r = 0.5 + Math.random() ** 1.9 * 2.9;
        const depth = r / 3.4;
        return {
          x: Math.random(),
          y: Math.random(),
          r,
          // Drifting down-left along the beam, slower for distant motes.
          vx: (-0.006 - Math.random() * 0.013) * (0.4 + depth),
          vy: (0.009 + Math.random() * 0.021) * (0.4 + depth),
          alpha: 0.42 + Math.random() * 0.58,
          phase: Math.random() * Math.PI * 2,
          wobble: 0.25 + Math.random() * 0.7,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scaled to area, so a phone does not run a desktop's mote count.
      const target = Math.round(Math.min(420, Math.max(70, (w * h) / 4200)));
      if (motes.length !== target) seed(target);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const aspect = h / w || 1;

      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.phase += m.wobble * dt * 0.6;

        // Wrap around rather than respawn, so density never visibly pulses.
        if (m.y > 1.05) {
          m.y = -0.05;
          m.x = Math.random();
        }
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;

        const wobbleX = Math.sin(m.phase) * 0.006;
        const px = (m.x + wobbleX) * w;
        const py = m.y * h;

        const lit = beamProximity(m.x + wobbleX, m.y, aspect);
        if (lit <= 0.012) continue;

        // Slow shimmer, as motes turn through the light.
        const twinkle = 0.72 + 0.28 * Math.sin(m.phase * 1.7);
        const a = m.alpha * lit * twinkle;
        if (a <= 0.012) continue;

        const size = m.r * 9.5;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible || !onScreen) {
        last = now;
        return;
      }
      // Clamp so a backgrounded tab returning does not teleport every mote.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(dt);
    };

    resize();

    if (reduceMotion) {
      draw(0);
      return () => undefined;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    last = performance.now();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

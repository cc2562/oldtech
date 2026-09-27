"use client";

import { useEffect, useRef } from "react";
import { useRafLoop } from "@/hooks/useRafLoop";
import styles from "./PixelField.module.css";

const STRIDE = 6; // homeX, homeY, offsetX, offsetY, velX, velY
const BASE: readonly [number, number, number] = [170, 166, 182];
const SIGNAL: readonly [number, number, number] = [244, 237, 24];
const VIOLET: readonly [number, number, number] = [183, 138, 240];
const LEVELS = 8;

function buildPalette(target: readonly [number, number, number]) {
  const palette: string[] = [];
  for (let level = 0; level < LEVELS; level++) {
    const t = level / (LEVELS - 1);
    const r = Math.round(BASE[0] + (target[0] - BASE[0]) * t);
    const g = Math.round(BASE[1] + (target[1] - BASE[1]) * t);
    const b = Math.round(BASE[2] + (target[2] - BASE[2]) * t);
    palette.push(`rgba(${r},${g},${b},${(0.35 + 0.55 * t).toFixed(2)})`);
  }
  return palette;
}

const SIGNAL_PALETTE = buildPalette(SIGNAL);
const VIOLET_PALETTE = buildPalette(VIOLET);

type FieldState = {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  points: Float32Array;
  count: number;
  dpr: number;
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
  targetX: number;
  targetY: number;
  pushing: boolean;
  interactive: boolean;
  drewStatic: boolean;
};

export function PixelField({
  mode = "fixed",
  spacing = 28,
  pushRadius = 100,
  className = "",
}: {
  mode?: "fixed" | "contained";
  spacing?: number;
  pushRadius?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<FieldState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const state: FieldState = {
      ctx,
      canvas,
      points: new Float32Array(0),
      count: 0,
      dpr: 1,
      width: 0,
      height: 0,
      cursorX: -1e9,
      cursorY: -1e9,
      targetX: -1e9,
      targetY: -1e9,
      pushing: false,
      interactive:
        !window.matchMedia("(hover: none)").matches &&
        !window.matchMedia("(pointer: coarse)").matches,
      drewStatic: false,
    };
    stateRef.current = state;

    const rebuild = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      const w = mode === "fixed" ? window.innerWidth : parent?.clientWidth ?? window.innerWidth;
      const h = mode === "fixed" ? window.innerHeight : parent?.clientHeight ?? window.innerHeight;
      state.dpr = dpr;
      state.width = w;
      state.height = h;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const cols = Math.floor(w / spacing) + 1;
      const rows = Math.floor(h / spacing) + 1;
      const padX = (w - (cols - 1) * spacing) / 2;
      const padY = (h - (rows - 1) * spacing) / 2;
      const points = new Float32Array(cols * rows * STRIDE);
      let i = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          points[i] = padX + col * spacing;
          points[i + 1] = padY + row * spacing;
          i += STRIDE;
        }
      }
      state.points = points;
      state.count = cols * rows;
      state.drewStatic = false;
    };
    rebuild();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 150);
    };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.targetX = event.clientX - rect.left;
      state.targetY = event.clientY - rect.top;
      state.pushing = true;
    };
    const onLeave = () => {
      state.pushing = false;
    };

    window.addEventListener("resize", onResize);
    if (state.interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      stateRef.current = null;
    };
  }, [mode, spacing]);

  useRafLoop(() => {
    const s = stateRef.current;
    if (!s) return;

    // Touch / no-hover devices never animate: draw the resting grid once.
    if (!s.interactive) {
      if (s.drewStatic) return;
      s.drewStatic = true;
    }

    if (s.pushing) {
      if (s.cursorX < -1e8) {
        s.cursorX = s.targetX;
        s.cursorY = s.targetY;
      }
      s.cursorX += (s.targetX - s.cursorX) * 0.2;
      s.cursorY += (s.targetY - s.cursorY) * 0.2;
    }

    const { ctx, points, count, dpr } = s;
    ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
    const radiusSq = pushRadius * pushRadius;
    const size = 2 * dpr;
    let lastFill = "";

    for (let i = 0, p = 0; p < count; p++, i += STRIDE) {
      const hx = points[i];
      const hy = points[i + 1];
      let ox = points[i + 2];
      let oy = points[i + 3];
      let vx = points[i + 4];
      let vy = points[i + 5];

      if (s.pushing) {
        const dx = hx + ox - s.cursorX;
        const dy = hy + oy - s.cursorY;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / pushRadius) * 2.4;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
        }
      }

      vx += -0.06 * ox;
      vy += -0.06 * oy;
      vx *= 0.88;
      vy *= 0.88;
      ox += vx;
      oy += vy;
      if (Math.abs(ox) < 0.05 && Math.abs(vx) < 0.05) {
        ox = 0;
        vx = 0;
      }
      if (Math.abs(oy) < 0.05 && Math.abs(vy) < 0.05) {
        oy = 0;
        vy = 0;
      }
      points[i + 2] = ox;
      points[i + 3] = oy;
      points[i + 4] = vx;
      points[i + 5] = vy;

      const mag = Math.abs(ox) + Math.abs(oy);
      const level = mag >= 20 ? LEVELS - 1 : Math.floor((mag / 20) * LEVELS);
      const fill = (p % 5 === 0 ? VIOLET_PALETTE : SIGNAL_PALETTE)[Math.min(level, LEVELS - 1)];
      if (fill !== lastFill) {
        ctx.fillStyle = fill;
        lastFill = fill;
      }
      ctx.fillRect((hx + ox) * dpr - size / 2, (hy + oy) * dpr - size / 2, size, size);
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.field} ${mode === "fixed" ? styles.fixed : styles.contained} ${className}`}
      aria-hidden="true"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useRafLoop } from "@/hooks/useRafLoop";
import styles from "./HeroParticles.module.css";

// 4x4 Bayer matrix, centered around 0 for threshold dithering.
const BAYER = (() => {
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const out = new Float32Array(16);
  for (let i = 0; i < 16; i++) out[i] = (m[i] + 0.5) / 16 - 0.5;
  return out;
})();

const HI: readonly [number, number, number, number] = [244, 237, 24, 235]; // --signal
const MID: readonly [number, number, number, number] = [150, 82, 214, 210]; // violet

type Ball = {
  cx: number; // base position, fraction of grid
  cy: number;
  ampX: number; // orbit amplitude, fraction of grid
  ampY: number;
  phaseX: number;
  phaseY: number;
  multX: number; // integer frequency multipliers -> closed loop
  multY: number;
  radiusSq: number; // metaball radius^2, in grid cells
};

type Sim = {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  buffer: HTMLCanvasElement;
  bctx: CanvasRenderingContext2D;
  image: ImageData;
  cols: number;
  rows: number;
  balls: Ball[];
};

function makeBalls(cols: number, rows: number): Ball[] {
  const minDim = Math.min(cols, rows);
  const r = (f: number) => {
    const radius = minDim * f;
    return radius * radius;
  };
  return [
    { cx: 0.24, cy: 0.3, ampX: 0.1, ampY: 0.16, phaseX: 0, phaseY: 1.1, multX: 1, multY: 1, radiusSq: r(0.22) },
    { cx: 0.72, cy: 0.24, ampX: 0.14, ampY: 0.1, phaseX: 2.2, phaseY: 0.4, multX: 1, multY: 2, radiusSq: r(0.17) },
    { cx: 0.55, cy: 0.62, ampX: 0.18, ampY: 0.12, phaseX: 4.1, phaseY: 2.9, multX: 2, multY: 1, radiusSq: r(0.2) },
    { cx: 0.3, cy: 0.78, ampX: 0.09, ampY: 0.1, phaseX: 1.7, phaseY: 5.2, multX: 1, multY: 2, radiusSq: r(0.14) },
    { cx: 0.85, cy: 0.7, ampX: 0.08, ampY: 0.14, phaseX: 3.3, phaseY: 1.9, multX: 2, multY: 2, radiusSq: r(0.13) },
    { cx: 0.48, cy: 0.38, ampX: 0.22, ampY: 0.2, phaseX: 5.6, phaseY: 3.7, multX: 1, multY: 1, radiusSq: r(0.11) },
  ];
}

export function HeroParticles({
  cell = 8,
  loopSeconds = 12,
  fps = 30,
  className = "",
}: {
  cell?: number;
  loopSeconds?: number;
  fps?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const lowPowerRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const host = canvas?.parentElement;
    if (!canvas || !ctx || !host) return;

    lowPowerRef.current =
      (navigator.hardwareConcurrency ?? 8) <= 4 || host.clientWidth > 1800;
    const cellSize = lowPowerRef.current ? cell + 4 : cell;
    const buffer = document.createElement("canvas");
    const bctx = buffer.getContext("2d");
    if (!bctx) return;

    const sim = simRef.current ?? ({} as Sim);
    Object.assign(sim, { ctx, canvas, buffer, bctx });
    simRef.current = sim;

    const rebuild = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      canvas.width = w;
      canvas.height = h;
      const cols = Math.max(1, Math.ceil(w / cellSize));
      const rows = Math.max(1, Math.ceil(h / cellSize));
      buffer.width = cols;
      buffer.height = rows;
      sim.cols = cols;
      sim.rows = rows;
      sim.image = bctx.createImageData(cols, rows);
      sim.balls = makeBalls(cols, rows);
      ctx.imageSmoothingEnabled = false;
    };
    rebuild();

    const observer = new ResizeObserver(rebuild);
    observer.observe(host);
    return () => {
      observer.disconnect();
      simRef.current = null;
    };
  }, [cell]);

  useRafLoop(
    (time) => {
      const sim = simRef.current;
      if (!sim || !sim.balls) return;
      const { ctx, canvas, buffer, bctx, image, cols, rows, balls } = sim;
      const t = (((time / 1000) % loopSeconds) / loopSeconds) * Math.PI * 2;

      const bx = new Array<number>(balls.length);
      const by = new Array<number>(balls.length);
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        bx[i] = (b.cx + b.ampX * Math.cos(t * b.multX + b.phaseX)) * cols;
        by[i] = (b.cy + b.ampY * Math.sin(t * b.multY + b.phaseY)) * rows;
      }

      const data = image.data;
      let k = 0;
      for (let y = 0; y < rows; y++) {
        const bayerRow = (y & 3) << 2;
        for (let x = 0; x < cols; x++) {
          let v = 0;
          for (let i = 0; i < balls.length; i++) {
            const dx = x - bx[i];
            const dy = y - by[i];
            v += balls[i].radiusSq / (dx * dx + dy * dy + 0.001);
          }
          const dither = BAYER[bayerRow + (x & 3)] * 0.34;
          if (v > 0.92 + dither) {
            data[k] = HI[0];
            data[k + 1] = HI[1];
            data[k + 2] = HI[2];
            data[k + 3] = HI[3];
          } else if (v > 0.42 + dither) {
            data[k] = MID[0];
            data[k + 1] = MID[1];
            data[k + 2] = MID[2];
            data[k + 3] = MID[3];
          } else {
            data[k + 3] = 0;
          }
          k += 4;
        }
      }

      bctx.putImageData(image, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buffer, 0, 0, cols, rows, 0, 0, canvas.width, canvas.height);
    },
    { fps: lowPowerRef.current ? Math.min(fps, 20) : fps },
  );

  return <canvas ref={canvasRef} className={`${styles.canvas} ${className}`} aria-hidden="true" />;
}

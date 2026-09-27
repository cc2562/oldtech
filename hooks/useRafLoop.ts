"use client";

import { useEffect, useRef } from "react";

type FrameFn = (time: number) => void;

/**
 * Shared requestAnimationFrame lifecycle for ambient canvas animations.
 *
 * - Pauses the loop while the document is hidden, resumes on return.
 * - With prefers-reduced-motion: renders exactly one static frame (t = 0)
 *   and never starts the loop, so every animation has a finished state.
 * - Re-renders the static frame / restarts the loop if the setting changes.
 * - Optional fps cap via frame skipping.
 */
export function useRafLoop(frame: FrameFn, options?: { fps?: number }) {
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const fps = options?.fps ?? 60;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const minInterval = 1000 / fps;
    let raf = 0;
    let last = 0;

    const renderStaticFrame = () => frameRef.current(0);

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < minInterval - 1) return;
      last = time;
      frameRef.current(time);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => cancelAnimationFrame(raf);

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (!motionQuery.matches) {
        start();
      }
    };
    const onMotionChange = () => {
      if (motionQuery.matches) {
        stop();
        renderStaticFrame();
      } else {
        start();
      }
    };

    if (motionQuery.matches) {
      renderStaticFrame();
    } else {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", onMotionChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, [fps]);
}

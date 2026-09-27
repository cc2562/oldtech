"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./HoverCoverPreview.module.css";

export interface HoverCoverPreviewHandle {
  show: (cover: { src: string; alt: string }, x: number, y: number, label?: string) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

/**
 * Singleton floating cover layer for the archive index. Rows drive it through
 * the imperative handle: entering a row glitches the cover in, pointer moves
 * are followed with a rAF-lerped transform written straight to the DOM (no
 * React re-render), leaving plays the glitch out. Under reduced motion the
 * layer appears/disappears instantly and tracks the cursor without smoothing.
 */
export const HoverCoverPreview = forwardRef<HoverCoverPreviewHandle>(function HoverCoverPreview(_props, ref) {
  const layerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedRef = useRef(false);
  const targetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [cover, setCover] = useState<{ src: string; alt: string } | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
    },
    [],
  );

  const place = (x: number, y: number) => {
    const el = layerRef.current;
    if (!el) return;
    const w = el.offsetWidth || 312;
    const h = el.offsetHeight || 220;
    const px = Math.min(Math.max(x + 26, 8), window.innerWidth - w - 8);
    const above = y - h - 22;
    const py = above > 8 ? above : Math.min(y + 26, window.innerHeight - h - 8);
    el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0)`;
  };

  useEffect(() => {
    if (!active || reducedRef.current) return;
    const loop = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.16;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.16;
      place(posRef.current.x, posRef.current.y);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  useImperativeHandle(
    ref,
    () => ({
      show: (next, x, y, nextLabel) => {
        if (outTimerRef.current) {
          clearTimeout(outTimerRef.current);
          outTimerRef.current = null;
        }
        targetRef.current = { x, y };
        posRef.current = { x, y };
        setCover(next);
        setLabel(nextLabel ?? "");
        setActive(true);
        const frame = frameRef.current;
        if (frame) {
          frame.dataset.state = "";
          if (!reducedRef.current) {
            void frame.offsetWidth;
            frame.dataset.state = "in";
          }
        }
        if (reducedRef.current) place(x, y);
      },
      move: (x, y) => {
        targetRef.current = { x, y };
        if (reducedRef.current) place(x, y);
      },
      hide: () => {
        const frame = frameRef.current;
        if (frame && !reducedRef.current) {
          frame.dataset.state = "out";
          outTimerRef.current = setTimeout(() => {
            setActive(false);
            frame.dataset.state = "";
            outTimerRef.current = null;
          }, 230);
        } else {
          setActive(false);
          if (frame) frame.dataset.state = "";
        }
      },
    }),
    [],
  );

  return (
    <div ref={layerRef} className={styles.layer} data-active={active || undefined} aria-hidden="true">
      <div ref={frameRef} className={styles.frame}>
        <div className={styles.bar}>
          <span className={styles.barIcon}>✦</span>
          <span className={styles.barName}>{label || "SIGNAL_PREVIEW.BMP"}</span>
          <span className={styles.barCtrl}><i /></span>
        </div>
        <div className={styles.body}>{cover ? <img src={cover.src} alt="" /> : null}</div>
      </div>
    </div>
  );
});

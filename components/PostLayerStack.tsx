"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./PostLayerStack.module.css";

type LayerState = "active" | "covered" | undefined;

/**
 * Stacked-window scroll for the article page: cover / body / echo board stick
 * under the header while the next layer slides over them. A covered layer
 * flips to a Win98 "inactive window" look (desaturated, gray titlebar) with a
 * short glitch, and glitches back when uncovered. Layers taller than the
 * viewport stick by their bottom edge so all content stays readable. Without
 * JS the page falls back to normal document flow.
 */
export function PostLayerStack({ cover, body, echo }: { cover: ReactNode; body: ReactNode; echo: ReactNode }) {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [states, setStates] = useState<LayerState[]>([undefined, undefined, undefined]);
  const [enhanced, setEnhanced] = useState(false);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const layers = layerRefs.current.filter((el): el is HTMLDivElement => Boolean(el));
    if (layers.length === 0) return;
    let raf = 0;
    let tops: number[] = [];

    const evaluate = () => {
      raf = 0;
      // Flip to the inactive look slightly *before* the follower fully covers
      // the layer, so the glitch telegraphs the handover.
      const lead = Math.min(220, window.innerHeight * 0.28);
      const next: LayerState[] = layers.map((_, i) => {
        if (i === layers.length - 1) return "active";
        const follower = layers[i + 1].getBoundingClientRect();
        return follower.top <= (tops[i] ?? 96) + lead ? "covered" : "active";
      });
      setStates((prev) => (prev.every((state, i) => state === next[i]) ? prev : next));
    };

    const measure = () => {
      const headerOffset = window.innerWidth <= 600 ? 76 : 96;
      // Tall layers stick by their bottom edge (negative top), short ones park
      // right under the fixed header.
      tops = layers.map((el) => Math.min(headerOffset, window.innerHeight - el.offsetHeight));
      layers.forEach((el, i) => {
        el.style.top = `${tops[i]}px`;
      });
      evaluate();
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(evaluate);
    };

    setEnhanced(true);
    measure();
    // Suppress the glitch animations for the state applied on first paint.
    const initTimer = setTimeout(() => setInit(false), 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.stack} data-enhanced={enhanced || undefined} data-init={init || undefined}>
      {[cover, body, echo].map((node, i) => (
        <div
          key={i}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className={styles.layer}
          data-layer={i}
          data-state={states[i]}
        >
          <div className={styles.layerInner}>{node}</div>
        </div>
      ))}
    </div>
  );
}

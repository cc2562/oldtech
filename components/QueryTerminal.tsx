"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QueryTerminal.module.css";

/**
 * Mini terminal above the article archive. Retypes the query line whenever
 * it changes, then prints the result and notifies via onComplete, which the
 * parent uses to reveal the article cards.
 */
export function QueryTerminal({
  query,
  result,
  onComplete,
}: {
  query: string;
  result: string;
  onComplete?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [showResult, setShowResult] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(query);
      setShowResult(true);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms));
    };

    setTyped("");
    setShowResult(false);
    let index = 0;
    const step = () => {
      if (cancelled) return;
      index++;
      setTyped(query.slice(0, index));
      if (index < query.length) {
        later(step, 14 + Math.random() * 12);
      } else {
        later(() => {
          if (cancelled) return;
          setShowResult(true);
          later(() => {
            if (!cancelled) onCompleteRef.current?.();
          }, 200);
        }, 220);
      }
    };
    later(step, 150);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [query]);

  return (
    <div className={styles.term} aria-hidden="true">
      <p className={styles.line}>
        <span className={styles.gt}>&gt;</span> {typed}
        {!showResult && <span className={styles.cursor}>_</span>}
      </p>
      {showResult && (
        <p className={styles.resultLine}>
          {"// "}{result}<span className={styles.cursor}>_</span>
        </p>
      )}
    </div>
  );
}

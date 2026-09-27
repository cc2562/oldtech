"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QueryTerminal.module.css";

/**
 * Scripts that finished typing once (per browser session, module scope) are
 * never re-animated: navigating back from an article or re-selecting an
 * already-viewed channel renders the final state instantly.
 */
const playedScripts = new Set<string>();

export function hasQueryPlayed(key: string) {
  return playedScripts.has(key);
}

/**
 * Mini terminal above the article archive. Types a multi-line script whenever
 * it changes, then prints the result line and notifies via onComplete, which
 * the parent uses to reveal the article cards.
 */
export function QueryTerminal({
  lines,
  result,
  onComplete,
}: {
  lines: string[];
  result: string;
  onComplete?: () => void;
}) {
  const [done, setDone] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [showResult, setShowResult] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const linesKey = lines.join("\n");

  useEffect(() => {
    if (playedScripts.has(linesKey)) {
      setDone(lines);
      setCurrent("");
      setShowResult(true);
      onCompleteRef.current?.();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      playedScripts.add(linesKey);
      setDone(lines);
      setCurrent("");
      setShowResult(true);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms));
    };

    setDone([]);
    setCurrent("");
    setShowResult(false);

    let lineIndex = 0;
    let charIndex = 0;
    const step = () => {
      if (cancelled) return;
      if (lineIndex >= lines.length) {
        playedScripts.add(linesKey);
        setCurrent("");
        later(() => {
          if (cancelled) return;
          setShowResult(true);
          later(() => {
            if (!cancelled) onCompleteRef.current?.();
          }, 200);
        }, 220);
        return;
      }
      const line = lines[lineIndex];
      charIndex++;
      setCurrent(line.slice(0, charIndex));
      if (charIndex < line.length) {
        later(step, 9 + Math.random() * 7);
      } else {
        later(() => {
          if (cancelled) return;
          setDone((prev) => [...prev, line]);
          setCurrent("");
          lineIndex++;
          charIndex = 0;
          later(step, 100);
        }, 60);
      }
    };
    later(step, 160);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  return (
    <div className={styles.term} aria-hidden="true">
      {done.map((line) => (
        <p key={line} className={styles.line}><span className={styles.gt}>&gt;</span> {line}</p>
      ))}
      {!showResult && (
        <p className={styles.line}>
          <span className={styles.gt}>&gt;</span> {current}
          <span className={styles.cursor}>_</span>
        </p>
      )}
      {showResult && (
        <p className={styles.resultLine}>
          {"// "}{result}<span className={styles.cursor}>_</span>
        </p>
      )}
    </div>
  );
}

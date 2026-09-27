"use client";

import { useEffect, useRef, useState } from "react";
import { useRafLoop } from "@/hooks/useRafLoop";
import styles from "./TerminalStatus.module.css";

const DEFAULT_LINES = ["mount /archive", "connect personal_signal"];

function ClockLine() {
  const valueRef = useRef<HTMLSpanElement | null>(null);

  useRafLoop(() => {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    if (valueRef.current) {
      valueRef.current.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
    }
  });

  return (
    <p className={styles.clockLine}>
      <span>&gt;</span> SYS.TIME <b ref={valueRef}>--:--:--.---</b>
    </p>
  );
}

function BootLine() {
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const [count, setCount] = useState(14);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const probe = document.createElement("span");
      probe.textContent = "█";
      probe.style.visibility = "hidden";
      track.appendChild(probe);
      const charWidth = probe.getBoundingClientRect().width || 8;
      probe.remove();
      const available = track.clientWidth - 12;
      setCount(Math.max(4, Math.floor(available / charWidth)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.progressLine}>
      <span>BOOT</span>
      <span className={styles.progressChars} ref={trackRef} aria-hidden="true">
        <i style={{ animationTimingFunction: `steps(${count}, end)` }}>{"█".repeat(count)}</i>
      </span>
      <strong>100%</strong>
    </div>
  );
}

function StaticTerminal({ compact }: { compact: boolean }) {
  return (
    <div className={`${styles.terminal} ${compact ? styles.compact : ""}`} aria-label="界面已就绪">
      <div className={styles.top}><span>NEON_OS / BOOT.LOG</span><span className={styles.ready}>● READY</span></div>
      <p><span>&gt;</span> mount /archive <b>[ OK ]</b></p>
      <p><span>&gt;</span> connect personal_signal <b>[ OK ]</b></p>
      <BootLine />
      <ClockLine />
      <p className={styles.prompt}>{"C:\\NEON\\NOTES>"}<span className={styles.cursor} aria-hidden="true">_</span></p>
    </div>
  );
}

function TypewriterTerminal({ compact, lines, onComplete }: { compact: boolean; lines: string[]; onComplete?: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const prevLinesRef = useRef<string[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const linesKey = lines.join("\n");

  useEffect(() => {
    if (finished) onCompleteRef.current?.();
  }, [finished]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(lines);
      setCurrent("");
      setFinished(true);
      prevLinesRef.current = lines;
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms));
    };

    const prev = prevLinesRef.current;
    let common = 0;
    while (common < prev.length && common < lines.length && prev[common] === lines[common]) {
      common++;
    }
    setDone(lines.slice(0, common));
    setCurrent("");
    setFinished(false);

    let lineIndex = common;
    let charIndex = 0;
    const typeStep = () => {
      if (cancelled) return;
      if (lineIndex >= lines.length) {
        setCurrent("");
        setFinished(true);
        prevLinesRef.current = lines;
        return;
      }
      const line = lines[lineIndex];
      charIndex++;
      setCurrent(line.slice(0, charIndex));
      if (charIndex < line.length) {
        later(typeStep, 18 + Math.random() * 17);
      } else {
        later(() => {
          if (cancelled) return;
          setDone(lines.slice(0, lineIndex + 1));
          prevLinesRef.current = lines.slice(0, lineIndex + 1);
          setCurrent("");
          lineIndex++;
          charIndex = 0;
          later(typeStep, 300);
        }, 120);
      }
    };
    later(typeStep, common === 0 ? 250 : 60);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  return (
    <div className={`${styles.terminal} ${compact ? styles.compact : ""}`} aria-label="界面已就绪">
      <div className={styles.top}><span>NEON_OS / BOOT.LOG</span><span className={styles.ready}>{finished ? "● READY" : "● BUSY"}</span></div>
      {done.map((line) => <p key={line}><span>&gt;</span> {line} <b>[ OK ]</b></p>)}
      {!finished && <p><span>&gt;</span> {current}<span className={styles.cursor} aria-hidden="true">_</span></p>}
      {finished && (
        <>
          <BootLine />
          <ClockLine />
          <p className={styles.prompt}>{"C:\\NEON\\NOTES>"}<span className={styles.cursor} aria-hidden="true">_</span></p>
        </>
      )}
    </div>
  );
}

export function TerminalStatus({
  compact = false,
  typewriter = false,
  lines = DEFAULT_LINES,
  onComplete,
}: {
  compact?: boolean;
  typewriter?: boolean;
  lines?: string[];
  onComplete?: () => void;
}) {
  if (!typewriter) return <StaticTerminal compact={compact} />;
  return <TypewriterTerminal compact={compact} lines={lines} onComplete={onComplete} />;
}

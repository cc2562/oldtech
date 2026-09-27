"use client";

import { useEffect, useState } from "react";
import styles from "./IndexLoader.module.css";

const GLYPHS = "!<>-_\\/[]{}=+*^?#%&@01";
const HEX = "0123456789ABCDEF";
const PHASES = ["SNIFFING PACKETS", "BREACHING ARCHIVE", "DECRYPTING ROWS", "INJECTING PAYLOAD"];
const BAR_WIDTH = 24;

const randomFrom = (charset: string, length: number) =>
  Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");

const randomHexDump = () =>
  Array.from({ length: 4 }, () => `0x${randomFrom(HEX, 4)} ${randomFrom(HEX, 8)}`).join("  ");

/**
 * Cyberpunk-flavoured placeholder shown while the query terminal types: glyph
 * noise, hex dump, block progress and phase readout, over shimmering row
 * skeletons. Reduced motion renders a static standby frame.
 */
export function IndexLoader({ label = "SIGNAL_INDEX.DAT" }: { label?: string }) {
  const [progress, setProgress] = useState(0);
  // Initial lines must be deterministic: random values here would differ
  // between server render and client hydration.
  const [lines, setLines] = useState(["STANDBY // AWAITING QUERY", "░░░░░░░░░░░░░░░░░░░░░░░░░░", "0x0000 00000000  0x0000 00000000  0x0000 00000000  0x0000 00000000"]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(100);
      return;
    }
    const id = setInterval(() => {
      setProgress((prev) => Math.min(97, prev + Math.random() * 8));
      setLines([randomFrom(GLYPHS, 34), randomFrom(GLYPHS, 26), randomHexDump()]);
    }, 70);
    return () => clearInterval(id);
  }, []);

  const filled = Math.round((progress / 100) * BAR_WIDTH);
  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor(progress / 25))];

  return (
    <div className={styles.loader} role="status" aria-label="正在检索文章列表">
      <p className={styles.head}><span className={styles.pulse} /> INCOMING TRANSMISSION // {label}</p>
      <div className={styles.body} aria-hidden="true">
        <p className={styles.line}>{lines[0]}</p>
        <p className={styles.line}>{lines[1]}</p>
        <p className={styles.lineDim}>{lines[2]}</p>
        <p className={styles.barRow}>{"█".repeat(filled)}{"░".repeat(BAR_WIDTH - filled)} <span className={styles.pct}>{String(Math.floor(progress)).padStart(2, "0")}%</span></p>
        <p className={styles.phase}>{phase}</p>
      </div>
      <div className={styles.skRows} aria-hidden="true"><span className={styles.skRow} /><span className={styles.skRow} /><span className={styles.skRow} /></div>
    </div>
  );
}

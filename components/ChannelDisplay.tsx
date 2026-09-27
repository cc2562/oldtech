import { channels, type Channel } from "./ChannelKnob";
import { useScramble } from "@/hooks/useScramble";
import styles from "./ChannelDisplay.module.css";

const codes: Record<Channel, string> = { 全部: "ALL", 技术: "TECH", 思想: "MIND", 生活: "LIFE" };

/**
 * Skeuomorphic LED matrix readout for the archive control deck. Mirrors the
 * knob's silver instrument panel and announces the active channel as text
 * (aria-live). While `ready` is false (query terminal still typing) the
 * channel name flickers as glyph noise and only locks in once the query
 * completes.
 */
export function ChannelDisplay({ value, ready = true, className = "" }: { value: Channel; ready?: boolean; className?: string }) {
  const index = channels.indexOf(value);
  const name = useScramble(value, !ready);

  return (
    <div className={`${styles.panel} ${className}`}>
      <div className={styles.heading}><span>CHANNEL MONITOR</span><span className={styles.serial}>LED–04 / MATRIX</span></div>
      <div className={styles.screen} aria-live="polite">
        <span className={styles.rowTop}><span>CH.0{index + 1}</span><span className={ready ? styles.lock : styles.acquiring}>{ready ? "SIGNAL LOCKED" : "ACQUIRING…"}</span></span>
        <span className={styles.name} data-busy={!ready || undefined}>{name}</span>
        <span className={styles.code}>{ready ? `${codes[value]} // CHANNEL ACTIVE` : "STANDBY // DECRYPTING"}</span>
      </div>
      <div className={styles.footer}><span className={styles.led} data-busy={!ready || undefined} /> DISPLAY LINK OK <span className={styles.footerCode}>MUX.04</span></div>
    </div>
  );
}

import styles from "./TerminalStatus.module.css";

export function TerminalStatus({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.terminal} ${compact ? styles.compact : ""}`} aria-label="界面已就绪">
      <div className={styles.top}><span>NEON_OS / BOOT.LOG</span><span className={styles.ready}>● READY</span></div>
      <p><span>&gt;</span> mount /archive <b>[ OK ]</b></p>
      <p><span>&gt;</span> connect personal_signal <b>[ OK ]</b></p>
      <div className={styles.progressLine}><span>BOOT</span><div className={styles.track} aria-hidden="true"><i /></div><strong>100%</strong></div>
      <p className={styles.prompt}>{"C:\\NEON\\NOTES>"}<span className={styles.cursor} aria-hidden="true">_</span></p>
    </div>
  );
}

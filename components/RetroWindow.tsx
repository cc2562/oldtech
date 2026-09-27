import type { ReactNode } from "react";
import styles from "./RetroWindow.module.css";

export function RetroWindow({ title, eyebrow, children, className = "" }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.window} ${className}`}>
      <div className={`${styles.titlebar} win-titlebar`}><span className={styles.icon} aria-hidden="true">✦</span><span>{title}</span><span className={styles.windowControls} aria-hidden="true"><i className={styles.min} /><i>□</i><i>×</i></span></div>
      <div className={styles.body}>{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}{children}</div>
    </div>
  );
}

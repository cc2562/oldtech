import type { FriendLink } from "@/lib/links";
import styles from "./LinkCard.module.css";

export function LinkCard({ link }: { link: FriendLink }) {
  const host = new URL(link.url).hostname;

  return (
    <a
      className={styles.card}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`访问友链：${link.name}（新窗口打开）`}
    >
      <div className={styles.head}>
        <span className={styles.iconBox} aria-hidden="true">{link.icon}</span>
        <span className={styles.fileNo}>FRIEND_{link.issue}.URL</span>
        {link.isDemo && <span className={styles.demo}>DEMO</span>}
      </div>
      <h3 className={styles.name}>{link.name}</h3>
      <p className={styles.desc}>{link.description}</p>
      <p className={styles.domain}><span className={styles.arrow} aria-hidden="true">↗</span>{host}</p>
    </a>
  );
}

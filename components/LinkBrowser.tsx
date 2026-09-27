import type { FriendLink } from "@/lib/links";
import { LinkCard } from "./LinkCard";
import styles from "./LinkBrowser.module.css";

export function LinkBrowser({ links }: { links: FriendLink[] }) {
  return (
    <div className={styles.browser}>
      <div className={`${styles.titlebar} win-titlebar`}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <span className={styles.title}>FRIEND_LINKS.EXE // RELAY BROWSER</span>
        <span className={styles.controls} aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>
      </div>

      <div className={styles.tabs}>
        <span className={styles.tab}>
          <span className={styles.tabDot} aria-hidden="true" />
          RELAY_NET
          <span className={styles.tabClose} aria-hidden="true">×</span>
        </span>
        <span className={styles.tabTrack} aria-hidden="true" />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.navBtns} aria-hidden="true">
          <span className={styles.navBtn}>◀</span>
          <span className={styles.navBtn}>▶</span>
          <span className={styles.navBtn}>⟳</span>
        </div>
        <span className={styles.addressLabel}>地址(D)</span>
        <span className={styles.address} role="text" title="http://neon-notes.local/links">
          <span className={styles.addressScheme}>http://</span>neon-notes.local/links
        </span>
        <span className={styles.demoTag}>DEMO</span>
      </div>

      <div className={styles.viewport}>
        <p className={styles.viewportHead}>
          <span className={styles.viewportTitle}>RELAY_NET // 已收录 {links.length} 个外部信号</span>
          <span className={styles.viewportNote}>整卡点击 · 新窗口打开</span>
        </p>
        <ul className={styles.grid}>
          {links.map((link) => (
            <li key={link.id} className={styles.cell}>
              <LinkCard link={link} />
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.statusbar}>
        <span><i className={styles.statusLamp} aria-hidden="true" />READY</span>
        <span>{links.length} LINKS CACHED · 全部标注为演示数据</span>
      </div>
    </div>
  );
}

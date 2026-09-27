import { site } from "@/lib/site";
import type { SocialLink } from "@/lib/links";
import styles from "./AuthorCard.module.css";

export function AuthorCard({ socials }: { socials: SocialLink[] }) {
  return (
    <div className={styles.card}>
      <div className={styles.avatarCol}>
        <div className={styles.avatar} aria-hidden="true">
          <span className={styles.avatarGlyph}>N</span>
          <span className={styles.avatarTag}>AVATAR_PLACEHOLDER // NO SIGNAL</span>
        </div>
        <div className={styles.lamps} aria-hidden="true">
          <span className={`${styles.lamp} ${styles.lampOn}`} />
          <span className={styles.lamp} />
          <span className={styles.lamp} />
          <span className={styles.lampLabel}>PWR · NET · RSS</span>
        </div>
      </div>

      <div className={styles.info}>
        <p className={styles.overline}>OPERATOR // STATION MASTER · DEMO PROFILE</p>
        <h2 className={styles.name}>{site.author}</h2>
        <p className={styles.bio}>
          {site.description}白天修理界面，夜里修理想法；这座信号站负责把技术、设计与日常之间的频段调成可以阅读的波形。以下社交账号均为演示占位，后续替换为真实链接。
        </p>
        <ul className={styles.socials}>
          {socials.map((social) => (
            <li key={social.id}>
              <a
                className={styles.social}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${social.label}：${social.handle}（演示链接，新窗口打开）`}
              >
                <span className={styles.socialLabel}>{social.label}</span>
                <span className={styles.socialHandle}>{social.handle}</span>
                {social.isDemo && <span className={styles.socialDemo}>DEMO</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

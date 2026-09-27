"use client";

import { useState } from 'react';
import { LazyImage } from './LazyImage';
import type { SiteData } from '@/lib/cms';
import styles from "./AuthorCard.module.css";

export function AuthorCard({ site }: { site: SiteData }) {
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const showAvatar = Boolean(site.avatar?.src && failedAvatar !== site.avatar.src);

  return (
    <div className={styles.card}>
      <div className={styles.avatarCol}>
        <div className={styles.avatar} aria-hidden="true">
          <span className={styles.avatarGlyph}>{Array.from(site.author.trim())[0] || 'N'}</span>
          {showAvatar && (
            <LazyImage
              className={styles.avatarImage}
              src={site.avatar?.src ?? ''}
              alt=""
              label="OPERATOR.BMP"
              onError={() => setFailedAvatar(site.avatar?.src)}
            />
          )}
          <span className={styles.avatarTag}>OPERATOR // NO SIGNAL</span>
        </div>
        <div className={styles.lamps} aria-hidden="true">
          <span className={`${styles.lamp} ${styles.lampOn}`} />
          <span className={styles.lamp} />
          <span className={styles.lamp} />
          <span className={styles.lampLabel}>PWR · NET · RSS</span>
        </div>
      </div>

      <div className={styles.info}>
        <p className={styles.overline}>OPERATOR // STATION MASTER</p>
        <h2 className={styles.name}>{site.author}</h2>
        <p className={styles.bio}>
          {site.bio || site.description}
        </p>
        <ul className={styles.socials}>
          {site.socials.map((social) => (
            <li key={social.id}>
              <a
                className={styles.social}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${social.label}：${social.handle}（新窗口打开）`}
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

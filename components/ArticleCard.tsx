import Link from "next/link";
import type { PostSummary } from "@/lib/posts";
import styles from "./ArticleCard.module.css";

function Titlebar({ issue, demo, kind }: { issue: string; demo?: boolean; kind: "POST" | "FEATURED" }) {
  return (
    <div className={styles.titlebar}>
      <span className={styles.titlebarIcon} aria-hidden="true">✦</span>
      <span className={styles.issue}>/{issue}</span>
      <span className={styles.titlebarName}>{kind === "FEATURED" ? `FEATURED_${issue}.EXE` : `POST_${issue}.LOG`}</span>
      {demo && <span className={styles.demo}>示例文章</span>}
      <span className={styles.controls} aria-hidden="true"><i className={styles.min} /><i>□</i><i>×</i></span>
    </div>
  );
}

export function ArticleCard({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  if (featured) {
    return (
      <article className={`${styles.card} ${styles.featured}`}>
        <Link href={`/posts/${post.slug}`} className={styles.cardLink} aria-label={`阅读文章：${post.title}`}>
          <Titlebar issue={post.issue} demo={post.isDemo} kind="FEATURED" />
          <div className={styles.featureMain}>
            <div className={styles.featureVisual}>
              {post.cover ? <img className={styles.featureImage} src={post.cover.src} alt={post.cover.alt} /> : <div className={styles.featureDial} aria-hidden="true"><span>FUTURE<br />MEMORY</span></div>}
              <span className={styles.visualIndex}>N° {post.issue} / SIGNAL ARCHIVE</span>
            </div>
            <div className={styles.featureBody}>
              <span className={styles.category}>{post.category}</span>
              <p className={styles.overline}>FEATURED TRANSMISSION / {post.issue}</p>
              <h3>{post.title}</h3>
              <p className={styles.excerpt}>{post.excerpt}</p>
              <div className={styles.meta}><span>{post.publishedAt.replaceAll("-", ".")}</span><span>{post.readingMinutes} 分钟阅读</span></div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <Link href={`/posts/${post.slug}`} className={styles.cardLink} aria-label={`阅读文章：${post.title}`}>
        <Titlebar issue={post.issue} demo={post.isDemo} kind="POST" />
        <div className={styles.body}>
          <span className={styles.category}>{post.category}</span>
          <h3>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.meta}><span>{post.publishedAt.replaceAll("-", ".")}</span><span>{post.readingMinutes} 分钟</span></div>
        </div>
      </Link>
    </article>
  );
}

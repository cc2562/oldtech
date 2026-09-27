import type { PostSummary } from "@/lib/posts";
import styles from "./ArticleCard.module.css";

export function ArticleCard({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  if (featured) {
    return (
      <article className={`${styles.card} ${styles.featured}`}>
        <div className={styles.featureVisual} aria-hidden="true">
          <div className={styles.featureDial}><span>FUTURE<br />MEMORY</span></div>
          <span className={styles.visualIndex}>N° {post.issue} / SIGNAL ARCHIVE</span>
        </div>
        <div className={styles.featureBody}>
          <div className={styles.topline}><span className={styles.category}>{post.category}</span>{post.isDemo && <span className={styles.demo}>示例文章</span>}</div>
          <p className={styles.overline}>FEATURED TRANSMISSION / {post.issue}</p>
          <h3>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.meta}><span>{post.publishedAt.replaceAll("-", ".")}</span><span>{post.readingMinutes} 分钟阅读</span></div>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}><span className={styles.issue}>/{post.issue}</span>{post.isDemo && <span className={styles.demo}>示例文章</span>}</div>
      <span className={styles.category}>{post.category}</span>
      <h3>{post.title}</h3>
      <p className={styles.excerpt}>{post.excerpt}</p>
      <div className={styles.meta}><span>{post.publishedAt.replaceAll("-", ".")}</span><span>{post.readingMinutes} 分钟</span></div>
    </article>
  );
}

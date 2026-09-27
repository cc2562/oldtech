import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetroButton } from "@/components/RetroButton";
import { RetroWindow } from "@/components/RetroWindow";
import { posts } from "@/lib/posts";
import { getPostDetail } from "@/lib/postDetails";
import styles from "./page.module.css";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const detail = getPostDetail((await params).slug);
  if (!detail) return { title: "信号不存在" };
  return { title: detail.title, description: detail.excerpt };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const detail = getPostDetail((await params).slug);
  if (!detail) notFound();

  return (
    <article className={styles.page}>
      <p className={styles.backRow}>
        <Link href="/#journal" className={styles.backLink}>&gt; cd ../archive</Link>
        <span className={styles.backHint}>返回文章档案</span>
      </p>

      <RetroWindow title={`POST_${detail.issue}.LOG`} eyebrow="SIGNAL_COVER.EXE // 信号封面 · DEMO CONTENT" className={styles.coverWindow}>
        <div className={styles.cover} aria-hidden="true">
          <div className={styles.coverDial}><span>{detail.issue}</span></div>
          <span className={styles.coverCaption}>N/N — SIGNAL {detail.issue}</span>
        </div>
        <div className={styles.coverMeta}>
          <p className={styles.kicker}>POST_{detail.issue}.LOG // 演示内容</p>
          <h1 className={styles.title}>{detail.title}</h1>
          <p className={styles.metaLine}>
            <span>{detail.category}</span>
            <span>{detail.publishedAt.replaceAll("-", ".")}</span>
            <span>{detail.readingMinutes} MIN READ</span>
            <span>ISSUE {detail.issue}</span>
          </p>
        </div>
      </RetroWindow>

      <section className={styles.bodySection} aria-labelledby="body-title">
        <div className={styles.sectionBar}><span className={styles.sectionCode}>SIGNAL_BODY</span><h2 id="body-title">正文信号</h2><span className={styles.sectionMeta}>{detail.body.length} SEGMENTS</span></div>
        <div className={styles.prose}>
          {detail.body.slice(0, 2).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <blockquote className={styles.pullQuote}>{detail.pullQuote}</blockquote>
          {detail.body.slice(2).map((paragraph, index) => <p key={index + 2}>{paragraph}</p>)}
        </div>
      </section>

      <RetroWindow title="ECHO_BOARD.EXE" eyebrow={`回声留言板 // ${detail.comments.length} MESSAGES · DEMO`} className={styles.echoWindow}>
        <ol className={styles.echoList}>
          {detail.comments.map((comment) => (
            <li key={comment.id}>
              <p className={styles.echoHead}><span>&gt;</span> {comment.author} <em>:: {comment.postedAt}</em></p>
              <p className={styles.echoText}>{comment.text}</p>
            </li>
          ))}
        </ol>
        <div className={styles.compose}>
          <span className={styles.demoTag}>DEMO</span>
          <p className={styles.composeLine}>&gt; compose --reply</p>
          <textarea className={styles.composeInput} disabled aria-disabled="true" placeholder="演示环境暂不可留言，评论功能将在后台上线后开放。" rows={3} />
          <div className={styles.composeActions}>
            <RetroButton disabled variant="chrome" compact>发送 · DEMO</RetroButton>
            <span className={styles.composeNote}>评论功能为演示占位，不会提交任何内容。</span>
          </div>
        </div>
      </RetroWindow>
    </article>
  );
}

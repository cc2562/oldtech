import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { draftMode, headers } from 'next/headers';
import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import { EchoBoard } from "@/components/EchoBoard";
import { LazyImage } from "@/components/LazyImage";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PostLayerStack } from "@/components/PostLayerStack";
import { RetroWindow } from "@/components/RetroWindow";
import { cms, getPost } from '@/lib/cms';
import styles from "./page.module.css";

export const dynamic = 'force-dynamic';

type UploadDoc = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null; mimeType?: string | null };

// Body uploads render through LazyImage: lazy loading, code placeholder and
// glitch transition included; non-image uploads fall back to the default link.
const proseConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: (args) => {
    const doc = args.node.value as UploadDoc | string | number | null | undefined;
    if (typeof doc !== 'object' || !doc?.url || !doc.mimeType?.startsWith('image')) {
      const fallback = defaultConverters.upload;
      return typeof fallback === 'function' ? fallback(args) : null;
    }
    const fields = (args.node as { fields?: { alt?: string } }).fields;
    return <LazyImage className="proseImage" src={doc.url} alt={fields?.alt || doc.alt || ''} width={doc.width ?? undefined} height={doc.height ?? undefined} fit="contain" effect="none" />;
  },
});

async function loadDetail(slug: string) {
  let preview = false;
  if ((await draftMode()).isEnabled) {
    const payload = await cms();
    const { user } = await payload.auth({ headers: await headers() });
    preview = Boolean(user);
  }
  return { detail: await getPost(slug, preview), preview };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { detail } = await loadDetail((await params).slug);
  if (!detail) return { title: "信号不存在" };
  return { title: detail.title, description: detail.excerpt };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { detail, preview } = await loadDetail((await params).slug);
  if (!detail) notFound();

  return (
    <article className={styles.page}>
      {preview && <form action="/preview/exit" method="post"><button type="submit">退出草稿预览</button></form>}
      <p className={styles.backRow}>
        <Link href="/posts" className={styles.backLink}>&gt; cd ../archive</Link>
        <span className={styles.backHint}>返回文章档案</span>
      </p>

      <PostLayerStack
        cover={
          <RetroWindow title={`POST_${detail.issue}.LOG`} eyebrow="SIGNAL_COVER.EXE // 信号封面" className={styles.coverWindow}>
            {detail.cover && (
              <div className={styles.cover}>
                <LazyImage className={styles.coverImage} src={detail.cover.src} alt={detail.cover.alt} eager label={`SIGNAL_${detail.issue}.BMP`} effect="none" />
                <span className={styles.coverCaption}>N/N — SIGNAL {detail.issue}</span>
              </div>
            )}
            <div className={styles.coverMeta}>
              <p className={styles.kicker}>POST_{detail.issue}.LOG</p>
              <h1 className={styles.title}>{detail.title}</h1>
              <p className={styles.metaLine}>
                <span>{detail.category}</span>
                <span>{detail.publishedAt.replaceAll("-", ".")}</span>
                <span>{detail.readingMinutes} MIN READ</span>
                <span>ISSUE {detail.issue}</span>
              </p>
            </div>
          </RetroWindow>
        }
        body={
          <section className={styles.bodySection} aria-labelledby="body-title">
            <div className={styles.sectionBar}><span className={styles.sectionCode}>SIGNAL_BODY</span><h2 id="body-title">正文信号</h2></div>
            <div className="prose">
              {/* Markdown wins when present; Lexical rich text stays the fallback
                  so already published articles keep rendering unchanged. */}
              {detail.bodyMarkdown
                ? <MarkdownBody source={detail.bodyMarkdown} />
                : detail.body
                  ? <RichText data={detail.body} converters={proseConverters} />
                  : null}
              {detail.pullQuote && <blockquote className="pullQuote">{detail.pullQuote}</blockquote>}
            </div>
          </section>
        }
        echo={<EchoBoard issue={detail.issue} slug={detail.slug} comments={detail.comments} />}
      />
    </article>
  );
}

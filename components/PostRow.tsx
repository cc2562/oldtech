"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import type { PostSummary } from "@/lib/posts";
import styles from "./PostRow.module.css";

export interface PreviewBridge {
  show: (cover: { src: string; alt: string }, x: number, y: number, label: string) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

/**
 * One archive index line: issue file name + title/excerpt + meta. The whole
 * row is a link to the article. When the post has a cover and the parent
 * provides a preview bridge (fine pointer devices only), hovering the row
 * drives the floating glitch cover preview.
 */
export function PostRow({ post, preview }: { post: PostSummary; preview?: PreviewBridge | null }) {
  const cover = post.cover;
  const handlers =
    preview && cover
      ? {
          onPointerEnter: (event: PointerEvent<HTMLAnchorElement>) =>
            preview.show(cover, event.clientX, event.clientY, `COVER_${post.issue}.BMP`),
          onPointerMove: (event: PointerEvent<HTMLAnchorElement>) => preview.move(event.clientX, event.clientY),
          onPointerLeave: preview.hide,
          onBlur: preview.hide,
        }
      : {};

  return (
    <li>
      <Link href={`/posts/${post.slug}`} className={styles.row} {...handlers}>
        <span className={styles.issue}>POST_{post.issue}.LOG</span>
        <span className={styles.main}>
          <span className={styles.title}>{post.title}</span>
          <span className={styles.excerpt}>{post.excerpt}</span>
        </span>
        <span className={styles.meta}>
          <span>{post.category}</span>
          <span>{post.publishedAt.replaceAll("-", ".")}</span>
          <span>{post.readingMinutes} MIN</span>
          {post.isDemo ? <span className={styles.demo}>DEMO</span> : null}
          <span className={styles.arrow} aria-hidden="true">→</span>
        </span>
      </Link>
    </li>
  );
}

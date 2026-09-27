"use client";

import { HoverCoverPreview } from "./HoverCoverPreview";
import { PostRow } from "./PostRow";
import { useCoverPreview } from "@/hooks/useCoverPreview";
import type { PostSummary } from "@/lib/posts";
import styles from "./PostRowDemo.module.css";

/** Showcase sandbox: the archive index rows with the floating glitch preview. */
export function PostRowDemo({ posts }: { posts: PostSummary[] }) {
  const { previewRef, preview } = useCoverPreview();

  return (
    <div>
      <ul className={styles.rows}>
        {posts.map((post) => (
          <PostRow key={post.id} post={post} preview={preview} />
        ))}
      </ul>
      <HoverCoverPreview ref={previewRef} />
    </div>
  );
}

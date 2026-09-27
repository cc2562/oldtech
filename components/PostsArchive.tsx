"use client";

import { useState } from "react";
import { ChannelDisplay } from "./ChannelDisplay";
import { ChannelKnob, type Channel } from "./ChannelKnob";
import { HoverCoverPreview } from "./HoverCoverPreview";
import { IndexLoader } from "./IndexLoader";
import { PostRow } from "./PostRow";
import { QueryTerminal, hasQueryPlayed, scriptFor, scriptKey } from "./QueryTerminal";
import { RetroWindow } from "./RetroWindow";
import { useCoverPreview } from "@/hooks/useCoverPreview";
import type { PostSummary } from "@/lib/posts";
import styles from "./PostsArchive.module.css";

const HYDRATE = "rows --skin=index";

/**
 * /posts archive index: channel knob filtering (same state machine as the home
 * console), query-terminal gated reveal, and the text-row index wired to the
 * floating cover preview on fine pointer devices.
 */
export function PostsArchive({ posts }: { posts: PostSummary[] }) {
  const [channel, setChannel] = useState<Channel>("全部");
  const [ready, setReady] = useState(() => hasQueryPlayed(scriptKey("全部", HYDRATE)));
  const visiblePosts = channel === "全部" ? posts : posts.filter((post) => post.category === channel);

  const handleChannelChange = (next: Channel) => {
    if (next === channel) return;
    setReady(hasQueryPlayed(scriptKey(next, HYDRATE)));
    setChannel(next);
  };

  const { previewRef, preview } = useCoverPreview();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.panelCode}>ARCHIVE.SYS // PANEL 02</p>
        <h1 className={styles.title}>文章档案<span>ARCHIVE</span></h1>
        <p className={styles.sub}>ALL SIGNALS · {String(posts.length).padStart(2, "0")} RECORDS</p>
      </header>

      <RetroWindow title="CHANNEL_CTRL.EXE" eyebrow="ARCHIVE FILTER / CLICK · DRAG · ARROW KEYS" className={styles.ctrlWindow}>
        <div className={styles.ctrlRow}>
          <ChannelDisplay value={channel} ready={ready} className={styles.display} />
          <ChannelKnob value={channel} onChange={handleChannelChange} compact showReadout={false} />
        </div>
        <QueryTerminal
          lines={scriptFor(channel, HYDRATE)}
          result={`${String(visiblePosts.length).padStart(2, "0")} records`}
          onComplete={() => setReady(true)}
        />
      </RetroWindow>

      <section className={styles.index} aria-labelledby="index-title">
        <div className={styles.indexHead}>
          <div>
            <p className={styles.kicker}>02 // SIGNAL INDEX</p>
            <h2 id="index-title">全部信号<span>_</span></h2>
          </div>
          <p className={styles.hint}>HOVER TO PREVIEW · CLICK TO OPEN</p>
        </div>
        {!ready && <IndexLoader />}
        <div className={styles.indexBody} data-ready={ready || undefined}>
          {visiblePosts.length > 0 ? (
            <ul className={styles.rows}>
              {visiblePosts.map((post) => (
                <PostRow key={post.id} post={post} preview={preview} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{"// 0 records — 这个频道暂时没有信号。"}</p>
          )}
        </div>
      </section>

      <HoverCoverPreview ref={previewRef} />
    </div>
  );
}

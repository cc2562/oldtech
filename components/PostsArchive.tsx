"use client";

import { useEffect, useRef, useState } from "react";
import { ChannelDisplay } from "./ChannelDisplay";
import { ChannelKnob, channels, type Channel } from "./ChannelKnob";
import { HoverCoverPreview } from "./HoverCoverPreview";
import { IndexLoader } from "./IndexLoader";
import { PostRow } from "./PostRow";
import { QueryTerminal, hasQueryPlayed, scriptFor, scriptKey } from "./QueryTerminal";
import { RetroButton } from "./RetroButton";
import { RetroWindow } from "./RetroWindow";
import { useCoverPreview } from "@/hooks/useCoverPreview";
import type { PostSummary } from "@/lib/posts";
import styles from "./PostsArchive.module.css";

const HYDRATE = "rows --skin=index";
/** Used when the admin setting is missing/invalid (后台 → 列表设置). */
const DEFAULT_BATCH_SIZE = 5;

/** Selected channel plus how many rows the reader had revealed. */
type ArchiveView = { channel: Channel; shown: number };

/**
 * Browsing position of the archive, kept at module scope so it survives the
 * client-side navigations the PJAX provider performs: returning from an article
 * remounts this component, and in-memory state would drop the expanded batches
 * back to the first one. Same idea as the `playedScripts` cache in
 * QueryTerminal. A hard reload starts over — a fresh document has no history.
 */
let archiveView: ArchiveView | null = null;

/** Load-more script: same terminal voice, offsetting into the archive. */
const moreScript = (channel: Channel, offset: number, limit: number) => [
  "open archive.db --mode=ro",
  `query --channel=${channel} --offset=${offset} --limit=${limit}`,
  "hydrate rows --skin=index",
];

/**
 * /posts archive index: channel knob filtering (same state machine as the home
 * console), query-terminal gated reveal, "load more" batching driven by another
 * terminal script, and the text-row index wired to the floating cover preview
 * on fine pointer devices.
 */
export function PostsArchive({ posts, batchSize = DEFAULT_BATCH_SIZE }: { posts: PostSummary[]; batchSize?: number }) {
  // Guard the admin value here as well: a broken setting must not blank the list.
  const size = Number.isFinite(batchSize) && batchSize >= 1 ? Math.trunc(batchSize) : DEFAULT_BATCH_SIZE;
  const scriptOptions = { limit: size, hydrate: HYDRATE };
  const [channel, setChannel] = useState<Channel>("全部");
  const [ready, setReady] = useState(() => hasQueryPlayed(scriptKey("全部", scriptOptions)));
  const [shown, setShown] = useState(size);
  /** Batch number currently being "fetched" by the terminal, null when idle. */
  const [pending, setPending] = useState<number | null>(null);
  // Snapshot of the stored position, taken once before any write-back below, so
  // the restore effect always reads what the previous visit left behind. The
  // first render deliberately stays on the first batch (matches the SSR markup,
  // no hydration mismatch); the restore happens in the effect.
  const savedView = useRef<ArchiveView | null | undefined>(undefined);
  if (savedView.current === undefined) savedView.current = archiveView;

  // Restore channel and revealed batches, clamped against the current data so a
  // changed batch size, fewer posts or a stale channel value stay safe.
  useEffect(() => {
    const saved = savedView.current;
    if (!saved) return;
    const nextChannel: Channel = channels.includes(saved.channel) ? saved.channel : "全部";
    const total = nextChannel === "全部" ? posts.length : posts.filter((post) => post.category === nextChannel).length;
    const nextShown = Math.min(Math.max(Math.trunc(saved.shown) || size, size), Math.max(total, size));
    setChannel(nextChannel);
    setShown(nextShown);
    // A batch interrupted by the navigation is never resumed.
    setPending(null);
    // Ready must follow the restored channel, otherwise the terminal replays for
    // a channel the reader has already seen.
    setReady(hasQueryPlayed(scriptKey(nextChannel, scriptOptions)));
    // Mount-only: `size` and the script options are stable props/derived values.
  }, []);

  // Mirror the position for the next visit.
  useEffect(() => {
    archiveView = { channel, shown };
  }, [channel, shown]);

  const filteredPosts = channel === "全部" ? posts : posts.filter((post) => post.category === channel);
  const visiblePosts = filteredPosts.slice(0, shown);
  const remaining = filteredPosts.length - visiblePosts.length;
  const batch = Math.ceil(shown / size) + 1;

  const handleChannelChange = (next: Channel) => {
    if (next === channel) return;
    setReady(hasQueryPlayed(scriptKey(next, scriptOptions)));
    setChannel(next);
    // Each channel starts from its first batch again.
    setShown(size);
    setPending(null);
  };

  const handleLoadMore = () => {
    if (pending !== null) return;
    setPending(batch);
  };

  const handleBatchReady = () => {
    setShown((current) => current + size);
    setPending(null);
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
          lines={scriptFor(channel, scriptOptions)}
          result={`${String(filteredPosts.length).padStart(2, "0")} records`}
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

          {remaining > 0 && (
            <div className={styles.more}>
              {pending !== null && (
                <QueryTerminal
                  key={pending}
                  lines={moreScript(channel, visiblePosts.length, size)}
                  result={`+${Math.min(size, remaining)} records`}
                  onComplete={handleBatchReady}
                />
              )}
              <div className={styles.moreRow}>
                <RetroButton variant="chrome" onClick={handleLoadMore} disabled={pending !== null}>
                  {pending !== null ? "读取中…" : "加载更多 / LOAD MORE ↓"}
                </RetroButton>
                <p className={styles.moreReadout} role="status">
                  {pending !== null
                    ? "正在通过检索终端读取下一批记录…"
                    : `已显示 ${visiblePosts.length} / ${filteredPosts.length} 条记录`}
                </p>
              </div>
            </div>
          )}
          {remaining === 0 && filteredPosts.length > size && (
            <p className={styles.moreEnd}>{`// END OF ARCHIVE — 已显示全部 ${filteredPosts.length} 条记录`}</p>
          )}
        </div>
      </section>

      <HoverCoverPreview ref={previewRef} />
    </div>
  );
}

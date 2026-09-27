"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { ChannelKnob, channels, type Channel } from "./ChannelKnob";
import { HeroParticles } from "./HeroParticles";
import { IndexLoader } from "./IndexLoader";
import { LazyImage } from "./LazyImage";
import { QueryTerminal, hasQueryPlayed, scriptFor, scriptKey } from "./QueryTerminal";
import { RetroLink } from "./RetroButton";
import { RetroWindow } from "./RetroWindow";
import { SiteInfoDialog } from "./SiteInfoDialog";
import { TerminalStatus } from "./TerminalStatus";
import type { PostSummary } from "@/lib/posts";
import type { SiteData } from '@/lib/cms';
import styles from "./HomeConsole.module.css";

/**
 * Channel last picked on the home console. Module scope keeps it across the
 * client-side navigations the PJAX provider performs, so walking back from an
 * article stays on the channel the reader was browsing — the same memory the
 * archive index uses. Hard reloads start from 全部 again.
 */
let homeChannel: Channel | null = null;

export function HomeConsole({ posts, author, site }: { posts: PostSummary[]; author: string; site: SiteData }) {
  const [channel, setChannel] = useState<Channel>("全部");
  // Terminal scripts quote the configured display count (后台 → 列表设置).
  const scriptOptions = { limit: site.homeJournalLimit };
  // Returning from an article (client-side nav) skips the query animation:
  // if this channel's script already played, cards are visible immediately.
  const [ready, setReady] = useState(() => hasQueryPlayed(scriptKey("全部", scriptOptions)));
  // Snapshot read once, before the mirror effect below can overwrite it.
  const savedChannel = useRef<Channel | null | undefined>(undefined);
  if (savedChannel.current === undefined) savedChannel.current = homeChannel;

  // Restored after mount rather than in the initial state: the first render has
  // to stay on 全部 to match the server markup (no hydration mismatch).
  useEffect(() => {
    const saved = savedChannel.current;
    if (!saved || saved === "全部" || !channels.includes(saved)) return;
    setChannel(saved);
    // Ready must follow the restored channel, or the terminal replays.
    setReady(hasQueryPlayed(scriptKey(saved, scriptOptions)));
    // Mount-only: the script options are stable props/derived values.
  }, []);

  // Mirror the channel for the next visit.
  useEffect(() => {
    homeChannel = channel;
  }, [channel]);

  const visiblePosts = channel === "全部" ? posts : posts.filter((post) => post.category === channel);
  const featured = channel === "全部" ? visiblePosts.find((post) => post.featured) ?? visiblePosts[0] : visiblePosts[0];
  const rest = visiblePosts.filter((post) => post.id !== featured?.id);

  const handleChannelChange = (next: Channel) => {
    if (next === channel) return;
    setReady(hasQueryPlayed(scriptKey(next, scriptOptions)));
    setChannel(next);
  };

  return (
    <>
      <section className={styles.hero} aria-labelledby="intro-title">
        <div className={styles.chassis}>
          <div className={styles.topRail}><span className={styles.railLeds} aria-hidden="true"><i /><i /><i /></span><span>NEON / NOTES // PERSONAL SIGNAL STATION</span><span className={styles.railVersion}>SYS.02 · 2026</span></div>
          <div className={styles.heroGrid}>
            <div className={styles.intro}>
              <HeroParticles />
              <p className={styles.kicker}><span>●</span> ONLINE — PERSONAL ARCHIVE</p>
              <div className={styles.chromePlate}><span className={styles.plateCode}>NN / 001</span><h1 id="intro-title">记录当下，<br /><em>想象下一种未来。</em></h1><span className={styles.plateEdge} aria-hidden="true">✦</span></div>
              <p className={styles.lead}>这里是{author}的个人信号站。收集技术的灵感、设计的细节，以及普通日子里闪光的片刻。</p>
              <div className={styles.heroActions}><RetroLink href="#journal">进入文章档案 ↓</RetroLink><SiteInfoDialog site={site} /></div>
              <div className={styles.hazard} aria-hidden="true"><span>///</span> CHROME MEMORY / ACID SIGNAL <span>///</span></div>
            </div>

            <div className={styles.featureZone}>
              <RetroWindow title="FEATURED_POST.EXE" eyebrow="EDITOR'S PICK" className={styles.featureWindow}>
                {featured ? (
                  <Link href={`/posts/${featured.slug}`} className={styles.featureLink}>
                    <div className={styles.featureMedia}>{featured.cover ? <LazyImage className={styles.featureImage} src={featured.cover.src} alt={featured.cover.alt} eager label={`POST_${featured.issue}.BMP`} /> : <div className={styles.orbit} aria-hidden="true"><span>{featured.issue}</span></div>}<span className={styles.mediaCaption}>N/N — SIGNAL {featured.issue}</span></div>
                    <div className={styles.featureCopy}><span className={styles.featureTag}>{featured.category} / 精选文章</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><span className={styles.featureMeta}>{featured.publishedAt.replaceAll("-", ".")} / {featured.readingMinutes} MIN READ</span></div>
                  </Link>
                ) : (
                  <div className={styles.featureCopy}><span className={styles.featureTag}>频道 / 精选文章</span><h2>暂无文章</h2><p>这个频道还没有内容。</p></div>
                )}
              </RetroWindow>
            </div>
          </div>

          <div className={styles.instrumentRow}>
            <div className={styles.terminalWrap}><TerminalStatus typewriter lines={["mount /archive", "connect personal_signal"]} /><p className={styles.systemNote}>INFORMATION STREAM <span>›</span> 文章频道已连接 <span>›</span> {visiblePosts.length} 条记录</p></div>
            <ChannelKnob value={channel} onChange={handleChannelChange} />
          </div>
          <div className={styles.bottomRail}><span>▲ ARCHIVE ACCESS GRANTED</span><a href="#journal">SCROLL TO JOURNAL ↓</a><span>NO. 0001 / 0004</span></div>
        </div>
      </section>

      <section id="journal" className={styles.journal} aria-labelledby="journal-title">
        <div className={styles.journalHeader}><div><p>01 // PERSONAL ARCHIVE</p><h2 id="journal-title">最近的信号<span>_</span></h2></div><div className={styles.journalReadout} aria-live="polite">当前频道 <strong>{channel}</strong><br />检索结果 <strong>{String(visiblePosts.length).padStart(2, "0")}</strong> 条</div></div>
        <QueryTerminal lines={scriptFor(channel, scriptOptions)} result={`${String(visiblePosts.length).padStart(2, "0")} records`} onComplete={() => setReady(true)} />
        {!ready && <IndexLoader label="LATEST_SIGNALS.DAT" />}
        <div className={styles.journalBody} data-ready={ready || undefined}>
          {!featured && <p>这个频道还没有已发布文章。</p>}
          {featured && <ArticleCard post={featured} featured />}
          {rest.length > 0 && <div className={styles.cards}>{rest.map((post) => <ArticleCard key={post.id} post={post} />)}</div>}
        </div>
      </section>

      <section className={styles.endnote} aria-label="站点说明"><span className={styles.endnoteIcon}>!</span><div><h2>信号持续更新中</h2><p>{site.description}</p></div><span className={styles.endnoteCode}>END_OF_SIGNAL</span></section>
    </>
  );
}

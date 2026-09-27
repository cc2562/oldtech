"use client";

import { useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { ChannelKnob, type Channel } from "./ChannelKnob";
import { HeroParticles } from "./HeroParticles";
import { QueryTerminal } from "./QueryTerminal";
import { RetroLink } from "./RetroButton";
import { RetroWindow } from "./RetroWindow";
import { SiteInfoDialog } from "./SiteInfoDialog";
import { TerminalStatus } from "./TerminalStatus";
import type { PostSummary } from "@/lib/posts";
import styles from "./HomeConsole.module.css";

export function HomeConsole({ posts, author }: { posts: PostSummary[]; author: string }) {
  const [channel, setChannel] = useState<Channel>("全部");
  const [ready, setReady] = useState(false);
  const visiblePosts = channel === "全部" ? posts : posts.filter((post) => post.category === channel);
  const featured = channel === "全部" ? visiblePosts.find((post) => post.featured) ?? visiblePosts[0] : visiblePosts[0];
  const rest = visiblePosts.filter((post) => post.id !== featured?.id);

  const handleChannelChange = (next: Channel) => {
    if (next === channel) return;
    setReady(false);
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
              <div className={styles.heroActions}><RetroLink href="#journal">进入文章档案 ↓</RetroLink><SiteInfoDialog /></div>
              <div className={styles.hazard} aria-hidden="true"><span>///</span> CHROME MEMORY / ACID SIGNAL <span>///</span></div>
            </div>

            <div className={styles.featureZone}>
              <RetroWindow title="FEATURED_POST.EXE" eyebrow="EDITOR'S PICK / DEMO CONTENT" className={styles.featureWindow}>
                <div className={styles.featureMedia} aria-hidden="true"><div className={styles.orbit}><span>{featured?.issue ?? "000"}</span></div><span className={styles.mediaCaption}>N/N — SIGNAL {featured?.issue ?? "000"}</span></div>
                <div className={styles.featureCopy}><span className={styles.featureTag}>{featured?.category ?? "频道"} / 示例文章</span><h2>{featured?.title ?? "暂无文章"}</h2><p>{featured?.excerpt ?? "这个频道还没有内容。"}</p><span className={styles.featureMeta}>{featured?.publishedAt.replaceAll("-", ".")} / {featured?.readingMinutes} MIN READ</span></div>
              </RetroWindow>
            </div>
          </div>

          <div className={styles.instrumentRow}>
            <div className={styles.terminalWrap}><TerminalStatus typewriter lines={["mount /archive", "connect personal_signal", `scan --channel=${channel}`]} /><p className={styles.systemNote}>INFORMATION STREAM <span>›</span> 文章频道已连接 <span>›</span> {visiblePosts.length} 条记录</p></div>
            <ChannelKnob value={channel} onChange={handleChannelChange} />
          </div>
          <div className={styles.bottomRail}><span>▲ ARCHIVE ACCESS GRANTED</span><a href="#journal">SCROLL TO JOURNAL ↓</a><span>NO. 0001 / 0004</span></div>
        </div>
      </section>

      <section id="journal" className={styles.journal} aria-labelledby="journal-title">
        <div className={styles.journalHeader}><div><p>01 // PERSONAL ARCHIVE</p><h2 id="journal-title">最近的信号<span>_</span></h2></div><div className={styles.journalReadout} aria-live="polite">当前频道 <strong>{channel}</strong><br />检索结果 <strong>{String(visiblePosts.length).padStart(2, "0")}</strong> 条 · 演示内容</div></div>
        <QueryTerminal query={`query --channel=${channel} --sort=date.desc`} result={`${String(visiblePosts.length).padStart(2, "0")} records · DEMO DATA`} onComplete={() => setReady(true)} />
        <div className={styles.journalBody} data-ready={ready || undefined}>
          {featured && <ArticleCard post={featured} featured />}
          {rest.length > 0 && <div className={styles.cards}>{rest.map((post) => <ArticleCard key={post.id} post={post} />)}</div>}
        </div>
      </section>

      <section className={styles.endnote} aria-label="演示说明"><span className={styles.endnoteIcon}>!</span><div><h2>系统仍在装配中</h2><p>这里是视觉与组件演示。文章详情、作者资料和发布后台会在后续阶段接入。</p></div><span className={styles.endnoteCode}>END_OF_SIGNAL</span></section>
    </>
  );
}

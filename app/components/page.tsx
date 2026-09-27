import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { ButtonDemo } from "@/components/ButtonDemo";
import { ChannelDemo } from "@/components/ChannelDemo";
import { HeroParticles } from "@/components/HeroParticles";
import { PixelField } from "@/components/PixelField";
import { RetroWindow } from "@/components/RetroWindow";
import { SiteInfoDialog } from "@/components/SiteInfoDialog";
import { TerminalStatus } from "@/components/TerminalStatus";
import { posts } from "@/lib/posts";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "组件展台" };

const colors = [
  { name: "SIGNAL YELLOW", token: "--signal", value: "#F4ED18", className: styles.signal },
  { name: "EVA VIOLET", token: "--violet", value: "#8244C7", className: styles.violet },
  { name: "DEEP NIGHT", token: "--night", value: "#0E0A18", className: styles.night },
  { name: "CHROME LIGHT", token: "--paper", value: "#F4F0FB", className: styles.paper },
];

export default function ComponentsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>02 / COMPONENT LAB</p>
        <h1>组件展台<span className={styles.cursor}>_</span></h1>
        <p>个人信号站的零件目录：金属窗口、实体旋钮、终端状态与有按压感的按钮。</p>
      </header>

      <section className={styles.section} aria-labelledby="palette-title">
        <div className={styles.sectionTitle}><span>01</span><div><p>FOUNDATION</p><h2 id="palette-title">色彩与材质</h2></div></div>
        <div className={styles.swatches}>{colors.map((color) => <div className={styles.swatch} key={color.token}><div className={`${styles.swatchColor} ${color.className}`} /><div className={styles.swatchInfo}><strong>{color.name}</strong><span>{color.value} · {color.token}</span></div></div>)}</div>
      </section>

      <section className={styles.section} aria-labelledby="buttons-title">
        <div className={styles.sectionTitle}><span>02</span><div><p>INTERACTION</p><h2 id="buttons-title">拟物按钮</h2></div></div>
        <ButtonDemo />
      </section>

      <section className={styles.section} aria-labelledby="knob-title">
        <div className={styles.sectionTitle}><span>03</span><div><p>INPUT DEVICE</p><h2 id="knob-title">文章频道旋钮</h2></div></div>
        <ChannelDemo />
      </section>

      <section className={styles.section} aria-labelledby="window-title">
        <div className={styles.sectionTitle}><span>04</span><div><p>WINDOW SYSTEM</p><h2 id="window-title">窗口与终端</h2></div></div>
        <div className={styles.systemGrid}>
          <RetroWindow title="ARCHIVE_NOTICE.TXT" eyebrow="WINDOW 98 / PERSONAL FILE"><h3>界面正在调频。</h3><p>这是承载精选文章和系统消息的内容窗口。标题栏与边框负责表达年代感，正文仍以阅读为先。</p><div className={styles.windowAction}><SiteInfoDialog /></div></RetroWindow>
          <TerminalStatus typewriter lines={["mount /archive", "connect personal_signal", "scan --channel=全部"]} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="type-title">
        <div className={styles.sectionTitle}><span>05</span><div><p>TYPOGRAPHY</p><h2 id="type-title">字体层级</h2></div></div>
        <div className={styles.typePanel}>
          <div><small>DISPLAY / 64</small><p className={styles.typeDisplay}>下一种<span>未来。</span></p></div>
          <div><small>HEADING / 32</small><p className={styles.typeHeading}>把灵感存入个人档案</p></div>
          <div><small>BODY / 16</small><p className={styles.typeBody}>阅读需要安静的背景与清晰的层次。装饰负责营造气氛，文字负责讲好故事。</p></div>
          <div><small>MONO / 12</small><p className={styles.typeMono}>TRANSMISSION_001 · 2026.09.18</p></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="card-title">
        <div className={styles.sectionTitle}><span>06</span><div><p>CONTENT</p><h2 id="card-title">文章卡片</h2></div></div>
        <div className={styles.cardPanel}><ArticleCard post={posts[1]} /><div className={styles.cardNotes}><span className={styles.noteTag}>DEMO DATA</span><h3>每张卡片都是一扇小窗口。</h3><p>卡片套用了 Windows 98 的窗口语言：渐变标题栏、期号与文件名、装饰性窗口按钮，正文留在凹陷的内容区里。第一阶段没有文章详情页，因此它保持静态，不制造无法完成的点击。</p><ul><li>标题栏携带期号与文件名</li><li>摘要保持舒适行距</li><li>元信息退居次要层级</li></ul></div></div>
      </section>

      <section className={styles.section} aria-labelledby="ambient-title">
        <div className={styles.sectionTitle}><span>07</span><div><p>AMBIENT</p><h2 id="ambient-title">环境层</h2></div></div>
        <div className={styles.ambientGrid}>
          <div>
            <div className={styles.ambientBox}><HeroParticles /></div>
            <p className={styles.ambientCaption}>HERO PARTICLES — 抖动像素流体团，亮黄与紫双阈值 Bayer 抖动，12 秒无缝循环，仅在首屏渲染。</p>
          </div>
          <div>
            <div className={styles.ambientBox}><PixelField mode="contained" /></div>
            <p className={styles.ambientCaption}>PIXEL FIELD — 像素点阵被光标推开并弹簧回位；触摸设备与“减少动态效果”下退化为静止点阵。</p>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { ButtonDemo } from "@/components/ButtonDemo";
import { ChannelDemo } from "@/components/ChannelDemo";
import { HeroParticles } from "@/components/HeroParticles";
import { PixelField } from "@/components/PixelField";
import { PostRowDemo } from "@/components/PostRowDemo";
import { QueryTerminal } from "@/components/QueryTerminal";
import { RetroWindow } from "@/components/RetroWindow";
import { RetroLink } from "@/components/RetroButton";
import { SiteInfoDialog } from "@/components/SiteInfoDialog";
import { TerminalStatus } from "@/components/TerminalStatus";
import { LazyImage } from "@/components/LazyImage";
import { MarkdownBody } from "@/components/MarkdownBody";
import { LinkCard } from "@/components/LinkCard";
import { friendLinks } from "@/lib/links";
import { getPublishedPosts } from '@/lib/cms';
import { site } from '@/lib/site';
import styles from "./page.module.css";

export const metadata: Metadata = { title: "组件展台" };

// Demo Markdown body: the exact syntax an article would carry, including GFM
// table / task list, a highlighted code block and a lazily loaded image.
const markdownSample = `## 信号日志 // 004

Markdown 正文与富文本正文二选一：填写后前台优先渲染 Markdown，适合从 Typecho 等来源直接粘贴原文。

> 排版沿用站内统一的阅读样式：标题带 \`#\` 标记，引用是紫色信号块，代码走终端风凹陷框。

- **加粗**、*斜体* 与 ~~删除线~~ 都能正常显示
- [x] 任务列表：已完成的条目
- [ ] 待办：继续观测信号

| 频道 | 记录 | 状态 |
| --- | --- | --- |
| 技术 | 02 | ONLINE |
| 设计 | 01 | ONLINE |

\`\`\`ts
export function lockChannel(channel: Channel) {
  // 注释：信号锁定后只展示对应频道
  return signals.filter((item) => item.channel === channel)
}
\`\`\`

![雨天霓虹占位封面](/covers/signal-003.svg "SIGNAL_003.BMP")
`;

const colors = [
  { name: "SIGNAL YELLOW", token: "--signal", value: "#F4ED18", className: styles.signal },
  { name: "EVA VIOLET", token: "--violet", value: "#8244C7", className: styles.violet },
  { name: "DEEP NIGHT", token: "--night", value: "#0E0A18", className: styles.night },
  { name: "CHROME LIGHT", token: "--paper", value: "#F4F0FB", className: styles.paper },
];

export default async function ComponentsPage() {
  const posts = await getPublishedPosts();
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>04 / COMPONENT LAB</p>
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
          <RetroWindow title="ARCHIVE_NOTICE.TXT" eyebrow="WINDOW 98 / PERSONAL FILE"><h3>界面正在调频。</h3><p>这是承载精选文章和系统消息的内容窗口。标题栏与边框负责表达年代感，正文仍以阅读为先。</p><div className={styles.windowAction}><SiteInfoDialog site={site} /></div></RetroWindow>
          <TerminalStatus typewriter lines={["mount /archive", "connect personal_signal"]} />
        </div>
        <div className={styles.termDemo}>
          <QueryTerminal lines={["open archive.db --mode=ro", "query --channel=全部 --sort=date.desc --limit=8", "hydrate cards --skin=win98"]} result="04 records · DEMO DATA" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pjax-title">
        <div className={styles.sectionTitle}><span>08</span><div><p>NAVIGATION</p><h2 id="pjax-title">导航转场</h2></div></div>
        <div className={styles.navPanel}>
          <p>站内链接由 PJAX 系统接管：点击后页面中央出现 NAV.SYS 终端，跑完代码再完成跳转；浏览器前进后退会播放短版 restore 脚本。点击下面的按钮亲身体验。</p>
          <div className={styles.navActions}>
            <RetroLink href="/">演示：返回首页 ↗</RetroLink>
            {posts[0] && <RetroLink href={`/posts/${posts[0].slug}`} variant="violet">打开文章 ↗</RetroLink>}
          </div>
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
        <div className={styles.cardPanel}>{posts[0] ? <ArticleCard post={posts[0]} /> : <p>发布文章后，这里会展示真实文章卡片。</p>}<div className={styles.cardNotes}><h3>每张卡片都是一扇小窗口。</h3><p>卡片套用 Windows 98 的窗口语言：渐变标题栏、期号与文件名、装饰性窗口按钮，正文留在凹陷的内容区里。</p><ul><li>标题栏携带期号与文件名</li><li>摘要保持舒适行距</li><li>元信息退居次要层级</li></ul></div></div>
      </section>

      <section className={styles.section} aria-labelledby="rows-title">
        <div className={styles.sectionTitle}><span>09</span><div><p>ARCHIVE INDEX</p><h2 id="rows-title">文章索引行与悬浮预览</h2></div></div>
        {posts.length > 0 ? <PostRowDemo posts={posts} /> : <p>发布文章后，这里会展示真实文章索引。</p>}
        <p className={styles.ambientCaption}>POST ROW — /posts 档案页的文字索引行；带封面的行在光标悬浮时以故障效果浮现预览图并跟随移动，触摸设备与「减少动态效果」下不显示。第 4 篇无封面，仅作文字高亮对照。</p>
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

      <section className={styles.section} aria-labelledby="links-title">
        <div className={styles.sectionTitle}><span>10</span><div><p>EXTERNAL RELAY</p><h2 id="links-title">友链卡片</h2></div></div>
        <div className={styles.cardPanel}>
          <div className={styles.linkCardStack}>
            <LinkCard link={friendLinks[0]} />
            <LinkCard link={friendLinks[3]} />
          </div>
          <div className={styles.cardNotes}>
            <span className={styles.noteTag}>DEMO DATA</span>
            <h3>住在浏览器窗口里的网页卡片。</h3>
            <p>/links 中继站把友链装进一扇完整的模拟浏览器窗口（FRIEND_LINKS.EXE）：标签页、只读地址栏与凹陷视口。视口内的卡片是「网页卡片」而非又一扇 Win98 窗口——细描边、深底浅字，与外层金属边框拉开层级。</p>
            <ul>
              <li>悬停：亮黄高亮 + 故障抖动（位移 / 色差 / 扫描线）</li>
              <li>focus-visible：3px 信号黄焦点框，键盘可达</li>
              <li>整卡为外链，新窗口打开，演示站点均标注 DEMO</li>
            </ul>
          </div>
        </div>
        <p className={styles.ambientCaption}>LINK CARD — /links 友情链接页视口内的网页卡片；域名行由 URL 自动提取，长描述在 320px 宽度下不溢出。</p>
      </section>

      <section className={styles.section} aria-labelledby="media-title">
        <div className={styles.sectionTitle}><span>11</span><div><p>MEDIA</p><h2 id="media-title">懒加载图片</h2></div></div>
        <LazyImage className={styles.lazyDemo} src="/covers/signal-002.svg" alt="拟物按钮状态占位封面（演示）" label="DEMO_002.SVG" />
        <p className={styles.ambientCaption}>LAZY IMAGE — 全站图片统一入口：非首屏图片原生懒加载，代码式占位符（&gt; decode … + █ 进度行）垫在图下，加载完成后故障抖动切入；首屏关键图（首页精选 / 详情封面）eager 高优先级不延迟；不支持懒加载的旧浏览器忽略属性、正常加载；动态换图（悬浮预览、正文插图）自动重放占位与过渡。本地图片加载极快，占位符可能只是一闪而过。</p>
      </section>

      <section className={styles.section} aria-labelledby="markdown-title">
        <div className={styles.sectionTitle}><span>12</span><div><p>WRITING FORMAT</p><h2 id="markdown-title">Markdown 正文</h2></div></div>
        <div className={styles.markdownPanel}>
          <div className="prose"><MarkdownBody source={markdownSample} /></div>
        </div>
        <p className={styles.ambientCaption}>MARKDOWN BODY — 后台「Markdown 正文」与富文本正文二选一，填写 Markdown 时前台优先渲染（适合从 Typecho 等来源直接粘贴原文）。以上示例即由 MarkdownBody 渲染：GFM 表格、任务列表、删除线可用，代码块按语言着色（信号黄 / EVA 紫 / 银铬，无红色），图片经 LazyImage 懒加载并限宽在阅读列内。</p>
      </section>
    </div>
  );
}

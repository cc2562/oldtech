---
name: lazyimage-and-card-fixes
overview: 修复 LazyImage 切换 src 残留旧图、渐进式加载显现两个问题（加载完成前隐藏图像素，完成后故障动画一次性出现），并修复首页卡片网格跨列规则泄漏与断点不同步导致的窄窗口错位。
todos:
  - id: lazyimage-visibility
    content: LazyImage 加 data-js 标记与加载前隐藏规则，修复旧图残留与渐进显现
    status: completed
  - id: cards-grid-breakpoints
    content: HomeConsole 媒体查询：跨列规则限定 721–1050px、单列断点提升到 720px
    status: completed
    dependencies:
      - lazyimage-visibility
  - id: verify-changelog
    content: 运行 npm run typecheck，changlog.md 追加修复条目
    status: completed
    dependencies:
      - cards-grid-breakpoints
---

## 用户需求

修复上一轮懒加载与卡片网格改动引入的三个回归问题：

1. **悬浮预览残留旧图**:`/posts` 文章索引行的悬浮封面预览，在目标文章封面尚未加载完成时，会一直显示上一篇已成功加载文章的封面，直到新图就绪——应该显示加载占位符而不是上一张图。
2. **图片渐进式显现**：懒加载的代码式占位符（`> decode … LOADING_`）已出现，但图片仍会自上而下"一点点"显现并逐渐盖住占位符。期望：加载完成前图片完全不可见，加载完成后通过故障动画一次性切入。
3. **首页卡片窄窗口错位**：桌面宽窗口下首页卡片正常（精选卡通栏 + 其余两列），窗口变窄后卡片错位/右溢出（截图可见 003 卡片被挤出单列之外）。

## 产品概述

NEON / NOTES 个人博客，千禧年控制台风格（深紫 + 亮黄 + 银铬，Win98 窗口语言）。首页为 Hero + 文章档案网格；`/posts` 为文字索引行 + 光标悬浮故障封面预览；全站图片经统一的 `LazyImage` 组件懒加载。

## 核心功能

- 悬浮预览切换文章时，新封面未加载完成前显示代码式占位符，不残留上一张图
- 所有懒加载图片：加载完成前像素不可见，完成后播放故障动画一次性出现；无 JS 环境下图片仍正常显示
- 首页卡片网格在任意窗口宽度（320px 起）不错位、不横向溢出：宽屏精选通栏 + 两列网格、中间区间两列、窄屏全部单列

## 技术栈

沿用项目现状：Next.js 16 App Router + React 19 + TypeScript + CSS Modules（不使用 Tailwind）。纯组件 + CSS 修复，无新依赖。

## 实现思路

三个问题根因均已确认，修复互不耦合：

### 问题 1+2：LazyImage 加载可见性语义（同一处修复）

根因：占位符 `.ph` 垫在 `img` 下层（z-index 0 vs 1），而 `img` 没有任何透明度约束——渐进式 JPEG 边下边渲染直接盖过占位符（问题 2）；同一 `<img>` 切换 src 时浏览器保留旧像素直到新图就绪，旧图不透明、占位符被挡（问题 1）。

方案：加载完成前隐藏图像素，但**不能**直接在 SSR HTML 上设 `opacity: 0`（无 JS 时 `data-loaded` 永不设置，图将永久不可见）。组件挂载后通过 `useEffect` 给 wrapper 加 `data-js` 标记：

```css
.lazy[data-js]:not([data-loaded]) .img { opacity: 0; }
```

- SSR / 无 JS：无 `data-js`，图片正常显示（回退安全）
- 有 JS：未加载完成时 img 透明 → 下层占位符可见；`onLoad` 后 `data-loaded` 生效，`imgGlitchIn` 动画（0% opacity 0 → 100% opacity 1）故障切入，天然衔接
- 问题 1 同时解决：src 切换后 `loaded=false` → img 立即透明、占位符自动重现（`[data-loaded] .ph { opacity: 0 }` 失效），旧像素不再可见
- 性能：仅一次额外渲染标记 `data-js`，无监听、无定时器；动画沿用既有 steps 故障关键帧，减少动态效果由 `globals.css` 全局规则压平

### 问题 3：首页卡片网格错位（两处 CSS 叠加）

- (a) 特异性泄漏：`@media (max-width: 1050px)` 内 `.cards > :last-child:nth-child(odd) { grid-column: span 2 }`（特异性 0,3,0）压过 `@media (max-width: 680px)` 内 `.cards > :last-child { grid-column: auto }`（0,2,0），奇数张剩余卡片时跨两列规则泄漏进单列布局，产生隐式第二列、卡片右溢错位。修复：跨列规则限定区间 `@media (min-width: 721px) and (max-width: 1050px)`。
- (b) 断点不同步：网格单列断点 680px 与 `ArticleCard.module.css` 精选卡内部堆叠断点 720px 不一致，680–720px 区间精选卡已堆叠、其余卡仍半宽两列。修复：`.cards` 单列断点由 680 提升到 720（680 媒体查询块内其余 hero 规则不动，仅把两条 `.cards` 规则移入新的 720 查询）。

## 实现注意

- 不改动 `LazyImage` 的 props 接口与所有调用方；`measure()`/`evaluate()`、PJAX、展台第 11 区示例均不受影响
- 720/721 断点与 `ArticleCard.module.css` 既有 720px 查询对齐，避免引入第三种断点
- 回归面集中在 3 个文件；改完跑 `npm run typecheck` 并人工验证 414 / 700 / 1080px 三档宽度

## 架构设计

改动为既有组件的行为修正，无新增架构。数据流不变：CMS → `PostSummary` → `ArticleCard`/`HomeConsole`；`HoverCoverPreview` → `LazyImage`。

## 目录结构

```
project-root/
├── components/
│   ├── LazyImage.tsx           # [MODIFY] 挂载后经 useEffect 给 wrapper 加 data-js 标记（useState(false) → useEffect setTrue），其余逻辑（loadedSrc 追踪、ref complete 检查、占位符）不动
│   ├── LazyImage.module.css    # [MODIFY] 新增 `.lazy[data-js]:not([data-loaded]) .img { opacity: 0 }`：JS 环境下加载完成前隐藏图像素；无 JS 回退不受影响
│   └── HomeConsole.module.css  # [MODIFY] 跨列规则改限定区间 `@media (min-width: 721px) and (max-width: 1050px)`；`.cards` 单列与 `grid-column: auto` 两条规则从 680 块移入新的 `@media (max-width: 720px)`，消除 680–720px 错位带
└── changlog.md                 # [MODIFY] 顶部追加 2026-09-27 条目，记录三项修复
```
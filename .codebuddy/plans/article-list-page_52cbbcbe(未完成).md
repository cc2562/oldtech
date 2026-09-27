---
name: article-list-page
overview: 新增 /posts 文章列表页：展示全部文章，复用 ChannelKnob 旋钮按分类筛选（全部/技术/设计/生活），沿用 QueryTerminal 门控与 ArticleCard 卡片的现有交互与视觉，响应式适配移动端与桌面端，并同步更新站点导航。
design:
  architecture:
    framework: react
  styleKeywords:
    - 千禧年控制台
    - 深紫亮黄银铬
    - Win98 窗口
    - 终端检索
    - 实体旋钮
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 36px
      weight: 700
    subheading:
      size: 18px
      weight: 600
    body:
      size: 16px
      weight: 400
  colorSystem:
    primary:
      - "#f4ed18"
      - "#6d28d9"
      - "#c0c6d4"
    background:
      - "#0d0a1a"
      - "#171226"
    text:
      - "#f2f0e6"
      - "#9a94b8"
    functional:
      - "#f4ed18"
      - "#171226"
todos:
  - id: extract-shared-script
    content: 用 [subagent:code-explorer] 核对 HomeConsole/QueryTerminal 细节，提取共享 scriptFor/scriptKey 工具并更新引用
    status: pending
  - id: create-posts-page
    content: 新建 app/posts/page.tsx、components/PostsArchive.tsx 及样式模块，实现旋钮筛选与终端门控列表
    status: pending
    dependencies:
      - extract-shared-script
  - id: update-navigation
    content: SiteHeader 新增文章列表链接，详情页返回链接改为 /posts
    status: pending
    dependencies:
      - create-posts-page
  - id: verify-and-document
    content: 运行 typecheck 与 build 验证，检查响应式与减少动态效果，更新 changlog.md
    status: pending
    dependencies:
      - update-navigation
---

## 用户需求

在项目现有「千禧年控制台」架构上，新增文章列表页面 `/posts`：展示全部文章的完整列表，复用项目中已有的四档频道旋钮（全部/技术/设计/生活）实现按分类筛选；筛选状态可切换并实时更新列表，结果以文字告知；视觉风格与操作体验与现有页面保持一致；兼顾移动端与桌面端响应式布局。

## 产品概述

NEON / NOTES 是一座千禧年控制台主题的个人信号站博客。当前已有首页 `/`、组件展台 `/components`、文章详情 `/posts/[slug]`，缺少一个汇总所有文章的归档列表入口。本任务补齐这一页面，并从站点导航和详情页返回链接将其接入浏览动线。

## 核心功能

- 文章列表页 `/posts`：以 Win98 窗口化卡片网格展示全部文章（当前 4 篇演示数据）
- 分类筛选：沿用 `ChannelKnob` 四档旋钮，支持点击档位、拖动指针、键盘方向键/Home/End，默认「全部」
- 实时更新：切换档位后按 `post.category` 过滤，经 `QueryTerminal` 检索终端门控后卡片淡入；已播放过的频道脚本直接显示完成态
- 结果告知：终端结果行与状态读数以文字展示当前频道与文章数量
- 导航接入：`SiteHeader` 新增「文章列表」链接；详情页返回链接指向 `/posts`
- 响应式：桌面多列网格、平板两列、移动端单列，320px 起无横向溢出，遵守 prefers-reduced-motion

## 技术栈

- 沿用现有栈：Next.js App Router + React + TypeScript + CSS Modules + 原生 CSS 变量（`app/globals.css`），不使用 Tailwind
- 数据层零改动：直接消费 `lib/posts.ts` 的 `posts` 与 `PostSummary`（`category` 字段关联分类筛选）
- 复用组件：`ChannelKnob`、`QueryTerminal`（含 `hasQueryPlayed` 缓存）、`ArticleCard`、`RetroWindow`

## 实现方案

- **路由结构**：新建服务端组件 `app/posts/page.tsx`，从 `lib/posts.ts` 导入 `posts` 传入客户端组件 `PostsArchive`（与首页 `app/page.tsx` → `HomeConsole` 的分层一致），并导出页面 `metadata`。
- **筛选交互**：`components/PostsArchive.tsx`（`"use client"`）复刻 `HomeConsole` 已验证的模式——`channel`/`ready` 双 `useState`；`handleChannelChange` 中通过 `hasQueryPlayed(scriptKey(next))` 决定跳过动画；`visiblePosts = channel === "全部" ? posts : posts.filter(p => p.category === channel)`。脚本生成函数 `scriptFor(channel)` 从 HomeConsole 中提取为共享工具（如在 `QueryTerminal.tsx` 或 `lib` 中导出），供两个页面复用，避免复制粘贴。
- **门控与样式**：`components/PostsArchive.module.css` 复用 `.journalBody[data-ready]` 淡入门控模式；卡片网格沿用 `.cards { repeat(3, minmax(0,1fr)) }` 范式并定义平板两列、移动单列断点（参照 `HomeConsole.module.css` 现有断点）；分区容器用 `RetroWindow`，旋钮使用现有 `compact` 变体置于窗口标题区。
- **导航与动线**：`components/SiteHeader.tsx` 在首页与组件展台之间插入「文章列表 02」链接（后续编号顺延）；`app/posts/[slug]/page.tsx` L27 返回链接由 `/#journal` 改为 `/posts`，PJAX 转场系统自动接管新链接，无需额外接线。
- **性能与可靠性**：列表仅 4 条演示数据，过滤 O(n) 无瓶颈；`hasQueryPlayed` 模块级缓存避免重复播放；减少动态效果下终端直出全文、卡片直接可见；无新增环境变量或数据依赖。

## 架构与目录

```
c:/dev/oldtech/
├── app/
│   └── posts/
│       ├── page.tsx              # [NEW] 服务端组件：导入 posts，渲染 PostsArchive，导出 metadata
│       └── [slug]/page.tsx       # [MODIFY] 返回链接 /#journal 改为 /posts
├── components/
│   ├── PostsArchive.tsx          # [NEW] 客户端列表组件：channel/ready 状态、ChannelKnob(compact)、QueryTerminal 门控、ArticleCard 网格
│   ├── PostsArchive.module.css   # [NEW] 页面样式：RetroWindow 布局、data-ready 门控、3/2/1 列响应式网格
│   ├── SiteHeader.tsx            # [MODIFY] nav 新增「文章列表」链接及编号
│   ├── QueryTerminal.tsx         # [MODIFY] 导出共享 scriptFor/scriptKey（若尚未导出），供首页与列表页复用
│   └── HomeConsole.tsx           # [MODIFY] 改为引用共享 scriptFor，行为不变
└── changlog.md                   # [MODIFY] 记录新页面
```

数据流：旋钮 onChange → channel state → visiblePosts 过滤 → QueryTerminal 脚本 → onComplete → ready → 卡片网格淡入。

## 实施注意事项

- 不引入新组件库、不改 `PostSummary` 接口与数据层；列表页不使用 featured 大卡片变体，统一普通卡片（首页保留精选窗）。
- 空结果防御：某分类无文章时显示终端风格占位文字（如 `0 records`），防止渲染异常。
- 遵循 `AGENTS.md`：改动 Next.js 路由前查阅 `node_modules/next/dist/docs/` 中 App Router 相关说明。
- 验收：`npm run typecheck` 与 `npm run build` 通过；检查 320px/375px/平板/桌面及 prefers-reduced-motion。

## 设计说明

严格继承项目既有的「千禧年控制台」设计体系（design-style.md / design-constraints.md），不做新视觉探索。

## 页面结构（/posts）

- **页面头部**：面板编号 + 大标题「文章档案 ARCHIVE」与等宽字体副标题，说明为演示内容；沿用首页分区窗口的铬边框语言。
- **频道控制区块**：`RetroWindow`（如 `CHANNEL_CTRL.EXE`）内嵌 `ChannelKnob compact` 四档旋钮与文字刻度，状态读数行以文字显示当前频道与结果数量。
- **检索终端**：`QueryTerminal` 逐字打出 `open archive.db → query --channel=… → hydrate cards`，完成后门控列表显示；已播放频道直接呈现完成态。
- **文章网格**：Win98 窗口化 `ArticleCard` 三列网格（平板两列、移动单列），悬停故障抖动与信号黄高亮；整卡链接至详情页。
- **页脚**：沿用全站终端化页脚，无需改动。

## 响应式与可用性

桌面 3 列、≤1100px 平板 2 列、≤680px 单列；旋钮与终端在小屏自然堆叠；320px 起无横向溢出；键盘焦点可见；减少动态效果时动画关闭、内容直接可读。

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：实施前快速核对 `HomeConsole.tsx`、`QueryTerminal.tsx`、`SiteHeader.tsx` 的最新代码与断点，确认 scriptFor 提取位置及响应式细节
- 预期结果：获得精确行号与代码片段，确保复用与抽取不引入行为回归
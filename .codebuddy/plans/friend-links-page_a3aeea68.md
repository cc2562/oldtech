---
name: friend-links-page
overview: 新增 /links 友情链接页面，包含博主个人介绍卡片（纯色占位头像、昵称、简介、社交链接）与友链列表卡片（图标、名称、描述、跳转链接），复用千禧年控制台视觉体系并保持响应式布局；同步更新导航、组件展台与文档。
design:
  architecture:
    framework: react
  styleKeywords:
    - 千禧年控制台
    - Win98 窗口化
    - 深紫 + 亮黄 + 银铬
    - 拟物交互
    - 故障微动效
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 32px
      weight: 700
    subheading:
      size: 18px
      weight: 600
    body:
      size: 16px
      weight: 400
  colorSystem:
    primary:
      - "#F4ED18"
      - "#8244C7"
    background:
      - "#0E0A18"
      - "#F4F0FB"
    text:
      - "#F4F0FB"
      - "#0E0A18"
    functional:
      - "#F4ED18"
      - "#8244C7"
todos:
  - id: create-links-data
    content: 新建 lib/links.ts，定义 FriendLink/SocialLink 类型与 DEMO 演示数据
    status: completed
  - id: build-cards
    content: 实现 AuthorCard 与 LinkCard 组件及 CSS Modules 样式（含响应式与焦点态）
    status: completed
    dependencies:
      - create-links-data
  - id: create-links-page
    content: 创建 app/links/page.tsx 页面：Metadata、页面头部与两大区块组装
    status: completed
    dependencies:
      - build-cards
  - id: update-nav-showcase
    content: 更新 SiteHeader 导航（友情链接 03、展台顺延 04）并在组件展台新增友链卡片区
    status: completed
    dependencies:
      - create-links-page
  - id: docs-and-verify
    content: 更新 README/design-style/changlog 文档，运行 typecheck 与 build 验证
    status: completed
    dependencies:
      - update-nav-showcase
---

## 用户需求

为 NEON / NOTES 个人博客（千禧年控制台风格）新增一个友情链接页面，包含博主个人介绍卡片与友情链接列表，与现有界面视觉风格一致并支持响应式布局。

**用户修订（2026-09-27）**：友链部分不要每张卡片都是独立的 Win98 窗口；改为**一个完整的 Win98 窗口，内部模拟浏览器组件**（地址栏、标签页、视口），友链以类似网页中的卡片形式展示在浏览器视口内。卡片悬停时亮黄高亮 + 短暂故障抖动（位移/色差/扫描线），focus-visible 有可见焦点框。

## 产品概述

在现有 Next.js 博客 Demo 中新增 `/links` 路由页面。页面上部为博主个人介绍卡片，下部为「模拟浏览器」窗口承载的友链卡片网格。全站导航同步加入「友情链接 03」入口，组件展台顺延为「04」。页面内容（头像、社交链接、友链站点）全部为演示数据，明确标注 DEMO，后续可替换。

## 核心功能

- **博主个人介绍卡片**：展示纯色占位头像（配铬边框与状态灯装饰，后续可替换为真实图片）、博主昵称（取自 `lib/site.ts` 的 author）、个人简介（取自 site.description），以及一排社交链接（GitHub、邮箱、RSS 等演示项），社交链接以拟物小按钮形式呈现，新窗口打开。
- **模拟浏览器友链窗口**：一个完整的 Win98 大窗口（渐变标题栏 `FRIEND_LINKS.EXE` + 装饰窗口按钮），内部结构模拟旧式浏览器——标签页条（如 `RELAY_NET` 单标签激活态）、地址栏（`http://neon-notes.local/links` 只读读数窗 + 刷新/前进后退装饰按钮）、视口内容区（凹陷面板背景）。友链卡片以「网页卡片」风格排列在视口内：图标色块 + 站点名 + 描述 + 域名行，整卡为 `<a target="_blank" rel="noopener noreferrer">` 新窗口打开。
- **卡片交互**：悬停时亮黄高亮 + 短暂故障抖动（位移/色差/扫描线），focus-visible 有可见焦点框；减少动态效果下动画自动压平。
- **视觉一致性**：页面复用 `RetroWindow` 窗口容器与 `globals.css` 设计变量，保持深紫 + 亮黄 + 银铬主题、近直角斜切、等宽字体元信息；动效遵守 `prefers-reduced-motion`。
- **响应式布局**：桌面多列网格，平板两列，移动单列；320px 起无横向溢出；焦点可见、键盘可达。
- **导航与展台同步**：Header 导航插入友情链接项；组件展台新增友链卡片示例区；文档（design-style.md、changlog.md、README.md）同步更新。

## 技术栈

- Next.js App Router + React + TypeScript（沿用现有项目栈，不新增依赖）
- CSS Modules + `app/globals.css` 原生 CSS 设计变量；不使用 Tailwind CSS
- 页面为静态服务端渲染组件，无需客户端状态

## 实现方案

- **数据层**：按 `lib/posts.ts` 的既有模式新建 `lib/links.ts`，定义 `FriendLink` 与 `SocialLink` 类型及演示数据数组（标注 DEMO）。博主身份复用 `lib/site.ts`，不重复硬编码。
- **组件层**：新建三个纯展示组件（成对 .tsx + .module.css）：
- `AuthorCard`：博主介绍卡片。
- `LinkBrowser`：模拟浏览器窗口（Win98 外壳 + 标签页条 + 地址栏 + 视口），接收 `FriendLink[]` 渲染视口内的网页卡片网格。
- `LinkCard`：视口内的单个网页卡片（图标色块、名称、描述、域名行、DEMO 角标），卡片皮肤为「网页内卡片」而非 Win98 窗口——近直角、细描边、深底浅字，区别于外层窗口的金属边框，体现「窗口 > 浏览器 > 网页卡片」的层级轻重关系。
- **页面层**：`app/links/page.tsx` 导出 Metadata（title 友情链接）并组装页面头部（`LINKS.SYS // PANEL 03 · DEMO DATA` 风格）+ `AuthorCard` 区块 + `LinkBrowser` 区块。
- **外链**：全部使用原生 `<a target="_blank" rel="noopener noreferrer">`，不经过 PJAX；演示友链指向真实可访问页面并带 DEMO 角标。
- **头像**：CSS 纯色占位块（信号黄/紫渐变面板 + 铬边框 + `NO SIGNAL` 或昵称首字符装饰文字 + 状态灯），预留容器结构便于日后换成 `<Image>`。
- **导航**：修改 `components/SiteHeader.tsx`，插入「友情链接 03」（`pathname === "/links"` 判定 aria-current），组件展台改为 04。
- **展台**：`app/components/page.tsx` 新增第 10 区「友链卡片」，展示 `LinkCard` 单个示例及说明文字（可附 `LinkBrowser` 缩略演示）。

## 实现要点

- 故障动效仅在 `:hover`/`focus-visible` 上叠加，减少动态效果下由全局规则压平（沿用现有 globals.css 约定）。
- 视口内卡片网格使用 CSS Grid `repeat(auto-fill, minmax(...))`；卡片内容用 `min-width: 0` 防止长 URL/描述撑破 320px 宽度。
- 重要信息（站点名、描述、DEMO 标注）一律用文字表达，不依赖颜色或图标单独传达；社交按钮带 `aria-label`。
- 浏览器模拟组件为纯装饰结构：地址栏不可编辑（或只读 `<input>`），前进/后退/刷新为装饰按钮（`aria-hidden` 或禁用态并文字标注装饰用途），不拦截真实导航。
- 性能：纯静态渲染，无额外客户端 JS 成本；无图片资源加载。
- 验证：完成后运行 `npm run typecheck` 与 `npm run build`（应产出静态 `/links` 路由）。

## 目录结构

```
oldtech/
├── app/
│   ├── links/
│   │   └── page.tsx              # [NEW] /links 页面：Metadata + 页面头部 + AuthorCard 区块 + LinkBrowser 区块
│   └── components/
│       └── page.tsx              # [MODIFY] 展台新增第 10 区「友链卡片」，展示 LinkCard/LinkBrowser 示例与说明
├── components/
│   ├── AuthorCard.tsx            # [NEW] 博主介绍卡片：占位头像、昵称、简介、社交链接按钮组
│   ├── AuthorCard.module.css     # [NEW] 头像占位面板、铬边框、状态灯、社交按钮行样式（含响应式与焦点态）
│   ├── LinkBrowser.tsx           # [NEW] 模拟浏览器窗口：Win98 标题栏 + 标签页条 + 地址栏 + 视口，渲染友链卡片网格
│   ├── LinkBrowser.module.css    # [NEW] 窗口外壳、标签页、地址栏读数窗、装饰按钮、视口凹陷面板样式
│   ├── LinkCard.tsx              # [NEW] 视口内网页卡片：图标色块、名称、描述、域名行、DEMO 角标；整卡 <a> 包裹
│   ├── LinkCard.module.css       # [NEW] 网页卡片皮肤、悬停亮黄高亮与故障微动效（位移/色差/扫描线）、焦点框、响应式
│   └── SiteHeader.tsx            # [MODIFY] 导航插入「友情链接 03」，组件展台顺延为 04
├── lib/
│   └── links.ts                  # [NEW] FriendLink、SocialLink 类型定义与演示数据数组（标注 DEMO）
├── README.md                     # [MODIFY] 页面说明补充 /links
├── design-style.md               # [MODIFY] 「页面范围」补充 /links 结构说明
└── changlog.md                   # [MODIFY] 新增 2026-09-27 变更条目
```

## 关键类型定义

```ts
// lib/links.ts
export interface FriendLink {
  id: string;          // 用于序号 FRIEND_001 等
  name: string;        // 站点名称
  description: string; // 一句话描述
  url: string;         // 外链（真实可访问）
  icon: string;        // 图标占位字符（如站点名首字母）
  isDemo?: boolean;    // DEMO 角标
}

export interface SocialLink {
  id: string;
  label: string;       // 平台名，如 GitHub
  handle: string;      // 账号/地址展示文本
  url: string;
  isDemo?: boolean;
}
```

## 设计风格

延续项目既定的「千禧年控制台」视觉体系（Y2K Futurism + Win98 窗口化 + 拟物反馈），不引入新视觉语言；组件不使用第三方组件库，全部为项目自研 CSS Modules 皮肤。

### 页面规划（单页 /links）

- **页面头部**：`LINKS.SYS // PANEL 03 · DEMO DATA` 面板编号 + 大标题「友情链接 / FRIEND LINKS」+ 记录数副标题（等宽字体，参考文章档案页头部）。
- **区块 01 · 博主卡片（OPERATOR_PROFILE.EXE）**：RetroWindow 窗口容器；左侧纯色占位头像面板（紫黄渐变底 + 铬 ridge 边框 + 状态灯 + `NO SIGNAL` 等宽标注），右侧昵称（大字号展示标题）、简介段落（16px 中文正文、1.65 行高）与一排拟物社交按钮；移动端上下堆叠。
- **区块 02 · 模拟浏览器友链窗口（FRIEND_LINKS.EXE）**：单个完整 Win98 窗口——渐变标题栏（✦ + `FRIEND_LINKS.EXE` + 装饰窗口按钮）；窗口体内自上而下：标签页条（`RELAY_NET ✕` 激活标签 + 凹陷背景轨道）、工具行（前进/后退/刷新装饰按钮 + 地址读数窗 `http://neon-notes.local/links` + `DEMO` 角标）、视口凹陷面板（深色底）；视口内为「网页卡片」网格——图标色块 + 站点名 + 描述 + 域名行，卡片样式与外层窗口拉开层级（细描边、深色面板底、无金属边框）。悬停：亮黄高亮 + 故障抖动（位移/色差/扫描线）；focus-visible 可见焦点框。
- **页脚衔接**：沿用全站终端化页脚，无需改动。

### 响应式

桌面视口内卡片 2–3 列网格，平板 2 列，≤680px 单列；博主卡片桌面左右分栏、移动上下排列；地址栏文字可截断（ellipsis），320px 无横向溢出。
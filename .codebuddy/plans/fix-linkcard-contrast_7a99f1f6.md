---
name: fix-linkcard-contrast
overview: 修复 LinkCard 默认状态下文字过深不可见的问题：卡片显式声明浅色文字，并提亮次要信息色，保证非悬停态可读性。
todos:
  - id: fix-card-colors
    content: 修复 LinkCard.module.css 默认态文字与边框对比度
    status: completed
  - id: verify-build
    content: 运行 typecheck 与 build 并在预览中确认可读性
    status: completed
    dependencies:
      - fix-card-colors
---

## 用户需求

修复 /links 页面友链卡片在默认（非悬停）状态下文字颜色过深、几乎不可读的问题。用户截图显示：`FRIEND_XXX.URL` 文件号与站点名完全看不见，描述与域名行也偏暗。

## 产品概述

仅调整友链卡片（LinkCard）的文字配色，使卡片在深紫视口背景上默认态即清晰可读；悬停态的亮黄高亮与故障动效保持不变。

## 核心功能

- 卡片标题（站点名）默认态为浅色可读，悬停时仍切换为信号黄
- 文件号、描述、域名行等次要文字提亮到可读亮度
- 卡片边框在非悬停态保持足够对比
- 不改动任何结构、布局与动效行为

## 技术方案

### 问题根因（已在探查中定位）

- `components/LinkBrowser.module.css` 的 `.browser` 为配合 Win98 银灰窗口面板设置了 `color: #1b1324`（深紫黑，供标签页/工具栏等浅色底区域使用）。
- `components/LinkCard.module.css` 的 `.card` 声明了 `color: inherit`，导致卡片整体继承深色文字；其中 `.name`（h3 站点名）未单独设色，直接继承深色，在深底卡片上不可见。
- 次要文字虽有设色但偏暗：`.fileNo` 用 `var(--muted)`（#b6a9c8）、`.domain` 用 #9d8db3。

### 实现方式

仅修改 `components/LinkCard.module.css` 一个文件，改色不改结构：

1. `.card`：`color: inherit` 改为显式 `color: var(--paper)`，切断对 `.browser` 深色文字的继承。
2. `.name`：显式设置 `color: #f1eaf8`（接近 --paper 的浅紫白），保证非悬停可读；既有 `.card:hover .name` 规则优先级更高，悬停仍切 signal 黄，不冲突。
3. 提亮次要文字：`.fileNo` 提亮至 #cbbddd；`.desc` 由 #d3c5e0 微调至 #ddd0e8；`.domain` 由 #9d8db3 提亮至 #b3a3c9。
4. 卡片边框默认色 `var(--line-strong)`（#8a6ca080）在截图中可见但偏弱，提亮一档为 #8a6ca0b3，保持默认态轮廓可辨，悬停态仍为 signal 黄。

### 约束与验证

- 不改 DOM 结构、不改悬停/故障动效；减少动态效果行为不变；无性能影响（纯静态色值调整）。
- 验证：`npm run typecheck` 与 `npm run build`，并在预览中确认默认态可读。

## 目录结构

```
oldtech/
└── components/
    └── LinkCard.module.css   # [MODIFY] 修复默认态文字对比度：卡片显式浅色文字、提亮次要信息与边框；悬停规则不变
```
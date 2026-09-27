---
name: detail-layer-spacing
overview: 增大文章详情页正文层与评论层之间的堆叠间距，让读者在评论层滑入遮挡前有充足空间读完正文，同时保持分层堆叠交互与失焦故障动画不变。
design:
  architecture:
    framework: react
  styleKeywords:
    - Y2K 控制台
    - Win98 分层窗口
    - 克制的阅读节奏
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 32px
      weight: 600
    subheading:
      size: 18px
      weight: 500
    body:
      size: 16px
      weight: 400
  colorSystem:
    primary:
      - "#F4ED18"
      - "#8244C7"
    background:
      - "#0D0A14"
      - "#160E22"
    text:
      - "#F8F6FF"
      - "#BDAFCB"
    functional:
      - "#F4ED18"
      - "#B78AF0"
todos:
  - id: add-body-layer-spacing
    content: 在 PostLayerStack.module.css 为正文层（data-layer=1）添加 enhanced 模式 padding-bottom 与回退模式段间距
    status: completed
  - id: verify-layer-behavior
    content: 核对 measure/evaluate 无需改动，确认移动端 clamp 缩放与无 JS 回退表现
    status: completed
    dependencies:
      - add-body-layer-spacing
  - id: update-changelog-typecheck
    content: changlog.md 顶部追加条目并运行 npm run typecheck 验证
    status: completed
    dependencies:
      - verify-layer-behavior
---

## 用户需求

文章详情页第三部分（评论 ECHO_BOARD）与第二部分（正文 SIGNAL_BODY）之间间距太小：正文层高于视口时按底边吸附，评论层紧随其后就上滑遮挡，导致"文章还没读完就被评论覆盖了"。需要在评论层滑入前给读者留出充足的阅读余量。

## 产品概述

NEON / NOTES 个人博客的文章详情页采用 PostLayerStack 分层堆叠滚动：封面、正文、评论三层依次吸附在悬浮 Header 下方，下一层上滑遮挡上一层，被遮层切换为 Win98 失焦灰白态并播放故障动画。

## 核心功能

- 正文层与评论层之间增加一段随视口缩放的间距，使正文结尾在被遮挡前能完整停留在可视区域内
- 评论层在文档流中更晚到达，延迟遮挡与失焦翻转的发生时机
- 不改变封面→正文之间的现有间距与分层堆叠交互、故障动画
- 无 JS 回退的普通文档流下间距视觉合理；≤600px 移动端间距随视口高度缩放，不出现过大空白

## 技术栈

- Next.js 16 App Router + React 19 + TypeScript + CSS Modules（无 Tailwind）
- 目标组件：`components/PostLayerStack.tsx` + `PostLayerStack.module.css`（已读确认）

## 实现思路

问题根源：三个 `.layer` 在文档流中首尾相接零间距；正文层高于视口时 `measure()` 按 `top = innerHeight - el.offsetHeight` 直写底边吸附，正文结尾最高只能到视口底边，评论层立即上滑遮挡。

方案（纯 CSS，首选，零 JS 改动、零运行时开销）：给正文层（`.layer[data-layer="1"]`）增加 `padding-bottom`——

1. `offsetHeight` 计入 padding，`measure()` 无需改动即自动把正文层顶得更靠上，正文结尾抬升到视口底边之上；
2. 评论层在文档流中相应延后，遮挡与 `data-state="covered"` 失焦翻转自然推迟（`evaluate()` 的 lead 逻辑不受影响）；
3. padding 位于 `.layer` 上、`.layerInner` 之外，不影响失焦灰白滤镜与遮挡投影 `box-shadow: 0 -26px 48px` 的现有表现。

间距取值：enhanced 模式下 `padding-bottom: clamp(160px, 32vh, 340px)`，随视口高度缩放，移动端自动变小；非 enhanced（无 JS 回退）仅保留一个普通段间距（约 26px，与站内现有 `.coverWindow { margin-bottom: 26px }` 节奏一致），避免普通文档流中出现巨大空白。封面层（data-layer="0"）不动。

备选方案评估：`margin-bottom` 不计入 `offsetHeight`，只能延迟遮挡、不能抬升正文结尾，单独使用不能完整解决"没读完就被盖住"，故不采用为主方案。

## 实现注意

- 只改 CSS Module，TSX 零改动，typecheck 即可验证；不触碰 `measure()`/`evaluate()` 逻辑，回归面最小
- `data-init` 首帧压平动画、减少动态效果等全局规则均不受影响
- 按项目惯例在 changlog.md 顶部追加变更条目

纯间距修正，不改变视觉风格：保持深紫 + 亮黄 + 银铬的千禧年控制台主线与 Win98 分层窗口交互不变，仅拉开正文层与评论层的堆叠距离，让遮挡投影出现前正文已被读完。CSS Modules 实现，无组件库依赖。
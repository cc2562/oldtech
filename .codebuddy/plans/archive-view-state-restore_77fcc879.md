---
name: archive-view-state-restore
overview: 让文章档案页在从文章详情返回时保留浏览位置：把「当前频道 + 已加载条数」提升为模块级视图状态（与 QueryTerminal 的 playedScripts 同范式），返回列表时按原样恢复（含已加载更多的批次），并做数据/批次大小变化时的钳制。
todos:
  - id: archive-view-store
    content: 在 PostsArchive 模块作用域新增「频道 + 已加载条数」视图状态与读写函数，保持首帧为首批（避免水合不匹配），并在挂载后 useEffect 中恢复状态、同步 ready
    status: completed
  - id: clamp-and-writeback
    content: 恢复值做频道合法性校验与条数钳制（不小于批次大小、不超过该频道条数，pending 不恢复），并在频道切换与批次完成时写回模块状态
    status: completed
    dependencies:
      - archive-view-store
  - id: home-channel-restore
    content: 可选增强：HomeConsole 的频道选择复用同一模块级状态，从文章返回首页时恢复上次频道
    status: completed
    dependencies:
      - clamp-and-writeback
  - id: typecheck-changelog
    content: 运行 npm run typecheck，并在 changlog.md 顶部追加本次修复条目（含硬刷新重置的取舍说明）
    status: completed
    dependencies:
      - clamp-and-writeback
  - id: verify-browser-return
    content: 用 [skill:playwright-cli] 实测「加载更多两次 → 进入文章 → 后退返回」链路，断言条数与读数保持、终端不重播，并覆盖切换频道往返与硬刷新场景
    status: completed
    dependencies:
      - typecheck-changelog
---

## 需求概述

文章档案页（`/posts`）在点击「加载更多」展开多批文章后，进入任意文章详情再返回列表时，已展开的批次会丢失，列表退回只有第一批的状态。需要让返回列表时恢复用户离开前的浏览位置。

## 核心功能

- 从文章详情返回档案页时，恢复离开前**已加载的条数**（例如离开前已显示 6 条，返回后仍是 6 条，而不是回到 2 条）
- 同时恢复离开前**选中的频道**（全部 / 技术 / 思想 / 生活），频道读数、LED 显示屏与筛选结果与离开前一致
- 「已显示 N / M 条记录」读数、剩余条数与「加载更多」按钮状态随恢复结果正确同步
- 返回时不再重放检索终端的打字动画（与现有「已浏览过的频道只呈现终态」行为一致）
- 边界处理：后台把「档案页每批条数」改小或改大、文章总数减少、记录值异常时，恢复结果需安全收敛，不出现空白列表或越界
- 已知取舍：状态仅在同一标签页的站内客户端导航间保留；浏览器硬刷新（F5）后回到列表仍从第一批开始

## 技术栈

沿用项目现状：Next.js 16 App Router + React 19 + TypeScript + CSS Modules（不使用 Tailwind）。**不新增任何依赖**，不改动数据库与 Payload 模型，不需要迁移。

## 实现思路

采用与项目既有范式一致的**模块级视图状态**，在客户端导航往返中保留列表浏览位置。

已核实的链路：

- 站内跳转由 `components/PjaxProvider.tsx` 接管（第 99 行 `router.push(href)`，第 143-150 行处理前进后退），属客户端导航，不会整页刷新。
- `components/PostsArchive.tsx` 的浏览状态是组件内 state，返回时组件重新挂载即归零：第 37 行 `useState<Channel>("全部")`、第 39 行 `useState(size)`；第 43 行 `visiblePosts = filteredPosts.slice(0, shown)`；第 47-54 行频道切换会 `setShown(size)`；第 61-64 行批次完成累加 `size`。
- 项目已有同范式先例：`components/QueryTerminal.tsx` 第 27-36 行的模块级 `const playedScripts = new Set<string>()` 与 `hasQueryPlayed(key)`，注释明确说明「从文章返回或重新选择看过的频道时直接呈现终态」——证明模块级状态在同一标签页的 PJAX 往返中确实被保留。全仓未使用 sessionStorage / localStorage（已搜索确认 0 处），因此不引入新的持久化机制。

关键设计决策：

1. **用水合后副作用恢复，而不是 `useState` 惰性初始化**。服务端渲染时模块状态为空，若首帧就渲染恢复后的条数，会与服务端产出的第一批 HTML 不一致，触发 React 水合不匹配告警。做法：首帧仍渲染第一批（与 SSR 一致），在挂载后的 `useEffect` 中读取模块状态并恢复频道、条数与 ready，代价是首帧到恢复之间存在一次极短的列表长度变化，视觉上由既有的终端揭示与淡入过渡覆盖。
2. **恢复值必须钳制**：频道需通过 `components/ChannelKnob.tsx` 导出的 `channels` 数组校验（非法值回退「全部」），条数取「不小于当前批次大小、且不超过该频道实际条数」的区间收敛；`pending`（进行中的批次）不恢复，避免返回后卡在「读取中…」。
3. **`ready` 跟随恢复后的频道**：第 38 行的初值按「全部」计算，若恢复成「技术」而 ready 仍按「全部」，会出现终端重播或列表闪烁；恢复时应一并按目标频道调用 `hasQueryPlayed(scriptKey(channel, scriptOptions))`。
4. **加载更多的终端动画无需额外处理**：批量脚本 key 含 offset/limit，离开前已播放过，`playedScripts` 会直接给出终态，不会重播打字动画（需在验证中确认）。
5. 首页 `components/HomeConsole.tsx` 的频道选择同样是组件内 state（第 20 行附近），从文章返回首页也会重置为「全部」——可用同一模块级机制恢复频道，作为同源问题的可选增强（首页无分批加载，影响面仅限频道选择）。

被否决的备选方案：`sessionStorage`（能跨硬刷新保留，但引入序列化与存储读写，偏离项目既有内存范式）；URL 查询参数承载条数（会改变地址、需 `router.replace`、影响分享与回退语义，改动面更大）。

## 实现注意事项

- 模块级状态只在同一标签页的客户端导航间有效；SSR 首帧始终是第一批，属预期行为。
- 恢复逻辑只在挂载时执行一次；后续频道切换与批次完成照常写回模块状态，保持读写一致。
- 不改动 `QueryTerminal`、`PostRow`、`HoverCoverPreview` 与样式；不改动分页脚本内容与 `playedScripts` 语义。
- 不影响 320px 布局与减少动态效果路径（本次不新增动画，钳制逻辑为纯计算）。
- 完成后按项目惯例运行 `npm run typecheck`（用户此前取消过 `npm run build`，不主动运行），并在 `changlog.md` 顶部按 `## 2026-09-28 — 标题` 格式追加条目；本次属交互修复，README 无需改动。

## 目录结构

```
oldtech/
├── components/
│   ├── PostsArchive.tsx        # [MODIFY] 模块作用域新增视图状态（频道 + 已加载条数）与读写函数；useState 保持首批初值（避免水合不匹配），新增挂载后 useEffect 恢复频道/条数并同步 ready；在 handleChannelChange 与 handleBatchReady 中写回状态；恢复值做频道校验与条数钳制（不小于批次大小、不超过该频道实际条数），pending 不恢复
│   ├── HomeConsole.tsx         # [MODIFY][可选] 频道选择复用同一模块级状态，从文章返回首页时恢复上次频道；如不需要可省略
│   └── ChannelKnob.tsx         # [READ] 复用导出的 channels 数组做频道合法性校验，不改动
└── changlog.md                 # [MODIFY] 顶部追加条目：说明返回列表恢复已加载条数与频道、硬刷新重置的取舍
```

## 验证方式

- `npm run typecheck` 通过。
- 浏览器端到端（用 playwright-cli 按顺序断言）：打开 `/posts` → 点「加载更多」两次（读数应变为「已显示 6 / N 条记录」）→ 点击某一行进入文章详情 → 浏览器后退返回 `/posts` → 断言行数与读数仍为「6 / N」、且检索终端无打字动画重播；再切到「技术」频道后重复上述往返，断言频道与已加载条数一并恢复；最后硬刷新（F5）确认回到第一批（符合预期取舍）。

## Agent Extensions

### Skill

- **playwright-cli**
- Purpose: 在实现完成后驱动浏览器实测完整链路——档案页「加载更多」若干次、进入文章详情、浏览器后退返回，读取实际行数、读数文本与终端状态，并覆盖「切换频道后往返」与「硬刷新回到首批」两种场景。
- Expected outcome: 得到可核对的逐项断言结果，确认返回列表时已加载条数与频道均被恢复、终端不重播打字动画，且硬刷新行为符合预期取舍。
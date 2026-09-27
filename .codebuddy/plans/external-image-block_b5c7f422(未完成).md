---
name: external-image-block
overview: 为文章正文编辑器新增「外部图片」区块（粘贴 HTTP(S) 图片 URL + 替代文本即可插入），前台由 LazyImage 渲染：限宽在正文内容宽度内、保持原始比例、懒加载、加载完成后直接出现，与现有正文插图表现一致。
todos:
  - id: editor-block
    content: 在 payload.config.ts 新增 external-image 区块定义并通过 BlocksFeature 注入全局 lexicalEditor
    status: pending
  - id: lazyimage-natural
    content: 为 LazyImage 增加 layout="natural" 模式（自然高度、占位符可见）及对应 CSS
    status: pending
  - id: converter-render
    content: 在详情页 proseConverters 增加 blocks['external-image'] 转换器，复用 LazyImage 与 .proseImage 渲染
    status: pending
    dependencies:
      - editor-block
      - lazyimage-natural
  - id: docs-typecheck
    content: 更新 changlog.md 说明后台插入外部图片的步骤并运行 npm run typecheck 验证
    status: pending
    dependencies:
      - converter-render
---

## 产品概述

为博客文章正文增加「外部图片」能力：后台编辑文章时可插入一张外链图片（填写 HTTP(S) 图片地址与替代文本），前台按现有正文插图的视觉与加载方式呈现，无需把图片上传到本站媒体库，也无需数据库迁移。

## 核心功能

- 后台文章正文编辑器新增可插入的「外部图片」区块，包含：图片地址（必填，校验为 HTTP(S) 链接）、替代文本（选填，建议填写）
- 前台渲染与现有正文插图一致：限宽在正文内容宽度内、保持原始宽高比、懒加载、加载完成后直接出现（无故障切入动画）
- 外链图片请求不带来源页（避免部分站点的防盗链拦截），加载中的代码式占位符沿用全站统一样式
- 支持粘贴 avif / webp 等现代格式外链（浏览器原生支持范围内）
- 图片地址缺失或非法时前台不渲染任何内容，不产生空白占位

## 使用方式（交付后的后台操作）

文章编辑器工具行选择「外部图片」区块 → 粘贴图片地址（如 `https://world.ccrice.com/usr/uploads/2026/05/69ff4280f333f.avif`）→ 填写替代文本 → 保存发布。Markdown 语法 `![alt](url)` 在本站后台不会生效（后台为 Lexical 富文本，非 Markdown 编辑器）。

## 技术栈选择

沿用项目现状，不引入新依赖：Next.js 16 App Router + React 19 + TypeScript + CSS Modules（项目约束明确不使用 Tailwind）+ Payload CMS 3.90.2 / @payloadcms/richtext-lexical 3.90.2 + PostgreSQL。

## 实现思路

后台正文使用全局 Lexical 编辑器（`payload.config.ts` 中 `editor: lexicalEditor()`），`body` 字段为 `richText` 且未指定字段级 editor，因此**在全局 editor 中注入区块功能即可对文章正文生效**。Lexical 的区块数据存放在 richtext JSON 内，不改变数据库 schema，无需迁移。

三步落地：

1. **后台**：用 `BlocksFeature` 注册一个 `external-image` 区块（字段 `url` + `alt`）；`editor` 改为 `features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [ExternalImageBlock] })]`。
2. **前台**：在详情页已有的 `proseConverters`（`JSXConvertersFunction`）中增加 `blocks: { 'external-image': ... }` 转换器，复用现有 `LazyImage` 渲染，样式复用 `.proseImage`。
3. **组件补强**：`LazyImage` 当前 wrapper 为 `display:block`，内部 img 为 `position:absolute; inset:0`——上传插图靠 Payload 返回的 width/height 生成内联 `aspect-ratio` 提供高度。外链图片无法预知尺寸，若直接复用会导致 wrapper 高度塌陷为 0（占位符与图片均不可见）。因此为 `LazyImage` 增加 `layout="natural"` 模式：wrapper 保持 `display:block` 并给最小高度使占位符可见，img 回到文档流内按自然尺寸渲染（居中、`max-width:100%`），加载完成后 wrapper 高度即为图片实际高度。

关键决策与理由：

- **不使用 Markdown 图片语法**：后台是 Lexical 富文本编辑器，不支持 `![alt](url)`；改造成本高且与项目「结构化富文本」方向不符。
- **不把外链图片经服务端代理**：会引入抓取、缓存、鉴权与存储成本，超出本次需求；外链失效风险在区块中由「替代文本 + 前台不渲染损坏图」缓解。
- **`referrerPolicy="no-referrer"`**：沿用项目已有先例（友链图标 `components/LinkCard.tsx`），降低外链站点防盗链拦截概率。
- **`effect="none"`**：与用户确认的「加载完成直接出现」一致，文章页不播放故障切入，保持阅读区克制。
- **不做 aspect-ratio 预留**：外链无法获知宽高，接受轻微的加载后高度变化（有占位符最小高度兜底，视觉抖动有限）。

性能与可靠性：

- 图片仍走原生 `loading="lazy"`，与全站 LazyImage 策略一致，不额外增加主线程负担；`layout="natural"` 仅新增一个类名与少量 CSS，无运行时开销。
- 区块转换器对 `url` 做协议与空值校验，非法数据返回 `null`，避免输出损坏的 `<img>`。
- 外链图片失败时保留替代文本语义（`alt`），不放宽到渲染破图占位框。

## 实现注意

- 区块 slug 与转换器 key 必须完全一致（本方案统一为 `external-image`）；区块数据在 richtext JSON 内，**不要**为此新增数据库迁移。
- `LazyImage` 新增属性须为可选、默认值保持现有行为，避免影响已在使用的调用方（首页精选、卡片封面、详情封面、正文上传插图、悬浮预览、友链图标、站长头像、组件展台第 11 区）。
- `natural` 模式下不要给 img 加 `position:absolute`（否则高度依旧塌陷），占位符仍为绝对定位并置于其下（`z-index` 分层）。
- 新增区块后若 Payload 后台提示 importmap 相关错误，再执行 `npx payload generate:importmap`；不预先执行。
- 减少动态效果与旧浏览器行为：`natural` 模式只改布局，不新增动画；占位符显现依赖既有 `data-js/data-loaded` 机制，SSR 与无 JS 下图片正常显示。
- 完成后按项目惯例在 `changlog.md` 顶部追加条目，并运行 `npm run typecheck`（用户此前取消过 `npm run build`，不主动运行）。

## 架构设计

维持既有分层，不新增架构模式：CMS 配置（payload.config.ts）定义编辑器区块 → 前台详情页转换器把区块渲染为组件 → `LazyImage` 统一负责图片的懒加载与占位。

```mermaid
flowchart LR
  A[后台 Lexical 编辑器<br/>外部图片区块 url + alt] --> B[richtext JSON]
  B --> C[详情页 RichText + proseConverters]
  C --> D[LazyImage layout=natural<br/>effect=none]
  D --> E[正文内容宽度内渲染<br/>懒加载 + 代码占位符]
```

## 目录结构

```
oldtech/
├── payload.config.ts                                  # [MODIFY] 导入 BlocksFeature 与 Block 类型；新增 ExternalImageBlock（slug: external-image，字段 url 必填 + alt 选填）；editor 改为 lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [ExternalImageBlock] })] })
├── components/
│   ├── LazyImage.tsx                                  # [MODIFY] 新增可选属性 layout?: "fill" | "natural"（默认 "fill" 保持现状）；为 "natural" 追加类名并在无 width/height 时不生成 aspect-ratio 内联样式
│   └── LazyImage.module.css                            # [MODIFY] 新增 .natural 规则：wrapper 最小高度（占位符可见）；.natural .img 回到文档流 position:relative、width:auto、max-width:100%、height:auto、margin:0 auto、z-index:1
├── app/(frontend)/posts/[slug]/
│   └── page.tsx                                       # [MODIFY] proseConverters 增加 blocks['external-image'] 转换器：读取 node.fields.url/alt，校验 HTTP(S) 后返回 <LazyImage layout="natural" effect="none" referrerPolicy="no-referrer" className={styles.proseImage} />，非法或缺失时返回 null
└── changlog.md                                        # [MODIFY] 顶部追加 2026-09-27 条目：新增正文「外部图片」区块，说明后台插入方式与前台表现，并注明「推荐优先上传到媒体库」的理由
```

## 关键代码结构

区块定义（`payload.config.ts`，字段校验复用文件内已有 `optionalWebURL` 风格）：

```ts
const ExternalImageBlock: Block = {
  slug: 'external-image',
  labels: { singular: '外部图片', plural: '外部图片' },
  fields: [
    { name: 'url', label: '图片地址', type: 'text', required: true, maxLength: 1000,
      validate: (value: unknown) => { /* 仅允许 http/https，否则返回中文错误提示 */ } },
    { name: 'alt', label: '替代文本', type: 'text', maxLength: 200,
      admin: { description: '图片加载失败或不显示时的说明文字，建议填写。' } },
  ],
};
```

`LazyImage` 扩展（仅新增可选属性，签名兼容既有调用方）：

```ts
type LazyImageProps = {
  /* ...现有属性不变... */
  layout?: "fill" | "natural"; // "fill" 为默认，沿用绝对定位填充父容器
};
```
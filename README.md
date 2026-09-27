# NEON / NOTES — 个人博客

Next.js 16、React 19、TypeScript、CSS Modules 与 Payload CMS 组成的自托管博客。Payload 与前台运行在同一个 Next.js 应用中，PostgreSQL 保存内容，Lexical 编辑文章，图片存放在持久化目录。

项目文档：[变更记录](changlog.md) · [设计风格说明](design-style.md) · [设计规范与限制](design-constraints.md)

## 本地启动

需要 Node.js 20.9+、PostgreSQL，以及 npm。复制 `.env.example` 为 `.env.local`，填写 `DATABASE_URL`、至少 32 字节随机值的 `PAYLOAD_SECRET` 和独立的 `PREVIEW_SECRET`，把 `MEDIA_DIR` 指向可写的持久化目录。不要提交环境变量文件。

```bash
npm install
npm run db:migrate
npm run dev
```

首次启动前运行 `npm run db:migrate`，之后访问 `/admin` 创建管理员。数据库结构仅通过迁移维护，开发模式也不自动推送 schema。随后可以运行 `npm run seed:drafts`，将四篇旧演示文章、示例友链及评论导入为未公开参考内容；脚本可重复运行，不会重复创建同一文章或友链。演示内容不会自动出现在公开页面。

## 从 Typecho 迁移

`npm run import:typecho -- --file <Typecho 备份.dat>` 读取 Typecho 后台「备份」导出的 `.dat`（二进制格式，解析器见 `lib/typecho/dat.ts`），把文章、封面与评论搬进本站。常用参数：

| 参数 | 作用 |
| --- | --- |
| `--inspect` | 只解析并打印结构、分类分布与评论数量，不写库 |
| `--dry-run` | 转换正文并输出预览与质量统计（残留 HTML、图片数、封面数），不写库 |
| `--selftest` | 用内置的合成备份与 Gutenberg 样例自检解析与转换（无需真实文件） |
| `--only 202,1356` | 只处理指定旧 cid，便于定点重试 |
| `--old-site <url>` | 相对图片链接补全用的旧站地址（默认从文件名推断） |
| `--default-category <技术\|思想\|生活>` | 旧分类映射不到时的兜底频道（默认生活） |
| `--map "技术=技术,分享=生活"` | 自定义旧分类到频道的映射 |
| `--skip-images` / `--skip-comments` | 跳过封面下载 / 跳过评论 |

行为与约定：

- 正文统一转为 Markdown 存入「Markdown 正文」：`<!--markdown-->` 前缀的内容按 Markdown 原样保留（会剥离标记、转换内联 HTML），其余走 HTML→Markdown（清理 Gutenberg 注释与空段落、`figure+figcaption` 转图片+斜体说明、表格转 GFM）。`<script>`/`<iframe>` 会被丢弃——前台不放行原始 HTML。
- 已发布文章直接发布并保留原始发布时间；草稿与隐藏稿导入为未公开草稿；独立页面（`page`）归入「页面」分类，不出现在首页与文章档案列表，但可通过链接访问。正文为空的条目会跳过。
- `FeaturedImage` 字段下载后上传到媒体库作为封面；正文插图保留外链（相对路径补全为旧站绝对地址）。
- 评论只导入已审核的，按 Typecho 的 `parent` 还原回复层级；邮箱与站点仅后台可见。
- 期号取自旧 cid（如 `042`）；若与站内已有期号冲突会自动加后缀（`002b`），不覆盖也不跳过。
- 脚本**可重复执行**：文章按 slug（无 slug 时按标题）判定是否已导入，评论按「文章+昵称+正文」去重。
- 旧站的标签（tags）当前模型没有对应字段，导入时会忽略。

公开页面：`/`、`/posts`、`/posts/[slug]`、`/links`；`/components` 是组件展台。文章需在后台填写标题、slug、摘要、分类、期号和正文（阅读时长自动计算），发布后才会出现在前台。友链也需将状态改为 `published`。站名、作者、简介、社交账号和评论审核开关位于站点设置。评论审核默认开启；关闭后仅新评论直接公开，既有待审评论仍需手动处理。

正文支持两种写法，二选一：**富文本**（编辑器内排版、插入媒体库图片）或 **Markdown**（「Markdown 正文」字段，所见即所得编辑器）。两者同时填写时前台优先渲染 Markdown，因此从 Typecho 等来源迁移时，把导出的 Markdown 原文直接粘贴到「Markdown 正文」即可。Markdown 支持 GFM（表格、任务列表、删除线、脚注）与代码语法高亮，图片写作 `![说明](图片地址)`，外链图片经站内懒加载组件加载并限宽在阅读列内。

列表显示数量在后台「站点管理 → 站点资料与站长档案 → 列表设置」中调整：**首页最近信号条数**（默认 8）与**档案页每批条数**（默认 5，同时决定「加载更多」每次追加的条数）。两者都有范围校验，取值异常时前台回退到默认值。

后台「Markdown 正文」使用 Vditor 即时渲染编辑器：输入 `#` 即成为标题，工具栏提供标题/粗斜体/列表/任务列表/引用/代码/链接/表格/分割线等操作，「上传图片」会将本地图片上传到媒体库并自动插入 `![说明](站内地址)`，也可直接粘贴外链图片地址。编辑器运行时资源由 `scripts/sync-vditor-assets.mjs` 同步到 `public/vditor`（`npm run dev` / `npm run build` 前自动执行，该目录不入库），不依赖外部 CDN；脚本加载失败时会自动降级为纯文本输入框，写作不受阻断。

## 生产部署

在服务器提供 PostgreSQL、Node.js 进程、`MEDIA_DIR` 持久化目录和 HTTPS 反向代理。反向代理须传递原始 Host、协议，并覆盖客户端传入的 `X-Forwarded-For`；评论限流依赖可信的客户端 IP。发布新版本时先备份数据库与图片目录，再执行：

```bash
npm ci
npm run db:migrate
npm run build
npm run start
```

生产环境关闭数据库自动 `push`，由仓库内 `migrations/` 的迁移文件更新结构。改动 Payload 模型后，在开发机执行 `npx payload generate:types`、`npx payload generate:importmap`、`npx payload migrate:create <name>` 并提交生成文件。定期同时备份 PostgreSQL 与 `MEDIA_DIR`；两者需作为同一恢复点保存。

## 验证

运行 `npm run typecheck` 与 `npm run build`。接入数据库后还需验证后台登录、草稿预览与退出、发布和撤回、图片上传、友链发布，以及评论审核开关的两种提交路径。未登录访问草稿 slug 应得到 404。

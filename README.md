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

公开页面：`/`、`/posts`、`/posts/[slug]`、`/links`；`/components` 是组件展台。文章需在后台填写标题、slug、摘要、分类、期号、预计阅读时间和正文，发布后才会出现在前台。友链也需将状态改为 `published`。站名、作者、简介、社交账号和评论审核开关位于站点设置。评论审核默认开启；关闭后仅新评论直接公开，既有待审评论仍需手动处理。

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

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

生产环境使用 Docker 镜像：GitHub Actions 构建并发布到 GHCR，服务器只拉取镜像、迁移数据库并运行应用。本机 WSL 构建可作为备用路径。服务器需要 Linux x86_64、Docker Engine 与 Compose 插件，以及已有的 PostgreSQL 和宝塔 HTTPS 反向代理。应用与宿主机共享网络，因此 `DATABASE_URL` 可以连接 `127.0.0.1:5432`；应用仅监听 `127.0.0.1:3000`，宝塔反向代理上游指向该地址。反向代理须传递原始 Host、协议，并覆盖客户端传入的 `X-Forwarded-For`；评论限流依赖可信的客户端 IP。

### GitHub 云端构建

将仓库推送到 GitHub 的 `master` 分支后，`.github/workflows/build-image.yml` 会在 GitHub 托管的 Ubuntu 运行器上构建 `linux/amd64` 镜像，发布为 `ghcr.io/<owner>/<repo>:<完整提交 SHA>`。也可在 GitHub Actions 页面手动运行该工作流。先确认工作流成功及镜像标签，再在服务器部署；本地不需要构建或上传大型归档。工作流用 `GITHUB_TOKEN` 推送镜像，不使用生产数据库密码或 Payload 密钥。

GHCR 首次发布的包默认是私有的。服务器首次拉取前，用具有 `read:packages` 权限的 GitHub 个人访问令牌（classic）登录；若将包改为公开，可省略登录。登录用户应与后续执行 Compose 的用户相同。

```bash
read -rsp 'GHCR token: ' GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u <GitHub用户名> --password-stdin
unset GHCR_TOKEN
```

在服务器 `/opt/oldtech/.env.production` 中设置 `IMAGE_NAME=ghcr.io/<owner>/<repo>` 和 `IMAGE_TAG=<完整提交 SHA>`；镜像名必须全为小写。将仓库中的 `compose.prod.yaml` 传到服务器 `/opt/oldtech/`，之后每次发布只需更新标签并执行下方的拉取与发布命令。

### 本机 WSL 备用构建与传输

在仓库根目录的 PowerShell 中执行。当前 WSL Ubuntu 的 Docker 服务可用，但普通用户无 Docker socket 权限，所以通过 WSL root 调用 Docker；镜像在 WSL 中构建，无需在 Windows 安装 Docker Desktop。

```powershell
$tag = (git rev-parse --short HEAD).Trim()
wsl -d Ubuntu -u root -- sh -lc "cd /mnt/c/dev/oldtech && docker buildx build --platform linux/amd64 --load -t oldtech:$tag ."
wsl -d Ubuntu -u root -- sh -lc "docker save oldtech:$tag | gzip -1 > /mnt/c/dev/oldtech-$tag.tar.gz"
scp "C:\dev\oldtech-$tag.tar.gz" user@server:/tmp/
scp compose.prod.yaml user@server:/opt/oldtech/
```

本机路径使用短提交号；备用部署时将服务器 `IMAGE_NAME` 设为 `oldtech`、`IMAGE_TAG` 设为该短提交号，并把归档传到服务器。发布未提交的改动时，应先提交，使标签能准确对应源码。把示例中的 `user@server` 换成实际 SSH 地址；传输前在服务器创建 `/opt/oldtech` 并赋予 SSH 用户写入权限。镜像归档放在仓库外，避免进入下一次构建上下文。

### 服务器首次配置

在服务器 `/opt/oldtech/.env.production` 写入以下变量，并限制该文件的读取权限。把数据库、密钥和媒体目录改成实际值；此文件只留在服务器，不传进镜像或提交到 Git。已有图片应位于 `MEDIA_HOST_DIR` 指向的目录。

```dotenv
IMAGE_NAME=ghcr.io/<owner>/<repo>
IMAGE_TAG=<完整提交 SHA>
MEDIA_HOST_DIR=/opt/oldtech/media
DATABASE_URL=postgresql://oldtech:<密码>@127.0.0.1:5432/oldtech
PAYLOAD_SECRET=<至少32字节随机值>
PREVIEW_SECRET=<另一独立随机值>
```

数据库密码含特殊字符时先按 URL 规则编码。创建媒体目录并确保 Docker 容器可读写；生产配置始终将其挂载到容器的 `/app/media`，无需在环境文件中设置 `MEDIA_DIR`。例如：

```bash
cd /opt/oldtech
mkdir -p media backups
chmod 600 .env.production
```

### 每次发布与回滚

先将 `.env.production` 中的 `IMAGE_TAG` 更新为 GitHub Actions 已发布的完整提交 SHA，再备份数据库和图片，并把两者作为同一恢复点保存。下面的数据库名和用户是示例，按现有 PostgreSQL 配置调整；若媒体目录不是 `/opt/oldtech/media`，备份命令也应使用实际目录。若当前还有旧的 Node.js 应用占用 3000 端口，先停止旧进程，再执行迁移与启动。迁移失败时不要启动新版本。

```bash
cd /opt/oldtech
pg_dump -Fc -h 127.0.0.1 -U oldtech oldtech > "backups/oldtech-$(date +%Y%m%d-%H%M%S).dump"
tar -C /opt/oldtech -czf "backups/media-$(date +%Y%m%d-%H%M%S).tar.gz" media
docker compose --env-file .env.production -f compose.prod.yaml pull app
docker compose --env-file .env.production -f compose.prod.yaml run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production -f compose.prod.yaml up -d --no-build
docker compose --env-file .env.production -f compose.prod.yaml logs --tail=100 app
curl -I http://127.0.0.1:3000/
```

回滚应用时将 `IMAGE_TAG` 改回旧镜像的提交号并再次 `up -d --no-build`；若本次迁移与旧版本不兼容，还需从同一恢复点恢复 PostgreSQL 与媒体目录。使用本机备用构建时，以 `gzip -dc /tmp/oldtech-<短提交号>.tar.gz | docker load` 代替 `docker compose pull app`。

生产环境关闭数据库自动 `push`，由仓库内 `migrations/` 的迁移文件更新结构。改动 Payload 模型后，在开发机执行 `npx payload generate:types`、`npx payload generate:importmap`、`npx payload migrate:create <name>` 并提交生成文件。定期同时备份 PostgreSQL 与图片目录。若旧服务器上的构建曾卡死，可检查构建最后一段日志、`journalctl -k` 中的 OOM 记录及当时的内存使用；Docker 避免在服务器编译，但不代表原原因已经确认。

## 验证

本地运行 `npm run typecheck`，并确认 GitHub Actions 构建成功；备用路径可在 WSL 中构建镜像。服务器发布后检查首页、`/admin`、宝塔 HTTPS 代理、已有图片和新图片上传；接入数据库后还需验证后台登录、草稿预览与退出、发布和撤回、友链发布，以及评论审核开关的两种提交路径。未登录访问草稿 slug 应得到 404。

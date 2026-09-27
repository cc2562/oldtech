# NEON / NOTES — 个人博客设计 Demo

第一阶段实现首页和组件展台，用于确定视觉方向、交互风格与博客的前端结构。当前视觉以千禧年控制台为主题；站名、作者和文章均为演示内容。

项目文档：[变更记录](changlog.md) · [设计风格说明](design-style.md) · [设计规范与限制](design-constraints.md)

## 本地运行

要求 Node.js 20.9 或更新版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 查看首页，`/posts` 查看文章档案，`/links` 查看友情链接，`/components` 查看组件展台。`npm run build` 验证生产构建，`npm run typecheck` 验证类型。

## 技术与结构

- Next.js App Router + React + TypeScript。
- CSS Modules 管理组件样式，`app/globals.css` 定义全站设计变量；不使用 Tailwind CSS。
- `components/` 放复用界面组件，`lib/site.ts` 放可替换的站点身份资料。
- `lib/posts.ts` 定义 `PostSummary` 与第一阶段的样例文章。页面仅消费这个类型，不直接依赖存储层。
- `lib/links.ts` 定义 `FriendLink` 与 `SocialLink` 及演示数据，`/links` 友链页（站长档案卡片 + 模拟浏览器窗口中的友链卡片）仅消费这两个类型。

首页文章卡片是静态演示，不会链接到尚未实现的详情页。首页的四档旋钮可点击档位、拖动指针，或聚焦后使用方向键、Home、End 切换频道；文章列表随之筛选。站点说明以原生对话框打开，支持 Esc 关闭。终端进度条只演示非阻塞的开机状态，不控制页面加载。组件展台展示这些控件与拟物按钮。

## 第二阶段接入点

计划在同一个 Next.js 应用中集成自托管 Payload CMS，以 PostgreSQL 保存文章及站点资料，上传图片使用持久化存储。届时新增内容适配模块，将已发布的 CMS 记录映射为 `PostSummary`，首页与卡片继续使用现有界面接口；另行实现文章详情、草稿预览、后台登录和发布流程。当前 Demo 不需要数据库或 CMS 环境变量。

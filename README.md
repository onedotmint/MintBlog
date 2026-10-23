# MintBlog

一点薄荷的个人博客，使用 AntfuStyle 主题承载站点内容。

## 开发

```bash
pnpm install
pnpm dev
```

常用检查：

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm preview
```

站点配置位于 `src/config.ts`，文章位于 `src/content/blog/`，短记位于
`src/content/shorts/`，项目数据位于 `src/content/projects/data.json`。

Typora 直接写正文、自动标题和日期的流程见 [`docs/writing.md`](docs/writing.md)。更多字段与内容说明见 [`docs/content-guide.md`](docs/content-guide.md)。

Docker 部署说明见 [`docs/deployment.md`](docs/deployment.md)。

## 原版恢复

正式界面恢复自 Git `ca826e2`，不保留重设计时间轮、Connections 或独立作品档案。原版导航（含 Shorts）、字体与背景按历史代码恢复；保留 UTC 日期、Pagefind 空索引与工具排除等非视觉修复。恢复依据、备份验证与浏览器对照见 [`docs/restoration.md`](docs/restoration.md)。

`.local/` 完整保留并排除于 Git、工具检查和 Docker。需要运行依赖重设计组件的旧 Lab 时，使用仓库外完整备份的 worktree，而不是把它接回正式网站。

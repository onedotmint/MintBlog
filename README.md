# MintBlog

一点薄荷的个人博客，使用 AntfuStyle 主题承载站点内容。

## 开发

```bash
pnpm install
pnpm dev
```

日常检查与预览：

```bash
pnpm check
pnpm lint
pnpm preview
```

完整发布检查见 [`docs/release-preparation.md`](docs/release-preparation.md)。`pnpm preview` 预览已有构建，日常写作用 `pnpm dev`。

站点配置位于 `src/config.ts`，文章位于 `src/content/blog/`，随笔栏目 Collections 位于
`src/content/shorts/`：首段目录决定合集，根目录文件归入默认 `notes`（随手记），不使用 `collection` 字段。
`src/content/short-collections/` 仅放可选的合集显示名、介绍与草稿覆盖；项目数据位于 `src/content/projects/data.json`。

Typora 直接写正文、自动标题和日期的流程见 [`docs/writing.md`](docs/writing.md)。更多字段与内容说明见 [`docs/content-guide.md`](docs/content-guide.md)。

Docker 部署说明见 [`docs/deployment.md`](docs/deployment.md)。当前依赖迁移与兼容边界见 [`docs/dependency-upgrade.md`](docs/dependency-upgrade.md)。GitHub 只做 CI 与 GHCR SHA 镜像发布，不再 SSH 部署：push `main` 或在 `main` 手动运行 workflow 检查并发布镜像，PR 与其他分支手动运行仅验证。上线由操作者手动登录 VPS，在部署目录运行 `bash deploy.sh` 拉取指定完整 SHA 版本；公网验收通过后再同步服务器 `.env` 的 `BLOG_IMAGE`。此边界须在新 workflow 提交并推送后才生效，不表示旧运行或远端授权已清理。

## 原版恢复

正式界面的布局与字体以 Git `ca826e2` 为基线，不保留重设计时间轮、Connections 或独立作品档案；当前导航将 Shorts 显示为 Collections，首页与列表背景按后续要求调整。历史恢复与备份记录见 [`docs/restoration.md`](docs/restoration.md)，背景调整记录见 [`docs/atmosphere-blend.md`](docs/atmosphere-blend.md)。

`.local/` 完整保留并排除于 Git、工具检查和 Docker。需要运行依赖重设计组件的旧 Lab 时，使用仓库外完整备份的 worktree，而不是把它接回正式网站。

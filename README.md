# MintBlog

一点薄荷的个人博客，使用 Astro 静态站构建。

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
`src/content/short-collections/` 仅放可选的合集显示名、介绍与草稿覆盖；项目位于 `src/content/projects/posts/`，每个 `.md` 同时提供列表信息和详情正文，无需 JSON。

Typora 直接写正文、自动标题和日期的流程见 [`docs/writing.md`](docs/writing.md)。更多字段与内容说明见 [`docs/content-guide.md`](docs/content-guide.md)。

Docker 部署说明见 [`docs/deployment.md`](docs/deployment.md)，发布验收见 [`docs/release-preparation.md`](docs/release-preparation.md)。GitHub Actions 在 `main` 构建并启动待发布镜像，通过健康、关键路由和 404 检查后推送同一个镜像，不访问 VPS；PR 与其他分支的手动运行仅验证。上线时，确认目标运行成功并批准任务摘要中的不可变镜像 digest，再登录 VPS，在部署目录粘贴摘要中的 `bash deploy.sh ghcr.io/owner/repository@sha256:…` 命令。无参只显示用法并拒绝部署；人工回滚也必须显式传入已验收且获准的 digest。脚本确认实际运行的镜像 ID 和健康状态后自动保存 `.env`，但仍需完成公网验收。新流程只有在对应 workflow 推送后才生效。当前依赖迁移与兼容边界见 [`docs/dependency-upgrade.md`](docs/dependency-upgrade.md)。

## 原版恢复

正式界面的布局与字体以 Git `ca826e2` 为基线，不保留重设计时间轮、Connections 或独立作品档案；当前导航将 Shorts 显示为 Collections，首页与列表背景按后续要求调整。历史恢复、背景调整与 Links／Collections 删除记录见 [`docs/history.md`](docs/history.md)。

`.local/` 完整保留并排除于 Git、工具检查和 Docker。需要运行依赖重设计组件的旧 Lab 时，使用仓库外完整备份的 worktree，而不是把它接回正式网站。

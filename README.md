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
pnpm build
pnpm preview
```

站点配置位于 `src/config.ts`，文章位于 `src/content/blog/`，短记位于
`src/content/shorts/`，项目数据位于 `src/content/projects/data.json`。

内容添加与修改说明见 [`docs/content-guide.md`](docs/content-guide.md)。

Docker 部署说明见 [`docs/deployment.md`](docs/deployment.md)。

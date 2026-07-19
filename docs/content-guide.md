# 内容维护手册

站点是 Astro 静态站。内容写入 Markdown 或 JSON，构建时由内容集合校验，再生成静态页面。

## 日常流程

1. 修改 `src/content/` 或 `src/pages/` 下的内容。
2. 运行 `pnpm sync` 同步 Astro 类型。
3. 运行 `pnpm check` 和 `pnpm lint`。
4. 运行 `pnpm build` 确认生产构建通过。

本地预览使用 `pnpm dev`。`pnpm format` 只检查格式；需要自动格式化时使用 `pnpm format:write`。

不要直接修改 `dist/`、`.astro/` 或 `node_modules/`。这些目录由工具生成。

## 文章

文章文件放在 `src/content/blog/`，使用 Markdown。文件名会参与生成 URL，例如 `go-tcp-server.md` 对应 `/blog/go-tcp-server/`。

最小 frontmatter：

```md
---
title: "文章标题"
pubDate: 2026-07-19
description: "用于列表和 SEO 的一句话说明。"
---
```

常用字段：

- `title`：必填，最多 60 个字符。
- `description`：简介。省略时使用站点默认描述。
- `pubDate`：必填，支持可解析的日期格式。
- `lastModDate`：修改日期；没有时留空或删除。
- `tags`：标签数组，例如 `[Astro, Systems]`。
- `minutesRead`：填数字覆盖阅读时长，填 `true` 自动估算，填 `false` 隐藏。
- `cover` 和 `coverAlt`：封面及替代文本。
- `toc`、`share`、`giscus`、`search`：分别控制目录、分享、评论和搜索。
- `draft`：设为 `true` 时不进入生产构建。
- `redirect`：需要跳转时填写 `http://` 或 `https://` URL。
- `ogImage`：可填 `true`、`false`、`fallback` 或 `public/og-images/` 下图片的相对路径，例如 `custom.png`。
- `bgType`：可填 `false`、`plum`、`dot`、`rose`、`particle` 或 `signal`。

文章正文使用 Markdown。图片放在 `public/images/` 时，用根路径引用，例如 `/images/blog/example.svg`。

## 短记

短记文件放在 `src/content/shorts/`，字段和文章相同。文件名对应 `/shorts/` 下的详情 URL。

短记适合保存课程、书籍、文档和技术参考的短记录。短记索引页在 `src/pages/shorts/index.mdx`，不要在每条短记里重复修改索引布局。

## 作品

作品数据放在 `src/content/projects/data.json`。文件内容是数组，每项包含：

```json
{
  "id": "项目名称",
  "link": "https://example.com/",
  "desc": "一句话说明。",
  "icon": "i-simple-icons-github",
  "category": "Lab"
}
```

字段规则：

- `id`：页面显示名称。
- `link`：必填的 `http://` 或 `https://` URL。
- `desc`：简短说明，控制在一两句内。
- `icon`：UnoCSS 图标类名，格式为 `i-<集合>-<图标>` 或 `i-<集合>:<图标>`。
- `category`：分组标题。当前使用 `Lab`、`Now`、`Foundations`。

作品显示顺序以 JSON 数组顺序为准。修改分类时同时检查作品页的分组标题和描述是否仍然准确。

## 友链

友链数据放在 `src/content/links/data.json`。这里只放第三方个人站点，不放自己的项目、资料索引或其他资源。

每项使用以下字段：

```json
{
  "id": "站点名称",
  "link": "https://example.com/",
  "desc": "站点内容的一句话简介。",
  "icon": "i-ri-global-line"
}
```

友链页面是 `src/pages/links.mdx`。条目会复用作品页的行样式，点击后在新标签页打开，并带有 `noopener noreferrer`。新增真实友链时直接替换或追加 JSON 条目，不需要修改页面组件。

## 页面配置

静态页面放在 `src/pages/`，常用页面 frontmatter 如下：

```md
---
title: 页面标题
subtitle: 页面副标题
description: 用于 SEO 的页面描述
bgType: signal
ogImage: true
---
```

- `title` 显示在页面标题和文档元数据中。
- `subtitle` 显示在页面标题下方。
- `description` 用于 SEO 和分享描述。
- `bgType` 选择页面背景，设为 `false` 可关闭背景。
- `ogImage` 控制 Open Graph 图片；具体生成规则由 `FEATURES.ogImage` 控制。

页面结构优先复用 `BaseLayout`、`StandardLayout` 和现有 View 组件。只有页面组成方式确实不同，才新增页面组件。

## 导航与背景

主导航在 `src/config.ts` 的 `UI.internalNavs` 中维护。每项至少包含 `path`、`title`、`displayMode` 和 `text`。新增导航后检查桌面端、移动端和当前路由状态。

背景类型由 `src/schema.ts` 和 `src/types.ts` 共同约束，并由 `src/components/backgrounds/Background.astro` 分发。当前类型为：

- `plum`
- `dot`
- `rose`
- `particle`
- `signal`
- `false`

`signal` 是低对比的 Contour Signal 背景，适合首页、作品页和友链页。文章页和短记页继续使用各自现有背景，除非视觉方向明确改变。

## 提交前检查

```bash
pnpm sync
pnpm check
pnpm lint
pnpm format
pnpm build
```

如果内容校验失败，先根据错误定位字段，再检查对应集合的 schema：文章和短记使用 `postSchema`，作品使用 `projectSchema`，友链使用 `linkSchema`，页面使用 `pageSchema`。

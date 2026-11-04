# 内容维护手册

站点是 Astro 静态站。内容写入 Markdown 或 JSON，构建时由内容集合校验，再生成静态页面。

## 日常流程

1. 修改 `src/content/` 或 `src/pages/` 下的内容。
2. 运行 `pnpm dev`，保存后查看本地预览。
3. 发布前按 [release-preparation.md](release-preparation.md) 完成检查。

不要直接修改 `dist/`、`.astro/` 或 `node_modules/`。这些目录由工具生成。

## 文章

文章文件放在 `src/content/blog/`，使用 Markdown。可以在 Typora 里直接写正文，不需要 frontmatter：文件名自动成为标题，Git 首次／最近提交自动提供日期，已有手填值不覆盖。完整的简单写作流程见 [writing.md](writing.md)。

相对于 `src/content/blog/` 的完整路径（去扩展名）决定 URL，例如 `go-tcp-server.md` 对应 `/blog/go-tcp-server/`，`systems/go-tcp-server.md` 对应 `/blog/systems/go-tcp-server/`。发布后改文件名、移动文件或改目录名都会改变 URL，不自动重定向。

需要手动覆盖默认信息时，才写可选 frontmatter：

```md
---
title: '文章标题'
pubDate: 2026-07-19
description: '用于列表和 SEO 的一句话说明。'
---
```

常用字段：

- `title`：可省略，默认文件名，最多 60 个字符。
- `description`：简介。省略时使用站点默认描述。
- `pubDate`：可省略，默认 Git 首次提交时间；未提交新文件本地暂用修改时间。
- `lastModDate`：可省略，默认 Git 最近提交日期；填空字符串表示不显示，填日期则覆盖。
- `tags`：标签数组，例如 `[Astro, Systems]`。
- `minutesRead`：填数字覆盖阅读时长，填 `true` 自动估算，填 `false` 隐藏。
- `cover` 和 `coverAlt`：封面及替代文本。
- `toc`、`share`、`giscus`、`search`：分别控制目录、分享、评论和搜索。
- `draft`：设为 `true` 时不进入生产构建。
- `redirect`：可省略或填空字符串；需要跳转时填写不含用户名、密码的 `http://` 或 `https://` URL。
- `ogImage`：可填 `true`、`false`、`fallback` 或 `public/og-images/` 下图片的相对路径，例如 `custom.png`。
- `bgType`：可填 `false`、`plum`、`dot`、`rose`、`particle`、`signal`、
  `signal-plus`、`breeze` 或 `mist`。首页使用 `breeze`，Writing／Collections 列表页使用 `mist`；
  两者是轻量 CSS 光影，手机与减少动态模式静止。文章默认不加背景，无须随列表页修改。

文章正文使用 Markdown。图片放在 `public/images/` 时，用根路径引用，例如 `/images/blog/example.svg`。

## 随笔（Collections）

Collections 是随笔栏目的显示名，网址和内容目录仍使用 `/shorts/`、`src/content/shorts/`。它与未公开的历史 `src/content/collections/`、`src/content/articles/` 数据无关；后两者不会自动发布。

随笔适合片刻想法、日常感受、偶然发现或简短的踩坑记录，不限定主题、结构或字数。与 Writing 的完整文章不同，随笔按路径的首段目录归入合集。

页面结构为：`/shorts/` 合集目录 → `/shorts/collections/<合集ID>/` 篇目列表 → `/shorts/<随笔完整相对路径（去扩展名）>/` 正文。合集卡片显示名称、可选介绍和篇数，不用封面；标签汇总自合集中随笔。合集按显示名排列，篇目按 UTC 发布日期倒序，同一时间按 ID 排列。

**首段目录决定合集，随笔不用写 frontmatter。** 例如：

```
src/content/shorts/notes/下雨的周末.md
src/content/shorts/生活切片/周末/散步.md
```

第一篇归入 `notes`，默认显示「随手记」，无需另建「随手记」目录；第二篇归入「生活切片」，不是「周末」。标题均取文件名。

正文 URL 使用相对于 `src/content/shorts/` 的完整路径（去扩展名），上述两篇分别为 `/shorts/notes/下雨的周末/`、`/shorts/生活切片/周末/散步/`。移动文件或改目录名会改变 URL，不自动重定向。根目录文件也归入 `notes`；旧文章留在根目录即可保持 `/shorts/<文件名>/` 旧地址，不必移动。

可选地为合集改显示名、加介绍或设草稿，建 `src/content/short-collections/<合集ID>.md`（默认合集用 `notes.md`）。例如 `生活切片.md` 的完整 frontmatter：

```yaml
---
title: 生活切片
description: 日常里值得留下的一些片刻。
draft: false
---
```

覆盖文件无需正文，各字段均可省略。`title` 省略或留空时，`notes` 显示「随手记」，其他合集使用首段目录名。`draft: true` 隐藏整个合集及其所有随笔，包括详情路由、sitemap 和搜索；单篇设草稿只隐藏该篇。开发预览显示两级草稿并标记，生产构建排除草稿后再计数；空的公开合集仍显示 0 篇。

自动标题和日期规则与 Writing 相同。归属不使用 `collection` 字段，标签只描述主题。`collections` 及 `collections/` 子目录保留给合集路由，不能用作随笔路径。

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

Links 页面与导航入口已按要求移除，`/links/` 不再公开，也不做重定向。JSON 及集合校验保留为历史数据；修改它不会生成页面。不要为了编辑数据恢复路由。

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
- `signal-plus`
- `breeze`
- `mist`
- `false`

首页使用 `breeze`，Writing 与 Collections 的列表页（含合集篇目页）使用 `mist`，Projects 使用 `signal`。`breeze`、`mist` 是轻量 CSS 光影，移动端与减少动态模式静止。文章和随笔正文默认 `false`（无背景）；其余类型仍可选，`signal-plus` 当前不用于首页。

## 提交前检查

完整检查步骤见 [release-preparation.md](release-preparation.md)。如果内容校验失败，先根据错误定位字段，再检查对应集合的 schema：文章和随笔使用 `postSchema`，随笔合集的可选覆盖文件使用 `shortCollectionSchema`，作品使用 `projectSchema`，友链使用 `linkSchema`，页面使用 `pageSchema`。

## 历史记录

原版恢复与备份记录见 [restoration.md](restoration.md)，背景调整记录见 [atmosphere-blend.md](atmosphere-blend.md)。这些文档保留历史过程，当前内容规则以本手册和[内容规范](../specs/capabilities/content-collections.md)为准。

# 内容维护手册

站点是 Astro 静态站。内容写入 Markdown 或 JSON，构建时由内容集合校验，再生成静态页面。

## 日常流程

1. 修改 `src/content/` 或 `src/pages/` 下的内容。
2. 运行 `pnpm dev`，保存后查看本地预览。
3. 发布前按 [release-preparation.md](release-preparation.md) 完成检查。

不要直接修改 `dist/`、`.astro/` 或 `node_modules/`。这些目录由工具生成。

## 文章

文章文件放在 `src/content/blog/`，使用 Markdown。新建文章推荐复制静态通用模板 [`docs/templates/post.md`](templates/post.md) 到 `src/content/blog/` 并手填 `title` 与 `pubDate`（模板中的 `2026-11-14` 仅作示例，不会自动变成今天）。该模板只是可复制的静态起点，**不是自动插入器，不会在保存或构建时改写文件**；无 frontmatter 的写法也继续支持（由文件名提供标题，Git 首次／最近提交自动提供日期，且不回写用户文章）。完整的日常写作流程见 [writing.md](writing.md)。

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
- `pubDate`：可省略，默认 Git 首次提交时间；未提交新文件本地暂用 `mtime` 预览（Git-free 构建需匹配 `.post-dates.json` 快照，不能编造日期）。从 [`docs/templates/post.md`](templates/post.md) 复制起稿时，需把示例日期 `2026-11-14` 手填改成实际发布日期（不会自动填今天）；Git 提交不等于真正发布日期，必要时可手动覆盖。显式值可写纯日期、ISO 日期时间或毫秒时间戳，不接受数组、布尔值或 `null`。
- `lastModDate`：只在 Writing、Shorts、Projects 文章详情页每篇显示（列表、卡片与搜索结果不增加日期）。有效手填日期优先；缺失或留空字符串（`''`）时自动取 Git 最近提交日期，且自动值不早于 `pubDate`，首次同日也会显示；未提交新文件本地暂用 `mtime` 预览。手填后今后修改正文需自己更新；想恢复自动取 Git 最近提交，只需填写空字符串（`''`）或删掉该字段。非空值只接受有效日期／日期字符串或毫秒时间戳；裸写 `lastModDate:` 是 `null`，会报错，不等同于空字符串。
- 两个日期字段都按同一规则解析：纯日期 `2026-07-25` 或 `2026-7-25` 表示 UTC 零点；需要指定时刻时，建议写明时区，例如 `2026-07-25T08:30:00+08:00`。没有时区的 ISO 日期时间也按 UTC 处理；不要使用 `2026/7/25` 等地区相关格式。
- `tags`：标签数组，例如 `[Astro, Systems]`。
- `minutesRead`：填数字覆盖阅读时长，填 `true` 自动估算，填 `false` 隐藏。
- `cover` 和 `coverAlt`：封面及替代文本。`cover` 可留空，或使用本地相对图片路径（如 `./cover.png`、`../images/cover.webp`、`cover.jpg`），或不含用户名、密码的 HTTP(S) URL；本地路径使用 `/` 分隔，不使用根路径或 Windows 绝对路径。支持 Astro 的 PNG、JPEG、APNG、TIFF、WebP、GIF、SVG、AVIF 图片格式。
- `toc`、`share`、`giscus`、`search`：分别控制目录、分享、评论和搜索。
- `draft`：设为 `true` 时不进入生产构建。
- `redirect`：可省略或填空字符串；需要跳转时填写不含用户名、密码的 `http://` 或 `https://` URL。
- `ogImage`：可填 `true`、`false`、`fallback` 或 `public/og-images/` 下图片的相对路径，例如 `custom.png`。
- `bgType`：可填 `false`、`plum`、`dot`、`rose`、`particle`、`signal`、
  `signal-plus`、`breeze` 或 `mist`。当前实际用法：首页 `breeze`，Writing／Collections 列表页（含合集篇目页）`mist`，Projects `signal`，404 与 Photos `false`；`breeze`、`mist` 是轻量 CSS 光影，手机与减少动态模式静止。文章默认不加背景，无须随列表页修改。

文章正文使用 Markdown。图片放在 `public/images/` 时，用根路径引用，例如 `/images/blog/example.svg`。

### 长代码与折叠内容

普通代码块仍用三个反引号书写：短代码保持自然高度，长代码自动限制为 **400px** 高并在框内上下滚动；太宽的行可以左右滚动，不强制换行。高亮、文件名和复制按钮照常可用。滚动区域可用 Tab 聚焦，再用方向键滚动。

需要整段默认收起时，在 Markdown 中使用原生 `<details>`。下面两种写法均不需要导入组件或开启脚本；点击标题或聚焦标题后按 Enter／空格，可反复展开、收起。

**折叠完整代码：**（反引号代码块前后保留空行）

````md
<details>
<summary>展开完整代码</summary>

```js title="example.js"
console.log('这里放完整代码，行数多时自动在框内滚动。')
```

</details>
````

**折叠长文本：** 用 `.scroll-content` 给需要的内容单独限高；把 `aria-label` 改成能说明内容的名称，保留 `tabindex="0"` 以便键盘滚动。

```md
<details>
<summary>展开补充说明</summary>
<div class="scroll-content" tabindex="0" role="region" aria-label="补充说明">

这里放长文本，可以有多个段落、**加粗**和列表。

- 第一项
- 第二项

</div>
</details>
```

不加 `<details>` 则内容默认展开；给 `<details>` 加 `open` 也能默认展开并保留收起按钮。代码块还支持原有的局部行折叠：例如在开头写 `js collapse={5-30}`，仅收起第 5–30 行。

这些样式作用于站点文章预览和发布页面，Typora 的编辑预览不一定相同。打印时会取消滚动区域的高度限制；需要打印折叠内容时，请先展开。

## 随笔（Collections）

Collections 是随笔栏目的显示名，网址和内容目录仍使用 `/shorts/`、`src/content/shorts/`。它已与已删除的历史 `src/content/collections/`、`src/content/articles/` 数据无关。

随笔适合片刻想法、日常感受、偶然发现或简短的踩坑记录，不限定主题、结构或字数。与 Writing 的完整文章不同，随笔按路径的首段目录归入合集。

页面结构为：`/shorts/` 合集目录 → `/shorts/collections/<合集ID>/` 篇目列表 → `/shorts/<随笔完整相对路径（去扩展名）>/` 正文。合集卡片显示名称、可选介绍和篇数，不用封面；标签汇总自合集中随笔。合集按显示名排列，篇目按 UTC 发布日期倒序，同一时间按 ID 排列。

**首段目录决定合集。** 推荐复制 [`docs/templates/post.md`](templates/post.md) 到 `src/content/shorts/notes/`（或其他合集目录）并手填标题与发布日期，也继续支持不写 frontmatter。例如：

```
src/content/shorts/notes/下雨的周末.md
src/content/shorts/生活切片/周末/散步.md
```

第一篇归入 `notes`，默认显示「随手记」，无需另建「随手记」目录；第二篇归入「生活切片」，不是「周末」。未填写 `title` 时，标题均取文件名。

正文 URL 使用相对于 `src/content/shorts/` 的完整路径（去扩展名），上述两篇分别为 `/shorts/notes/下雨的周末/`、`/shorts/生活切片/周末/散步/`。移动文件或改目录名会改变 URL，不自动重定向。根目录文件也归入 `notes`；旧文章留在根目录即可保持 `/shorts/<文件名>/` 旧地址，不必移动。`notes/index.md` 仍使用 `/shorts/notes/index/`，不会简化成 `/shorts/notes/`。随笔和合集覆盖文件的路径保留大小写，不要在文件或目录名中使用 `%`、`#`、`?`、反斜杠或控制字符。

可选地为合集改显示名、加介绍或设草稿，建 `src/content/short-collections/<合集ID>.md`（默认合集用 `notes.md`）。例如 `生活切片.md` 的完整 frontmatter：

```yaml
---
title: 生活切片
description: 日常里值得留下的一些片刻。
draft: false
---
```

覆盖文件无需正文，各字段均可省略。`title` 省略或留空时，`notes` 显示「随手记」，其他合集使用首段目录名。`draft: true` 隐藏整个合集及其所有随笔，包括详情路由、sitemap 和搜索；单篇设草稿只隐藏该篇。开发预览显示两级草稿并标记，生产构建排除草稿后再计数；空的公开合集仍显示 0 篇。

自动标题和日期规则与 Writing 相同。归属不使用 `collection` 字段，随笔与合集覆盖文件的 `slug` 也不会改变路径 ID；覆盖文件的名字须与合集首段目录名匹配（含大小写）。标签只描述主题。`collections` 及 `collections/` 子目录保留给合集路由，不能用作随笔路径。

## 作品

项目和 Writing 一样，每个 Markdown 文件就是一个项目，统一放在 `src/content/projects/posts/`，不用再维护 JSON 或匹配两份名称。新建纯正文 `.md` 即可加入列表；标题默认取文件名，日期自动取 Git，分组默认 `Now`，图标默认代码图标。

可选地在同一个文件顶部填写：

```yaml
---
title: 我的项目
description: 一句话介绍，显示在项目列表中。
repo: https://github.com/用户名/项目名
category: Now
icon: i-ri-code-line
---
```

`---` 后面直接写 Markdown 详细介绍。各字段均可省略：

- `title`：项目显示名称，省略时取文件名，不再与其他记录匹配。
- `description`：列表中的简短介绍；省略时列表不显示简介。
- `repo`：可选仓库链接，只接受无用户名、密码的 HTTP(S) URL，在详情页显示“查看仓库”。
- `category`：自定义分组标题，默认 `Now`，也可填写中文，不能留空。
- `icon`：可选 UnoCSS 图标，格式为 `i-<集合>-<图标>` 或 `i-<集合>:<图标>`，默认 `i-ri-code-line`。
- `draft`：默认 `false`；开发预览显示草稿并标记，生产构建从项目列表和详情路由同时排除草稿。

列表按发布日期倒序排列，同一时间按文件 ID 排列。点击项目进入站内介绍页；`reroute.md` 对应 `/projects/reroute/`，嵌套目录也保留在 URL 中。改名或移动文件会改变 URL，不自动重定向。

项目复用文章标题、日期、Markdown、目录及最后修改日期规则；详情使用 `projectPostSchema`。可以复制通用模板 `docs/templates/post.md`，但不强制使用模板或 frontmatter。

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
- `bgType` 选择页面背景，设为 `false` 可关闭背景；完整可选值与各页面当前用法见上文[文章](#文章)的 `bgType` 说明（Projects 使用 `signal`）。
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

首页使用 `breeze`，Writing 与 Collections 的列表页（含合集篇目页）使用 `mist`，Projects 使用 `signal`，404 与 Photos 使用 `false`。`breeze`、`mist` 是轻量 CSS 光影，移动端与减少动态模式静止。文章和随笔正文默认 `false`（无背景）；`plum`、`dot`、`rose`、`particle`、`signal-plus` 当前没有页面使用，保留为可选值。

## 提交前检查

完整检查步骤见 [release-preparation.md](release-preparation.md)。如果内容校验失败，先根据错误定位字段，再检查对应集合的 schema：文章和随笔使用 `postSchema`，随笔合集的可选覆盖文件使用 `shortCollectionSchema`，项目使用 `projectPostSchema`，页面使用 `pageSchema`。

## 历史记录

原版恢复与备份记录见 [history.md](history.md)。该文档保留历史过程，当前内容规则以本手册和[内容规范](../specs/capabilities/content-collections.md)为准。

# 用 Typora 写博客

## 平时只做这些

1. 启动一次本地预览：`pnpm dev`。服务运行时不用每篇重新启动。
2. 推荐先复制静态通用模板 [`docs/templates/post.md`](templates/post.md) 到目标目录并命名（文件名决定 URL）：
   - Writing 文章：`src/content/blog/`
   - Collections 随笔：`src/content/shorts/notes/`（默认显示为「随手记」，不用另建名为「随手记」的目录；也可放入其他合集目录）
   - 项目详情 Markdown：`src/content/projects/posts/`
3. 在模板顶部手填 `title` 和 `pubDate`：模板里的 `2026-11-14` 只是有效示例日期，**不会自动变成今天**，用时需自己改；`lastModDate: ''` 留空即可自动取 Git 最近提交；模板默认 `draft: true`，写完准备公开时改为 `false`（或删掉该行）。
4. 在正文区直接用 Typora 写内容（文章页面已有标题，正文不要再写同名一级标题），保存后刷新博客预览即可。

项目草稿可在 `pnpm dev` 中直接访问 `/projects/<相对路径（去扩展名）>/` 预览；项目列表仍只链接非草稿，生产构建不生成草稿详情页。

> **静态模板说明**：`docs/templates/post.md` 只是放在 `docs/templates/` 的静态参考模板（不会在网站中被当成文章）。它**不是自动插入器**，保存或构建时不会自动向任何文章插入模板头或回写文件内容。

**无 frontmatter（无头）写法继续支持**：如果不想复制模板，也可以直接在 `src/content/blog/`、`src/content/shorts/` 或 `src/content/projects/posts/` 新建纯正文 `.md` 文件，由文件名提供默认标题，由 Git 提供发布与最后修改日期。

例如无头写法 `src/content/blog/一次有趣的调试.md`：

```md
今天解决了一个小问题，记录一下过程。

## 遇到了什么

这里写正文。

## 怎么解决

这里继续写。
```

Writing、Collections 随笔与项目详情仍支持无 YAML 头、不手填标题／日期／阅读时长／目录的写法；Collections 随笔按首段目录自动归类，同样不需要 frontmatter。默认标题仍受原规则约束：非空、最多 60 个字符。

## 写随笔与新建合集

Collections 是随笔栏目的显示名，网址和内容目录仍使用 `/shorts/`、`src/content/shorts/`，与已删除的历史 `src/content/collections/` 无关。

**首段目录决定合集。** 可复制通用模板到对应目录并手填标题与发布日期，也可直接建无 frontmatter 的文件：

```
src/content/shorts/notes/下雨的周末.md
```

未填写 `title` 时标题取文件名，合集 ID 为 `notes`，默认显示「随手记」，自动归类和计数。

- 建新合集 = 建新文件夹，例如 `src/content/shorts/生活切片/`；里面放第一篇随笔就自动出现在合集目录。更深层目录不另建合集。
- 直接放在 `src/content/shorts/` 根目录的随笔也归入 `notes`（随手记）。旧文章可留在根目录，保持原地址，不必移动。
- 正文 URL 使用相对于 `src/content/shorts/` 的完整路径（去扩展名）：`notes/下雨的周末.md` 对应 `/shorts/notes/下雨的周末/`，根目录的 `下雨的周末.md` 则对应 `/shorts/下雨的周末/`。移动文件或改目录名会改变 URL，**不会自动重定向**。
- 想改合集显示名或加介绍，可选建 `src/content/short-collections/生活切片.md`，完整写法如下；正文无需填写：

  ```yaml
  ---
  title: 生活切片
  description: 日常里值得留下的一些片刻。
  draft: false
  ---
  ```

- 覆盖文件各字段都可省略；默认 `notes` 的覆盖文件名是 `notes.md`。合集加 `draft: true` 会连同其中所有随笔一起从生产构建排除；单篇加该字段只隐藏该篇。保存本地文件不会直接上线。

## 博客自动负责什么

- 标题：文件名去掉 `.md`／`.mdx`；手填 `title` 时以手填为准。
- 发布日期：Git 中该文件沿历史追溯的首次提交时间，按现有 UTC 规则显示。
- 最后修改日期：只在 Writing、Shorts、Projects 文章详情页每篇显示（列表、卡片和搜索结果不增加日期）。有效手填 `lastModDate` 优先；缺失或空字符串（`lastModDate: ''`）自动取 Git 中该文件最近一次提交时间，且自动值不早于发布日期；首次提交当天（同日）也会显示。
- 新文件尚未提交时：本地暂用文件修改时间（`mtime`）预览；首次提交后以 Git 为准，不会把本地预览日期误当成永久发布时间。
- 阅读时长、目录、搜索：沿用站点现有默认处理。正文有小标题时生成目录，公开且允许搜索的正文由生产构建生成索引。

自动信息只在读取时补全，**不回写 Typora 正在编辑的文件，也不修改正文**。已有的标题、发布日期、有效的 `lastModDate` 等显式配置优先保留；`lastModDate` 缺失或留空字符串（`''`）时改为自动取 Git 最近提交；填错的值仍会报错，不会被自动修正掩盖。`lastModDate:` 后面不写值会被 YAML 解析成 `null` 并报错；需要自动日期时请写 `lastModDate: ''` 或删除该字段。

## 草稿和发布

- 不准备参与博客的文件，可以用 `_` 开头命名，例如 `_还没写完.md`，它不会进入内容集合或预览。
- 想在博客中预览草稿但不公开，Writing 文件开头只加下面的配置；Collections 随笔同样适用，写在随笔自己的文件里：

  ```yaml
  ---
  draft: true
  ---
  ```

- 默认普通文章可进入生产构建；**保存本地文件不会自动上线**。确认内容完成后，仍按 Git 提交、检查和发布流程操作。新流程中推送 `main` 或在 `main` 手动运行 workflow 只检查并发布 GHCR SHA 镜像，不更新 VPS；PR 与其他分支手动运行仅验证。正式上线须操作者另行登录服务器，手动拉取选定版本，见 [部署说明](deployment.md) 和 [发布清单](release-preparation.md)。该边界须在新 workflow 提交并推送后才生效；此前不能假定旧自动部署已停止。
- Git 提交后如果只变了历史、没有改正文，正在运行的开发服务不一定立即重读日期；重新启动预览或运行构建会更新。正式构建始终重算，不复用旧日期缓存。

## 偶尔需要手动指定

仍然可以只写需要的可选 frontmatter，例如导入一篇旧文章并指定历史发布／修改日期：

```yaml
---
title: 自定义标题
pubDate: 2020-05-01
lastModDate: 2020-06-15
---
```

没有写 `pubDate` 时自动取 Git 首次提交；`lastModDate` 缺失或留空（`lastModDate: ''`）时自动取 Git 最近提交（不早于 `pubDate`），并在 Writing、Shorts、Projects 文章详情页每篇显示。**手填有效 `lastModDate` 后，今后修改正文需要自己更新该日期**；如果想恢复自动取 Git 最近提交，只需把 `lastModDate` 清空（`''`）或删掉该字段。若从 [`docs/templates/post.md`](templates/post.md) 复制模板起稿，记得把示例 `title` 和 `pubDate`（`2026-11-14`）改成实际值。

文件相对于所属内容目录的完整路径（去扩展名）决定 URL；发布后改文件名、移动文件或改目录名都会改变 URL，不会自动维护旧网址重定向。Git 通常能追溯普通重命名的首次提交，但不保证在大幅改写后识别重命名。

## 构建与部署

- 正常 `pnpm build` 自动准备 `.post-dates.json`，不需要编辑或提交它。
- GitHub Actions 使用完整历史，自动准备 Docker 所需的日期快照。
- 手动 Docker 构建前，在完整 Git 工作区运行 `pnpm content:dates`。快照与原文哈希必须匹配；没有 Git 又缺失或过期的快照时构建明确失败，不使用构建机器的文件时间编造日期。
- Git 历史被裁浅时需要补全（`git fetch --unshallow`）。Git 日期是提交时间，不是文件实际开始写作或第一次对外发布的证据；需要真实发布日期时可手动覆盖。

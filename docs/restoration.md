# 一点薄荷 · 恢复原版

## 基准与保护

- 原版基准：`ca826e279870b4d6582403bb3ec4cb75047e7f70`，2026-07-25，`fix: normalize deployment image name`。它是近期未提交全站重设计之前最后完整的站点，不是仓库最早提交。
- 对比了 `221d42a` 刚采用主题的中间态（无 Links、不同导航和背景）与更早 `1d7495a` 另一代 `/writing/`、`/works/` 架构，二者均不符合本次四页恢复目标。
- 外部完整备份：`/home/dotmint/Backups/MintBlog-restore-20261023T031418Z/`。`worktree/` 包括 Git、所有未提交/未跟踪文件、忽略文件、依赖与完整 `.local/`。共38736项、30342个普通文件、2607个符号链接，经SHA-256/链接目标/权限比较无差异；Git对象检查通过。
- `HEAD.txt`、`git-status.txt`、`git-log.txt`、`git-reflog.txt`、二进制patch及双份manifest与 `verification.json` 都在备份根目录。备份权限仅当前用户访问。首次差异仅为Git状态检查刷新index缓存，复制同一index后重验全通过。
- 没有 reset --hard、git clean、暂存、commit、push或部署；真实HEAD不移动。

## 恢复范围

按历史文件直接恢复98个源码/配置/说明文件，保留其中适用的工程修复。恢复原 BaseLayout/StandardLayout、全局/prose/Markdown样式、Inter / DM Mono / Roboto Condensed、Signal Plus首页、Rose Writing、Signal Projects/Links、原目录、图标导航与文章模板。

原版导航确有 Writing、Projects、Shorts、Links，本次按原代码恢复，不把Shorts当新栏目创造。原版空Photos辅助路由及关闭状态的OG/Giscus/Share支持也与原代码一致，不为恢复顺便启用这些功能。

移除正式时间轮、Connections、媒体展示控制器及 `/projects/[slug]/` 档案，相关测试随引擎归档而非留下悬空依赖；没有创建替代页面。新字体和本站截图移至 `.local/retired-redesign/`，不进入正式输出。原Lab目录完整保留，但需要旧正式组件时应从外部完整备份的 `worktree/.local/visual-lab/` 运行，以免把它接回恢复后的站点。

## 保留的工程修复与内容

- UTC日期/年份及回归测试；Blog/Shorts生产草稿过滤。
- Pagefind清除旧索引、无正文标记不回退全站、搜索空索引短路和条件加载；恢复原搜索界面，并适配原Blog/Shorts两类公开内容。保留不可见的日期metadata。
- 主题过渡被导航取消时的promise拒绝处理；原动画本身不改变。RSS元信息的base路径修复。
- 原Markdown/MDX插件链、写作/本地预览、HTTP(S)/图标验证；CI的test/build门禁、Node24、部署修复。
- `.local/`在Git/Docker/ESLint/Prettier/TypeScript的隔离边界，正式目录规则仍有效。
- 当前Blog与Links文件保留，Collections/Articles真实数据及草稿保留但不生成公开路由。Start!原本无正文，没有编造文章。首页与项目/Shorts恢复历史原文；近期改写和项目长档案完整存于外部备份。

## 浏览器与最终检查

- 恢复站点：<http://localhost:4321/>；独立历史生产基准：<http://localhost:4330/>；只读截图对照报告：<http://localhost:4331/>。报告服务器只暴露 `evidence/`，不暴露完整备份，不是正式博客路由。
- 完成24组浏览器验收、0页面异常。Home/Writing/Projects/Links/文章详情在1440与390、亮暗四种组合共20对实拍；导航、主题、浏览器前进后退、文章返回、无脚本目录与减少动态也已检查。
- 20对布局、字体、颜色、留白测量一致；其中首页/Projects/Links共12对像素完全一致。其余8对唯一已核实的文字差异为保留UTC修复：原版将源日期2026-07-25错显成7月24日，恢复版正确显示7月25日；最大平均像素通道差约0.095/255。未改DOM内容来掩盖此差异。
- 没有找到可确证为ca826e2的同期原始截图。已有Wind/Fog/时间轮截图属于后续改造，不能冒充旧图。对照左图由准确历史源码在当前同一Chromium重现；静态截图统一装饰性随机数种子并暂停CSS动画，正常背景/交互另以未设种子的环境验证。
- Markdown长文/代码/表格/目录和MDX真实表达式在仓库外 `candidates/writing-validation/` 验证。该隔离构建真实生成仅含2篇验收文章的Pagefind索引，并非开发环境模拟搜索结果；草稿不生成路径且不进入索引。正式站上临时验收文章、原排版草稿和旧项目档案均为404。
- 正式站当前无启用搜索的文章，保留修复后无索引、无缺失bundle请求并正确显示无结果。未经修复的历史基准本次构建确实回退索引了全站9页，这正是未恢复的旧错误。
- 最终 `pnpm test` 6/6；`pnpm check` 86文件、0 errors/warnings/hints；`pnpm lint`、`pnpm build`、`git diff --check`通过，正式构建9个HTML页面，无时间轮/Connections/实验档案。
- 原版Photos集合为空，Astro仍输出对应空集合提示；它不是新错误，本次未为消除提示添加照片或改造旧页面。
- 重新校验外部完整备份38736项：未变；现有 `.local/` 原文件未变；31个关键视觉/配置/内容文件与原提交字节完全一致；当前Blog/Links及未公开Collections/Articles内容未变。HEAD未移动，暂存区为空，工作树仍有可审阅的恢复与工程差异。

## 证据与后续运行

`/home/dotmint/Backups/MintBlog-restore-20261023T031418Z/evidence/` 包含 `browser-results.json`、40张原版/恢复截图、隔离文章实拍、`final-integrity.json`、完整工程/浏览器日志与独立报告。`final-git-status.txt`、`final-worktree.patch` 位于备份根。请勿将整个备份作为网站目录公开或部署。

当前预览进程关闭后，从正式仓库执行 `pnpm build && pnpm preview --host 0.0.0.0 --port 4321` 即可重开恢复站点；原版基准可在外部 `candidates/head/` 执行 `pnpm preview --port 4330`。对照报告仅需 `python3 -m http.server 4331 --directory /home/dotmint/Backups/MintBlog-restore-20261023T031418Z/evidence`。

未测试实体设备、Safari/Firefox或读屏器；未实机验证Docker/VPS部署。原版远程字体构建下载与首页图片的外部地址保留，未来可用性仍依赖原服务，未擅自替换资源。没有无法恢复而临时设计的页面，没有commit/push/部署。
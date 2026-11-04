# 历史记录

本页记录站点恢复与背景调整两个已完成阶段，供查阅当时依据与验收情况。当前内容规则以 [内容维护手册](content-guide.md) 和 [内容规范](../specs/capabilities/content-collections.md) 为准，不以本页描述当前实现。

## 一、恢复原版

### 基准与保护

- 原版基准：`ca826e279870b4d6582403bb3ec4cb75047e7f70`，2026-07-25，`fix: normalize deployment image name`。它是近期未提交全站重设计之前最后完整的站点，不是仓库最早提交。
- 对比了 `221d42a` 刚采用主题的中间态（无 Links、不同导航和背景）与更早 `1d7495a` 另一代 `/writing/`、`/works/` 架构，二者均不符合本次四页恢复目标。
- 外部完整备份：`/home/dotmint/Backups/MintBlog-restore-20261023T031418Z/`。`worktree/` 包括 Git、所有未提交/未跟踪文件、忽略文件、依赖与完整 `.local/`。共38736项、30342个普通文件、2607个符号链接，经SHA-256/链接目标/权限比较无差异；Git对象检查通过。
- `HEAD.txt`、`git-status.txt`、`git-log.txt`、`git-reflog.txt`、二进制patch及双份manifest与 `verification.json` 都在备份根目录。备份权限仅当前用户访问。首次差异仅为Git状态检查刷新index缓存，复制同一index后重验全通过。
- 没有 reset --hard、git clean、暂存、commit、push或部署；真实HEAD不移动。

### 恢复范围

按历史文件直接恢复98个源码/配置/说明文件，保留其中适用的工程修复。恢复原 BaseLayout/StandardLayout、全局/prose/Markdown样式、Inter / DM Mono / Roboto Condensed、Signal Plus首页、Rose Writing、Signal Projects/Links、原目录、图标导航与文章模板。

原版导航确有 Writing、Projects、Shorts、Links，本次按原代码恢复，不把Shorts当新栏目创造（Links 后在 2026-11 按用户要求彻底删除）。原版空Photos辅助路由及关闭状态的OG/Giscus/Share支持也与原代码一致，不为恢复顺便启用这些功能。

移除正式时间轮、Connections、媒体展示控制器及 `/projects/[slug]/` 档案，相关测试随引擎归档而非留下悬空依赖；没有创建替代页面。新字体和本站截图移至 `.local/retired-redesign/`，不进入正式输出。原Lab目录完整保留，但需要旧正式组件时应从外部完整备份的 `worktree/.local/visual-lab/` 运行，以免把它接回恢复后的站点。

### 保留的工程修复与内容

- UTC日期/年份及回归测试；Blog/Shorts生产草稿过滤。
- Pagefind清除旧索引、无正文标记不回退全站、搜索空索引短路和条件加载；恢复原搜索界面，并适配原Blog/Shorts两类公开内容。保留不可见的日期metadata。
- 主题过渡被导航取消时的promise拒绝处理；原动画本身不改变。RSS元信息的base路径修复。
- 原Markdown/MDX插件链、写作/本地预览、HTTP(S)/图标验证；CI的test/build门禁、Node24、部署修复。
- `.local/`在Git/Docker/ESLint/Prettier/TypeScript的隔离边界，正式目录规则仍有效。
- 当前Blog文件保留，Collections/Articles真实数据及草稿保留但不生成公开路由（2026-11 连同 Schema 与集合注册一并删除）。Start!原本无正文，没有编造文章。首页与项目/Shorts恢复历史原文；近期改写和项目长档案完整存于外部备份。

### 浏览器与最终检查

- 恢复站点：<http://localhost:4321/>；独立历史生产基准：<http://localhost:4330/>；只读截图对照报告：<http://localhost:4331/>。报告服务器只暴露 `evidence/`，不暴露完整备份，不是正式博客路由。
- 完成24组浏览器验收、0页面异常。Home/Writing/Projects/Links/文章详情在1440与390、亮暗四种组合共20对实拍；导航、主题、浏览器前进后退、文章返回、无脚本目录与减少动态也已检查。
- 20对布局、字体、颜色、留白测量一致；其中首页/Projects/Links共12对像素完全一致。其余8对唯一已核实的文字差异为保留UTC修复：原版将源日期2026-07-25错显成7月24日，恢复版正确显示7月25日；最大平均像素通道差约0.095/255。未改DOM内容来掩盖此差异。
- 没有找到可确证为ca826e2的同期原始截图。已有Wind/Fog/时间轮截图属于后续改造，不能冒充旧图。对照左图由准确历史源码在当前同一Chromium重现；静态截图统一装饰性随机数种子并暂停CSS动画，正常背景/交互另以未设种子的环境验证。
- Markdown长文/代码/表格/目录和MDX真实表达式在仓库外 `candidates/writing-validation/` 验证。该隔离构建真实生成仅含2篇验收文章的Pagefind索引，并非开发环境模拟搜索结果；草稿不生成路径且不进入索引。正式站上临时验收文章、原排版草稿和旧项目档案均为404。
- 正式站当前无启用搜索的文章，保留修复后无索引、无缺失bundle请求并正确显示无结果。未经修复的历史基准本次构建确实回退索引了全站9页，这正是未恢复的旧错误。
- 最终 `pnpm test` 6/6；`pnpm check` 86文件、0 errors/warnings/hints；`pnpm lint`、`pnpm build`、`git diff --check`通过，正式构建9个HTML页面，无时间轮/Connections/实验档案。
- 原版Photos集合为空，Astro仍输出对应空集合提示；它不是新错误，本次未为消除提示添加照片或改造旧页面。
- 重新校验外部完整备份38736项：未变；现有 `.local/` 原文件未变；31个关键视觉/配置/内容文件与原提交字节完全一致；当前Blog/Links及未公开Collections/Articles内容未变。HEAD未移动，暂存区为空，工作树仍有可审阅的恢复与工程差异。

### 证据与后续运行

`/home/dotmint/Backups/MintBlog-restore-20261023T031418Z/evidence/` 包含 `browser-results.json`、40张原版/恢复截图、隔离文章实拍、`final-integrity.json`、完整工程/浏览器日志与独立报告。`final-git-status.txt`、`final-worktree.patch` 位于备份根。请勿将整个备份作为网站目录公开或部署。

当前预览进程关闭后，从正式仓库执行 `pnpm build && pnpm preview --host 0.0.0.0 --port 4321` 即可重开恢复站点；原版基准可在外部 `candidates/head/` 执行 `pnpm preview --port 4330`。对照报告仅需 `python3 -m http.server 4331 --directory /home/dotmint/Backups/MintBlog-restore-20261023T031418Z/evidence`。

未测试实体设备、Safari/Firefox或读屏器；未实机验证Docker/VPS部署。原版远程字体构建下载与首页图片的外部地址保留，未来可用性仍依赖原服务，未擅自替换资源。没有无法恢复而临时设计的页面，没有commit/push/部署。

## 二、克制风雾与作品内容融合

本轮是在原版恢复完成后的明确增量，不是再次全站重设计。

> 后续调整：用户要求删除 Links，2026-11 已连同数据、Schema 和集合注册全部删除，不重定向；Shorts 复用轻雾 `mist`，替代主题自带的粒子连线，保留卡片布局。下方 37 状态验收是上一阶段记录，后续验收保存于 `.local/release-evidence/shorts-without-links/`。

### 页面边界

- 首页 `src/pages/index.mdx` 改用 `breeze`：以拉长的柔和光影和缓慢漂移表达风，不绘制流线、节点、网格或时间轮。原介绍、图片、字体、导航和布局不改。
- Writing 列表 `src/pages/blog/index.mdx` 改用 `mist`：沿用之前 Lab 的低饱和灰绿／暖色径向渐变思路，保留现有列表和间距。不复制实验版错位列表、模拟文章或控制台。
- 新组件为 `src/components/backgrounds/Atmosphere.astro`。两个渐变层使用 CSS 位移动画；阅读栏中央有弱化遮罩。小于 768px 和减少动态模式不启动背景动画，隐藏标签页暂停，离页解绑监听，打印隐藏。禁用 JavaScript 时，背景和正式内容仍存在。
- 原 Signal Plus、Rose 等背景仍可选。Projects、Links 及文章 frontmatter 均不跟随首页改背景；正文默认无背景。没有 WebGL、Canvas 循环、新运行时依赖或全局布局修改。
- `bgType` 在 Schema、类型、组件路由和可选 OG 链路中同步添加 `breeze`、`mist`。OG 使用共同的静态渐变图，不是动态页面截图；原 OG 功能仍关闭。

### 内容

仅在 `src/content/projects/data.json` 追加 Diffusion、Siftpath 两条简洁项目介绍，保留原博客条目和 `Now` 分组，复用原目录组件。浏览器验收发现原目录的 300px 最小列宽在 320px 视口溢出，已将共享 `GroupItem.astro` 列下限限制为 `min(100%, 300px)`，同时修复 Projects／Links，不改变桌面列宽。来源：

- Diffusion：`.local/projects-real-research/diffusion-BOBPjE/README.zh-CN.md`、`repository.json`；仓库 <https://github.com/NekoMint-Labs/Diffusion>。
- Siftpath：`.local/projects-real-research/siftpath-README.md`、`.local/visual-lab/src/stage-two/data/real-works.ts`；仓库 <https://github.com/onedotmint/Siftpath>。

本轮在线读取未成功，介绍只采用保存资料中的基础定位，不写版本、发布日期、维护状态、个人贡献或当前供应商可用性。没有采用旧软件截图、编造演示或生成项目详情。Links 已有具体短注，保持不变。

Collections/Articles 原数据继续保留而不公开（2026-11 已删除）；未增加栏目、首页近况区或为了填满页面而编写内容。后续可在真实文章积累后单独讨论专题入口。

### 检查与预览

- 开发预览仍为 <http://localhost:4321/>，保存后刷新。
- 工程门禁：`pnpm check`（87 文件，0 errors/warnings/hints）、`pnpm lint`、`pnpm test`（6/6）、`pnpm build`（9 个 HTML 页面）、`git diff --check` 均通过。Photos 空集合提示是恢复前已有情况。
- 浏览器自检：`.local/release-evidence/atmosphere-blend/review.mjs`；使用现有隔离 Playwright，不加入正式依赖。生产预览运行时执行 `BLOG_URL=http://localhost:4325 node .local/release-evidence/atmosphere-blend/review.mjs`，结果与截图保存到同目录。它检查 1440/390/320px 双主题、风雾页面范围、真实项目入口、导航／历史／主题、减少动态、打印、隐藏暂停和无脚本页面。
- 最终生产构建的浏览器自检通过 37 个页面状态及导航／历史／主题、隐藏暂停、减少动态、打印与无脚本断言，页面异常为 0；保留 20 张桌面／手机双主题截图。320px 的 Projects／Links 已无横向溢出。另修正了首页旋转光影在细长视口的裁切硬边。
- 减少动态和隐藏暂停是浏览器行为检查，不是 GPU、功耗或真机性能测试。未验证实体设备、Safari/Firefox 或读屏器。
- 没有暂存、提交、推送或部署。修改前相关文件有本地命名检查点 `before-atmosphere-blend`；它不是已提交的 Git 版本，且工具检查点有保留期限。

### 移除 Links 与简化 Shorts

- 删除 `src/pages/links.mdx` 与 `UI.internalNavs` 中的 Links；2026-11 进一步删除 `src/content/links/data.json`、`linkSchema` 与集合注册，不留 JSON 或共享支持。
- Shorts 的 `bgType` 从 `particle` 改为现有 `mist`，原卡片、标签和文章入口不改。
- `pnpm check`、`pnpm lint`、`pnpm test`（6/6）、`pnpm build`、`git diff --check` 通过；生产浏览器自检 30 个页面状态通过，覆盖 1440/390/320px 双主题、Shorts 导航与历史返回、减少动态、无脚本。Links 返回 404，导航与 sitemap 无 Links，Shorts 无粒子 Canvas，页面异常为 0。
- 自检脚本和四张 Shorts 实拍在 `.local/release-evidence/shorts-without-links/`。临时生产验收服务已关闭，4321 开发预览保留。未提交或部署；未验证真机、Safari/Firefox。

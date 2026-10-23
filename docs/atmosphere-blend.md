# 克制风雾与作品内容融合

本轮是在原版恢复完成后的明确增量，不是再次全站重设计。历史恢复记录仍见 [restoration.md](restoration.md)。

> 后续调整：用户要求删除 Links，已移除正式页面和导航，保留原 JSON，不重定向；Shorts 复用轻雾 `mist`，替代主题自带的粒子连线，保留卡片布局。下方 37 状态验收是上一阶段记录，后续验收保存于 `.local/release-evidence/shorts-without-links/`。

## 页面边界

- 首页 `src/pages/index.mdx` 改用 `breeze`：以拉长的柔和光影和缓慢漂移表达风，不绘制流线、节点、网格或时间轮。原介绍、图片、字体、导航和布局不改。
- Writing 列表 `src/pages/blog/index.mdx` 改用 `mist`：沿用之前 Lab 的低饱和灰绿／暖色径向渐变思路，保留现有列表和间距。不复制实验版错位列表、模拟文章或控制台。
- 新组件为 `src/components/backgrounds/Atmosphere.astro`。两个渐变层使用 CSS 位移动画；阅读栏中央有弱化遮罩。小于 768px 和减少动态模式不启动背景动画，隐藏标签页暂停，离页解绑监听，打印隐藏。禁用 JavaScript 时，背景和正式内容仍存在。
- 原 Signal Plus、Rose 等背景仍可选。Projects、Links 及文章 frontmatter 均不跟随首页改背景；正文默认无背景。没有 WebGL、Canvas 循环、新运行时依赖或全局布局修改。
- `bgType` 在 Schema、类型、组件路由和可选 OG 链路中同步添加 `breeze`、`mist`。OG 使用共同的静态渐变图，不是动态页面截图；原 OG 功能仍关闭。

## 内容

仅在 `src/content/projects/data.json` 追加 Diffusion、Siftpath 两条简洁项目介绍，保留原博客条目和 `Now` 分组，复用原目录组件。浏览器验收发现原目录的 300px 最小列宽在 320px 视口溢出，已将共享 `GroupItem.astro` 列下限限制为 `min(100%, 300px)`，同时修复 Projects／Links，不改变桌面列宽。来源：

- Diffusion：`.local/projects-real-research/diffusion-BOBPjE/README.zh-CN.md`、`repository.json`；仓库 <https://github.com/NekoMint-Labs/Diffusion>。
- Siftpath：`.local/projects-real-research/siftpath-README.md`、`.local/visual-lab/src/stage-two/data/real-works.ts`；仓库 <https://github.com/onedotmint/Siftpath>。

本轮在线读取未成功，介绍只采用保存资料中的基础定位，不写版本、发布日期、维护状态、个人贡献或当前供应商可用性。没有采用旧软件截图、编造演示或生成项目详情。Links 已有具体短注，保持不变。

Collections/Articles 原数据继续保留而不公开；未增加栏目、首页近况区或为了填满页面而编写内容。后续可在真实文章积累后单独讨论专题入口。

## 检查与预览

- 开发预览仍为 <http://localhost:4321/>，保存后刷新。
- 工程门禁：`pnpm check`（87 文件，0 errors/warnings/hints）、`pnpm lint`、`pnpm test`（6/6）、`pnpm build`（9 个 HTML 页面）、`git diff --check` 均通过。Photos 空集合提示是恢复前已有情况。
- 浏览器自检：`.local/release-evidence/atmosphere-blend/review.mjs`；使用现有隔离 Playwright，不加入正式依赖。生产预览运行时执行 `BLOG_URL=http://localhost:4325 node .local/release-evidence/atmosphere-blend/review.mjs`，结果与截图保存到同目录。它检查 1440/390/320px 双主题、风雾页面范围、真实项目入口、导航／历史／主题、减少动态、打印、隐藏暂停和无脚本页面。
- 最终生产构建的浏览器自检通过 37 个页面状态及导航／历史／主题、隐藏暂停、减少动态、打印与无脚本断言，页面异常为 0；保留 20 张桌面／手机双主题截图。320px 的 Projects／Links 已无横向溢出。另修正了首页旋转光影在细长视口的裁切硬边。
- 减少动态和隐藏暂停是浏览器行为检查，不是 GPU、功耗或真机性能测试。未验证实体设备、Safari/Firefox 或读屏器。
- 没有暂存、提交、推送或部署。修改前相关文件有本地命名检查点 `before-atmosphere-blend`；它不是已提交的 Git 版本，且工具检查点有保留期限。

## 移除 Links 与简化 Shorts 的后续验收

- 删除 `src/pages/links.mdx` 与 `UI.internalNavs` 中的 Links；保留友链 JSON、Schema 和共享组件，不新增重定向。
- Shorts 的 `bgType` 从 `particle` 改为现有 `mist`，原卡片、标签和文章入口不改。
- 已核对主题上游的 [Shorts 源码](https://github.com/lin-stephanie/astro-antfustyle-theme/blob/main/src/pages/shorts/index.mdx)：默认确为 `particle`。AntfuStyle 是受 antfu.me 启发的第三方主题，不能称作 antfu 本人站点的原始实现。
- `pnpm check`、`pnpm lint`、`pnpm test`（6/6）、`pnpm build`、`git diff --check` 通过；生产浏览器自检 30 个页面状态通过，覆盖 1440/390/320px 双主题、Shorts 导航与历史返回、减少动态、无脚本。Links 返回 404，导航与 sitemap 无 Links，Shorts 无粒子 Canvas，页面异常为 0。
- 自检脚本和四张 Shorts 实拍在 `.local/release-evidence/shorts-without-links/`。临时生产验收服务已关闭，4321 开发预览保留。未提交或部署；未验证真机、Safari/Firefox。

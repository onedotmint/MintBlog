# 依赖升级与兼容边界

本页记录当前依赖迁移，不代表已经部署。具体解析版本以 `pnpm-lock.yaml` 为准，检查命令见 [发布清单](release-preparation.md)。

## 升级范围

| 组件                       | 迁移版本         | 关联变化                                                                          |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Astro / MDX                | 7.4.7 / 8.1.2    | 保留现有 unified Markdown processor 与插件链                                      |
| TypeScript                 | 6.0.3            | 移除 `baseUrl`，保留相对 paths，显式加载 Node 类型                                |
| p5                         | 2.4.0            | 使用内置类型，删除 `@types/p5`；背景等待异步初始化和销毁，避免快速导航遗留 canvas |
| Prettier Astro             | 1.1.2            | `.prettierrc.json` 显式加载插件并统一单引号/无分号，不对全仓历史文件自动重排      |
| Satori                     | 0.63.2           | 修复旧 SVG 转义风险；生成器读取配置中的 WOFF2 字体，输出仍由 Sharp 转 PNG         |
| ESLint / typescript-eslint | 10.14.0 / 8.72.1 | 保持现有规则和生产检查边界                                                        |
| UnoCSS                     | 66.12.0          | 核心、Astro integration、reset 同步升级                                           |
| Pagefind                   | 1.6.0            | 保留空索引保护及公开正文索引范围                                                  |

同时更新 globals、图标数据、Git hooks 和语法树工具。Node 24.22.1、pnpm 10.34.7 保持不变；Node 类型保留 24 系，不用 26 系类型描述 24 系运行环境。

TypeScript 7 不在当前 `@astrojs/check` 和 typescript-eslint 的支持范围内，因此固定在兼容的 `~6.0.3`，不是通过忽略 peer 或弃用警告强装。

## 安全修复

- 删除 `astro-robots-txt`，不再引入旧 Zod 3。原生 `src/pages/robots.txt.ts` 保留允许抓取和 sitemap 地址，并自动跟随站点域名及 base。不能把旧插件强压到 Zod 4：它在加载时使用已经移除的函数 schema API。
- `minimatch@<11.0.1` override 到 11.0.1，覆盖 ESLint、config-array、TS-estree、a11y 工具链共享副本。这是跨主版本兼容处理，不是普通补丁；`tests/minimatch-compat.test.ts` 检查匹配/忽略边界与实际 ESLint 消费。上游改用安全范围后再评估移除。
- 新版 Satori 仍固定旧 fflate，使用 `satori>fflate` override 到 0.7.5，修复恶意 ZIP64 无限循环问题；不全局替换无关消费者。
- 保留 KaTeX 0.18.10 的既有安全 override，并显式声明同版依赖以打包 CSS/字体。浏览器不再从 jsDelivr 动态获取公式资源。

- Astro 最低版本提高到 `^7.4.7`，锁定解析为 7.4.7，修复 [GHSA-r3h5-4585-7x3w](https://github.com/advisories/GHSA-r3h5-4585-7x3w)。该公告涉及 Node 适配器图像端点；本站仍为静态构建，不因部署方式不同而忽略依赖审计。
- 仅对 `@astrojs/rss>fast-xml-parser` 设置 5.12.0 override，修复 [GHSA-474x-hrwr-fgx4](https://github.com/advisories/GHSA-474x-hrwr-fgx4)。仍满足 RSS 的 `^5.5.7` 范围，不新增直接依赖；上游要求安全最低版本后再移除。回归测试覆盖真实 RSS 的中文、XML 转义与自定义字段。
- p5 最低版本提高到 `^2.4.0`。该版本不再依赖 i18next，移除了触发 [GHSA-6jcc-5g8w-32mx](https://github.com/advisories/GHSA-6jcc-5g8w-32mx) 的依赖链；审计门禁不变。

- 兼容性约束：仅使用 `@napi-rs/wasm-runtime@1.2.4>@emnapi/runtime` override 到稳定版 1.11.3，修复 Astro check 的 core 1.x 桥接因宽泛 peer 解析到 runtime 2.x 而出现的 `bridge.deleteEnv` 崩溃。不得全局覆盖 runtime：Rolldown 的可选 WASM 分支使用 core 2.0.0-beta.2，必须保留配套 runtime 2.0.0-beta.2。升级旧桥接后再评估移除此局部约束，不通过关闭 strict peer 或忽略检查掩盖。

## 验证重点

严格 peer 安装和审计只证明安装约束及已知漏洞状态，不能代替运行验证。重点覆盖：

- Markdown/MDX、公式、内容元数据、Collections 与草稿过滤；
- lint 的真实文件匹配、私有目录排除与错误负例；
- p5 两种背景的初始化、移除和快速导航；
- robots/sitemap 域名与 base、Pagefind 空索引及中文搜索；
- Satori WOFF2 字体与 SVG → PNG 生成；
- 新格式化器实际加载 `.astro` parser，不借机全仓改写。

OG 功能仍保持原来的关闭状态；升级不等于启用。Windows 路径单元测试是模拟，不能代替真实 Windows CI；镜像系统包和生产公网验收仍需单独检查。

## 此前依赖迁移的本机验证（历史）

- `pnpm install --frozen-lockfile --strict-peer-dependencies` 成功；`pnpm audit` 返回零已知漏洞。
- `pnpm check`：0 errors / warnings / hints；完整 `pnpm lint` 与 `pnpm test` 全部通过。
- `pnpm build` 成功生成全部静态页面；当前没有允许索引的正文，Pagefind 正常跳过，空索引/真实文章索引的测试均通过。
- HTTP 验证首页、Writing、Projects、Collections、默认合集、旧随笔地址、robots、RSS、sitemap 共 9 条路由均返回 200；不存在路径返回 404。构建 CSS 中的 KaTeX 本地字体引用均存在，未保留远程 KaTeX CDN 引用。
- 构建仍提示 p5 分包较大；当前构建的页面均未引用 Dot/Particle 脚本，因此不能把产物大小说成每页加载量，也不能以此代替启用背景后的浏览器验证。Photos 空集合提示保留，不伪造照片数据。
- 全仓 `pnpm format` 仍报告历史文件格式差异；本轮修改文件单独整理，不把依赖迁移变成全仓纯格式提交。尚未进行容器系统扫描、真实 Windows CI 或正式公网验收；没有部署或修改生产域名。

实际浏览器验收曾尝试使用隔离浏览器，但工具无法取得窗口绑定，未获得页面交互或真实 p5 canvas 生命周期证据；该会话已结束，预览服务也已停止。HTTP 与模拟生命周期测试通过不能替代此项。

## 2026-11-14 安全补丁复验

本节是此前全局 runtime override 方案的历史复验，不代表下述收窄方案已通过，也不代表线上版本或发布授权：当时 Astro 实际安装为 7.4.7，RSS 的 fast-xml-parser 为 5.12.0，WASM 桥接运行时统一为稳定版 1.11.3。其余直接依赖版本不变，框架需要的传递依赖随锁文件更新；未新增直接依赖，也未更改 Node/pnpm 版本。

- 在现有工作区以 `pnpm install --frozen-lockfile --strict-peer-dependencies --ignore-scripts --prefer-offline` 成功安装；不是空目录干净安装，未运行安装生命周期脚本。
- 完整 `pnpm audit` 返回零已知漏洞。此环境审计连接曾失败，最终仅为该进程设置 IPv4 优先后成功；未更换 registry、忽略公告或降低门禁。
- `pnpm check`：118 文件，0 errors / 0 warnings / 2 hints（旧 IME `keyCode` 兼容与已有测试的多余 `await`）；完整 `pnpm lint` 通过，`pnpm test` 为 106/106 通过、无跳过。新增测试覆盖安全版本约束及真实 RSS/XML 的中文、转义与自定义字段。
- `pnpm build` 成功导出 5 条日期记录并生成 10 个页面。当前公开 Blog/Shorts 仍均为 `search: false`，Pagefind 按设计跳过，没有开启搜索或发布草稿。
- 产物断言核对 4 篇详情的修改日期、OpenGraph 与 JSON-LD 一致，草稿/模板/私有目录未发布，RSS/sitemap 域名正确。生产预览 HTTP 复验为 14 路径正常、2 个预期 404、32 个内部链接/资源正常；本轮预览进程已停止。
- 既有大 JS 分包警告和全仓格式遗留未处理；格式不是本次安全修复的全绿项目。未执行真人浏览器交互、Docker、真实 Windows CI 或公网验收，未暂存、提交、推送或部署。

## 提交前审查修正（待 CI）

全局 runtime override 已收窄为 `@napi-rs/wasm-runtime@1.2.4>@emnapi/runtime: 1.11.3`，并使用项目 pnpm 重新生成锁文件。Astro check 的旧桥接保留 core/runtime 1.x，两个 Rolldown WASM 可选绑定恢复 core/runtime 2.0.0-beta.2 配对；未升级直接依赖。新增锁文件回归断言防止跨代混配，而不是要求整个依赖图只出现一个 runtime 版本。

此处只记录代码、测试和锁文件的修改，不宣称新方案已通过安装、审计或运行验证。完整冻结安装、类型检查、lint、测试及构建由远端 GitHub CI 执行；本轮未推送或触发工作流。Linux 原生构建不会自动覆盖 Rolldown 的 WASM 可选路径，锁文件断言也不等于完整 WASM 初始化或跨平台验收。

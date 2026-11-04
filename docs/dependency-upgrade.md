# 依赖升级与兼容边界

本页记录当前依赖迁移，不代表已经部署。具体解析版本以 `pnpm-lock.yaml` 为准，检查命令见 [发布清单](release-preparation.md)。

## 升级范围

| 组件                       | 迁移版本         | 关联变化                                                                          |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Astro / MDX                | 7.4.5 / 8.1.2    | 保留现有 unified Markdown processor 与插件链                                      |
| TypeScript                 | 6.0.3            | 移除 `baseUrl`，保留相对 paths，显式加载 Node 类型                                |
| p5                         | 2.3.4            | 使用内置类型，删除 `@types/p5`；背景等待异步初始化和销毁，避免快速导航遗留 canvas |
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

## 验证重点

严格 peer 安装和审计只证明安装约束及已知漏洞状态，不能代替运行验证。重点覆盖：

- Markdown/MDX、公式、内容元数据、Collections 与草稿过滤；
- lint 的真实文件匹配、私有目录排除与错误负例；
- p5 两种背景的初始化、移除和快速导航；
- robots/sitemap 域名与 base、Pagefind 空索引及中文搜索；
- Satori WOFF2 字体与 SVG → PNG 生成；
- 新格式化器实际加载 `.astro` parser，不借机全仓改写。

OG 功能仍保持原来的关闭状态；升级不等于启用。Windows 路径单元测试是模拟，不能代替真实 Windows CI；镜像系统包和生产公网验收仍需单独检查。

## 本轮本机验证

- `pnpm install --frozen-lockfile --strict-peer-dependencies` 成功；`pnpm audit` 返回零已知漏洞。
- `pnpm check`：0 errors / warnings / hints；完整 `pnpm lint` 与 `pnpm test` 全部通过。
- `pnpm build` 成功生成全部静态页面；当前没有允许索引的正文，Pagefind 正常跳过，空索引/真实文章索引的测试均通过。
- HTTP 验证首页、Writing、Projects、Collections、默认合集、旧随笔地址、robots、RSS、sitemap 共 9 条路由均返回 200；不存在路径返回 404。构建 CSS 中的 KaTeX 本地字体引用均存在，未保留远程 KaTeX CDN 引用。
- 构建仍提示 p5 分包较大；当前构建的页面均未引用 Dot/Particle 脚本，因此不能把产物大小说成每页加载量，也不能以此代替启用背景后的浏览器验证。Photos 空集合提示保留，不伪造照片数据。
- 全仓 `pnpm format` 仍报告历史文件格式差异；本轮修改文件单独整理，不把依赖迁移变成全仓纯格式提交。尚未进行容器系统扫描、真实 Windows CI 或正式公网验收；没有部署或修改生产域名。

实际浏览器验收曾尝试使用隔离浏览器，但工具无法取得窗口绑定，未获得页面交互或真实 p5 canvas 生命周期证据；该会话已结束，预览服务也已停止。HTTP 与模拟生命周期测试通过不能替代此项。

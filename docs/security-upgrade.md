# 本地安全升级 · 2026-10-23

## 历史边界

本页保留 2026-10-23 当时的升级与验收记录，不代表当前工作树、进程或线上状态，也不是本次发布授权。当前发布步骤以 [发布清单](release-preparation.md) 和 [部署说明](deployment.md) 为准。

本轮只升级本地工具、项目依赖和待发布配置，**没有 commit、push、触发 GitHub Actions、SSH、镜像发布或部署**。工作区同时保留之前的恢复、视觉和自动写作修改，不能把整份工作树差异误当成本轮安全更新。

本机没有 Docker 引擎。下面的镜像版本与 digest 已核对官方 registry 元信息，但未在本机完成镜像构建、容器运行或系统包扫描。外层反向代理、VPS 系统和现网版本不在本轮修改范围。

## 升级结果

| 项目 | 升级前 | 升级后 |
| --- | --- | --- |
| 本地 Node | 24.21.0 | 已通过现有 nvm 安装 24.22.1，设为 nvm default |
| Docker 构建 Node | 固定 digest 实际为 24.18.0 | 24.22.1-bookworm-slim，新 digest |
| pnpm | 10.33.4 | 10.34.7，本地／packageManager／CI／Docker 同步 |
| Astro | 7.0.7 | 7.4.2 |
| Sharp | 0.35.3 | 0.35.5 |
| Vite | 8.1.3 | 8.3.5，兼容依赖解析结果 |
| Docker Nginx | 固定 digest 实际为 1.27.5 | 1.30.6-alpine，新 digest |
| ESLint / Astro 插件 | 9.39.4 / 1.7.0 | 10.13.0 / 3.2.1 |
| KaTeX | 0.16.47（旧 CSS 0.16.11） | 0.18.10，渲染库和 CSS 同步 |

其他直接与间接依赖在原有主版本约束内更新，见 `package.json` 和 `pnpm-lock.yaml`。未使用 `audit fix --force`，没有审计忽略名单或降低严重级别。

### 本地 Node 的使用

已经安装新 Node，不卸载旧 Node，避免破坏其他项目。`.nvmrc`、`.node-version` 固定为 24.22.1，package engines 限定安全版 Node 24。当前已经打开的终端／编辑器进程可能仍继承旧 PATH；进入项目先运行：

```sh
nvm use
node --version
pnpm --version
```

预期分别为 `v24.22.1` 和 `10.34.7`。当前工具会话的父进程环境不能由子 shell 永久改写；本轮所有升级与回归命令均显式切到新 Node。其他机器不会因为本机安装就自动升级，需按仓库版本文件准备环境。

## 关键修复

- Node 10 月安全版本包含 Brotli、TLS 验证等修复；构建工具虽然不进入最终 Nginx 镜像，仍需要补丁。
- Astro／Sharp 修复恶意 AVIF 和其他图片处理问题，Vite 更新开发服务器修复。开发与 preview 只用于本地，不作为互联网生产服务器。
- CI 从 `pnpm audit --prod` 改为完整 `pnpm audit`：本项目构建依赖都列在 devDependencies，不能漏查。当前更新后已达到零已知漏洞，未来新增公告会继续阻断检查。
- 移除已无调用的 `del-cli`；Pagefind 清理早已使用 Node 标准库。
- 旧 Astro ESLint 解析器仍引入无补丁的 `braces`，升级受支持的 ESLint 10 和 Astro 插件 3 后消除该链。改用原推荐 flat 配置的新入口，没有关闭规则。新规则指出 TagFilter 的三处初值被无条件覆盖，已仅删除多余赋值，异常处理仍在。
- `rehype-katex`／`remark-math` 的上游范围仍落在存在公告的旧 KaTeX 分支，故使用限定旧版本范围的 override 到 0.18.10，并同步 CDN CSS。测试覆盖行内／块级公式、错误公式及不可信 javascript 链接不生成可点击链接。上游兼容范围更新后可评估移除 override；不能只升级 CSS 或强开 `trust`。

## 是否可以之后部署

这些版本配置和锁文件需要随代码进入发布流程，**本机升级不等于线上升级**。之后经用户批准发布时，CI 会使用指定 Node/pnpm、冻结锁文件安装、完整审计、检查和构建，再以新的 Node/Nginx 基础镜像生成站点镜像。

本地回归成功只是待发布依据，不能替代 Docker 构建、GHCR 拉取权限、域名、外层反向代理和 VPS 健康检查。当前决定是 GitHub 只检查并发布 GHCR SHA 镜像，不再持有 VPS SSH 私钥或部署；操作者另行登录服务器，运行 `bash deploy.sh` 拉取选定的完整 SHA 版本，公网验收后手动同步 `.env` 的 `BLOG_IMAGE`。新边界仅在修改后的 workflow 提交并推送后生效；旧 SSH 部署运行停止后，仍需手动清理无其它用途的 `DEPLOY_*` secrets 和专用 `authorized_keys` 授权。本记录不表示这些远程操作已完成，也不授予 push 或部署权限。

## 验证与保留限制

- `pnpm install --frozen-lockfile` 成功，完整 `pnpm audit` 返回 **No known vulnerabilities found**（升级前为 1 Critical、35 High、18 Moderate、3 Low）。这不是未知漏洞不存在的证明，也不覆盖容器系统包。
- `pnpm check`、`pnpm lint`、测试和构建按最终结果记录于发布准备文档。Photos 空集合提示是原有情况。
- pnpm 默认阻止部分依赖安装脚本（如 esbuild／simple-git-hooks），未放开不必要的安装脚本。项目自身 prepare 仍设置原有 pre-commit hook；无自动提交行为。
- 私有 `.local/` 实验依赖没有升级，它不进入正式 Git/Docker/检查范围；不要将旧 Lab 作为公网服务或部署输出。

## 官方依据

- [Node.js 2026-10 安全公告](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Astro AVIF 图像处理公告](https://github.com/advisories/GHSA-26w7-cxv4-gfx2)
- [Sharp librsvg 公告](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- [Vite 开发服务器公告](https://github.com/advisories/GHSA-rq7h-c2jc-7f22)
- [pnpm 10.34.5 修复说明](https://github.com/pnpm/pnpm/releases/tag/v10.34.5)
- [Nginx 官方版本](https://nginx.org/en/download.html)

## 历史最终验收结果

- 使用 Node 24.22.1 / pnpm 10.34.7。空目录重新解析锁文件后，以 `pnpm install --frozen-lockfile --strict-peer-dependencies` 成功安装，移除旧无障碍插件的可选 peer 残留，无未满足 peer 警告。完整审计 0 项已知漏洞。
- `pnpm check`：92 文件，0 errors/warnings/hints；`pnpm lint`、`pnpm test`（14/14）、`pnpm build`（8 个 HTML 页面）、`git diff --check` 全通过。
- 自动写作端到端验收通过：纯 Markdown／MDX、中文文件名、自动日期、相对图片、保存热更新、草稿／私有文件排除、手填覆盖、真实 Pagefind；新增行内／块级公式真实渲染与 CSS 字体检查。没有 Git 的独立源码和依赖目录完成生产构建，日期一致。8 个验收临时文件均删除，3 个既有内容文件哈希不变。
- 生产浏览器自检 30 个页面状态通过：1440/390/320px 双主题、Shorts 导航／历史、减少动态、无 JS、Links 404 且不在导航和 sitemap；0 页面异常。
- 最终审计与工具版本证据：`.local/release-evidence/security-20261023/`；写作、公式实拍与 Git-free 日志在 `.local/release-evidence/automatic-writing/`；页面矩阵在 `.local/release-evidence/shorts-without-links/`。
- 升级后 Astro 支持管理式后台服务，验收结束已通过 `astro dev stop` / `astro preview stop` 清理；4321／4325 均无监听。不留本地预览公网端口。
- 没有暂存、提交、推送、工作流触发或部署；本机缺少 Docker 引擎，实际 Docker／VPS／线上回归仍待之后批准发布时执行。

# 发布准备检查清单

本页是待执行的发布检查清单，不是本轮验收结果，也不授予提交、推送、触发工作流或部署权限。每次发布都应针对同一候选版本重新核对、记录结果；下方历史记录不能代替当前验收。当前方案为 GitHub 只做 CI 与 GHCR 打包，服务器由操作者手动拉取指定 SHA 版本；不再由 Actions SSH 部署。该边界须在修改后的 workflow 提交并推送后才生效，不能把本地文档修改当作远端已切换；迁移前先停止旧部署 workflow 的运行。

## 1. 确定完整发布快照

- [ ] 明确本次发布范围与授权，审阅工作树、暂存区、重命名、删除和未跟踪文件。不能只看已跟踪文件的 diff：发布快照必须包含所需新文件的完整内容及关联修改，避免本地可用、干净检出缺文件。
- [ ] 按功能组核对源码、内容、测试、配置、文档和规格的一致性：恢复与风雾融合、自动写作与日期导出、安全升级，以及当前 Collections 展示与 Shorts 分集变更。以候选版本实际内容为准，不把历史记录当作发布文件清单。
- [ ] 对 Shorts 分集变更，尤其核对 `src/utils/short-collections.ts`、`src/pages/shorts/collections/[id].astro`、`src/content/short-collections/`、`src/content/shorts/` 中的完整新文件及原文件去向、`tests/content-safety.test.ts`、`tests/short-collections.test.ts`、`tests/collection-view.test.ts` 等配套测试，以及关联 schema、loader、路由、组件、配置和文档；确认既有文章 URL 与正文按预期保留。
- [ ] 发布提交排除 `.local/` 私有实验和证据、真实 `.env`、密钥、依赖、生成日期快照 `.post-dates.json`、`.astro/` 与 `dist/`。确认私有文件与本地生成目录不进入 Docker 上下文，不把本地备份当作生产依赖；例外是从完整 Git 历史为候选版本导出的 `.post-dates.json`，它必须供 Git-free Docker 构建使用，但不提交也不对外提供。
- [ ] 候选版本具备完整 Git 历史；自动文章日期依赖历史与文章字节。最终提交形成后，用该确切 SHA 的干净检出重新验证，不能将未提交工作树的 mtime 日期结果当作正式镜像结果。手动 Docker 构建所需日期快照见运维文档。

## 2. 本地检查与生产预览

Node 支持范围以 `package.json` 的 `engines.node` 为准（当前 `>=24.22.1 <25`），pnpm 版本以 `packageManager` 为准（当前 `pnpm@10.34.7`）。同时核对本地版本、CI 和 Dockerfile 的固定版本是否一致；升级时不要只改文档中的版本号。

以下命令是发布时的执行说明，**本页没有宣称本轮已运行或通过**。记录候选 SHA、环境、命令、结果及失败原因；修改后重跑受影响检查。

| 分类 | 命令 | 检查内容与边界 |
| --- | --- | --- |
| 冻结安装 | `pnpm install --frozen-lockfile` | 从锁文件安装，与 CI/Docker 保持一致；锁文件不匹配时停止，不临时更新依赖掩盖问题。 |
| 类型生成 | `pnpm sync` | 生成 Astro 内容及类型信息，不代替类型检查。 |
| 依赖安全 | `pnpm audit` | 审计全部依赖，包括构建工具链；不能仅审计 production 依赖。 |
| 类型检查 | `pnpm check` | Astro 与 TypeScript 检查。 |
| 静态规则 | `pnpm lint` | ESLint，保持零警告门禁。 |
| 自动测试 | `pnpm test` | 运行仓库测试；不等于 Docker 或公网验收。 |
| 格式检查 | `pnpm format` | 独立只读格式检查，不是 `format:write`；不要借发布重排无关历史文件。当前构建发布 workflow 未包含此项。 |
| 生产构建 | `pnpm build` | 包含自动日期导出、静态站点及 Pagefind 后处理；检查产物，不只看退出码。 |
| 人工预览 | `pnpm preview` | 预览上一项生产产物，不用 dev 服务替代生产草稿、路由和搜索验收；完成后停止本次启动的进程。 |

- [ ] 上述各类检查针对候选快照执行并留存结果；阻塞项解决后再发布。CI 当前运行冻结安装、audit、sync、check、lint、test、build；本地格式检查和人工预览仍需单独完成，不能因 CI 未包含而省略。
- [ ] 在生产预览中完成第 5 节同类页面、草稿隔离和搜索检查。Pagefind 只索引配置允许的公开 Blog/Shorts 正文；没有正文标记时应清除旧索引并跳过，不能回退到全站索引，空源文件不能编造正文。

## 3. 生产配置与部署前提

- [ ] 明确正式 HTTPS 域名，并核对 `src/config.ts` 的 `SITE.website` 是正确的生产地址（当前为 `https://onedotmint.com/`）；确认 base、canonical、RSS、sitemap 和资源 URL 与生产入口一致。静态配置变更需要重新构建与发布。
- [ ] 验证候选版本的 Docker 构建、镜像启动和内部健康检查；基础镜像版本与 digest、容器内 Nginx 配置及外层代理版本均需独立核对。本地无 Docker 时明确记为未验证，不以静态构建替代。
- [ ] 确认 GHCR 镜像路径为实际小写仓库路径，Actions 有发布权限，VPS 能拉取镜像（公开包或只读凭据）；首次发布时特别检查包可见性。记录本次 `sha-<40 位小写十六进制完整提交 SHA>` 镜像；不发布或使用 `latest`。
- [ ] 确认操作者可手动登录 VPS，并具有 Docker 权限及部署目录所需的读写、进入权限；服务器具备 Bash、`flock` 与支持 `up --wait` 的 Docker Compose。首次复制 `docker-compose.yml`、`.env.example` 和 `scripts/deploy.sh`（服务器名为 `deploy.sh`），由维护者管理 Compose、`.env` 和脚本，workflow 不访问 VPS。具体步骤见 [deployment.md](deployment.md)。
- [ ] 新 workflow 已推送且旧 SSH 部署运行已停止后，删除不再有其它用途的 GitHub `DEPLOY_*` secrets，以及 VPS `authorized_keys` 中对应的 Actions 专用授权（如果曾配置）；保留操作者正常登录权限。记录实际清理结果，不能假定本地改动已远程撤权。
- [ ] 确认外部 Docker network 存在，站点与反向代理都在同一网络，代理目标为 `mintblog:80`；站点不发布宿主机端口。确认容器重建后代理仍能访问新容器，不能只检查重建前的连通性。
- [ ] 确认公网 DNS 指向预期入口、HTTPS 证书与域名匹配且有效、HTTP/HTTPS 跳转符合预期。容器 `/healthz` 仅说明内部存活，不证明网络、DNS、HTTPS 或公网页面正常。
- [ ] 在部署前记录当前运行镜像、完整 SHA 与精确本地镜像 ID、上次已验收版本、可拉取的回滚镜像、服务器 Compose/环境配置的受控备份（妥善保护凭据，不提交或公开）、回滚命令、负责人及验收入口。不要在确认新版本前清理唯一可用的旧镜像。

## 4. 发布触发边界

- [ ] 获得明确发布授权后才执行发布操作。`.github/workflows/deploy.yml` 保留原路径，显示名为 **Build and publish MintBlog**；push 到 `main`，以及选择 `main` 的手动 `workflow_dispatch`，只在检查通过后发布 GHCR SHA 镜像，不连接或更新 VPS。
- [ ] PR 和非 `main` 分支的手动运行仅验证，不发布镜像。执行前确认事件、分支与候选 SHA；`main` 工作流仍有发布镜像的副作用，但不等于服务器部署授权。
- [ ] 记录 workflow run、完整 SHA 与镜像标签。另获服务器部署授权后，由操作者手动登录 VPS，在含 `docker-compose.yml` 的部署目录运行 `bash deploy.sh 'ghcr.io/owner/repository:sha-<完整SHA>'`（替换为 40 位小写十六进制 SHA），记录操作者、时间、所选版本和结果。
- [ ] 确认脚本先拉取再 `up --wait`，用锁防止同目录并发部署；启动或内部健康失败时恢复旧容器精确本地镜像 ID 并确认健康，无旧容器则停止 `web`。脚本运行期间以参数覆盖 `.env` 的 `BLOG_IMAGE`，不自动改 `.env` 或执行公网验收。

## 5. 部署后公网验收与回滚收尾

以下必须从正式公网 HTTPS 入口检查，不只访问本地 preview 或容器 `/healthz`。

- [ ] 检查首页、Writing（`/blog/`）及公开文章、Projects（`/projects/`）、Collections（`/shorts/`）、公开分集（`/shorts/collections/<id>/`）与既有 Shorts 文章 URL；检查导航、返回链接、图片及静态资源、桌面和移动端交互，以及不存在路径的 404。
- [ ] 检查 canonical、RSS（`/rss.xml`）、sitemap 及其中链接指向正式生产域名；不以页面能打开代替元数据验收。
- [ ] 确认草稿文章、草稿分集及其成员、下划线文件等非公开内容不出现在直接路由、列表、计数、RSS、sitemap 或搜索中；保留的历史 Collections/Articles 不因本次变更意外公开。
- [ ] 实际打开搜索，用公开 Blog/Shorts 的已知正文词检索并访问结果，确认中文、分类、链接和 Pagefind 资源加载正常；草稿及历史私有内容无命中，无可索引正文时无陈旧索引或全站兜底。
- [ ] 确认外层代理在站点容器重建后访问正常，无因旧容器地址缓存导致的 502；必要时按代理运维流程处理并重新验收，不改变现有运行架构。
- [ ] 公网验收失败时按 [Rollback](deployment.md#rollback) 由操作者恢复已知版本；回滚（包括脚本自动恢复）后仍需复查公网、代理、关键页面及搜索，记录操作者、最终运行的镜像、SHA、结果和遗留问题，不能仅以回滚命令成功收尾。
- [ ] 公网验收通过后，手动将服务器 `.env` 的 `BLOG_IMAGE` 同步为最终已验收版本（包括回滚后的版本），防止以后不带参数的 Compose 命令恢复旧默认值；发布记录不能只写 workflow 成功。


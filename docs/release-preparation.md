# 恢复原版后的检查与发布边界

恢复基准为 `ca826e2`，历史验收见 [restoration.md](restoration.md)。后续经确认的轻量风雾与作品内容融合见 [atmosphere-blend.md](atmosphere-blend.md)，仍保留原排版和导航。旧时间轮、Connections、作品档案及视觉实验不在正式源码中；完整成果与工作区已在仓库外验证备份，`.local/` 仍保留。不要为运行旧 Lab 将新引擎重新接回恢复后的站点。

## 检查

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm sync
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm preview
```

- CI 保留 `test` 与 `build` 门禁，Node 24.22.1、pnpm 10.34.7、部署镜像命名与健康检查合同不降级。
- `.local/` 完整排除于 Git、Docker、ESLint、Prettier、TypeScript。正式 src、scripts、tests 仍受检查。
- Pagefind 构建后处理保留修复：没有正文标记时删除旧索引并正常跳过，不索引全站。原版公开 Shorts 与 Blog 的可搜索正文按配置进入索引；空源文件不生成编造正文。
- `pnpm format` 是独立检查；恢复不等于对历史文件做全仓重排版。
- Docker/VPS 的网络、Secrets、域名、镜像访问权限仍需维护者单独确认，详见 [deployment.md](deployment.md)。

## 不自动发布

本轮没有暂存、commit、push、部署、触发工作流或 SSH 操作。当前 HEAD 与真实 Git index 不移动；恢复是可审阅的工作树修改。main 推送或相应手动工作流可能发布，必须由用户确认后自行执行。

## 自动文章信息验收

后续支持 Typora 直接保存纯 Markdown／MDX 到 Blog／Shorts，见 [writing.md](writing.md)。本轮检查：`pnpm check`（91 文件，0 errors/warnings/hints）、`pnpm lint`、`pnpm test`（12/12）、`pnpm build`（清理后仍为 8 个 HTML 页面）、`git diff --check` 均通过。

`.local/release-evidence/automatic-writing/` 保留端到端自检脚本、日志、结果和手机实拍：已实际验证中文文件名、纯 Markdown、MDX 表达式、相对图片、保存热更新、显式配置覆盖、草稿／下划线文件隔离、RSS／sitemap 与真实 Pagefind；无 `.git` 的独立源码及依赖目录也成功完成生产构建，文章日期与 Git 构建一致。8 个临时文件全部清理，3 个既有 Blog／Shorts 文件哈希未变。开发服务已重启以启用新 loader，继续使用 4321。

没有提交、推送或触发工作流；没有 Docker 引擎／VPS 实机验收。CI 已接入完整 Git 历史及自动日期导出，但线上首次执行仍需维护者确认。

## 安全升级后的发布边界

2026-10-23 本地安全升级见 [security-upgrade.md](security-upgrade.md)：Node 24.22.1 / pnpm 10.34.7、Astro 7.4.2、Sharp 0.35.5、Vite 8.3.5，Docker Node/Nginx 版本和 digest 已更新；完整依赖审计零已知漏洞，冻结锁文件严格 peer 安装、92 文件类型检查、Lint、14 项测试、生产构建、自动写作和 30 状态浏览器回归通过。未降低 CI 门禁；现在 CI 审计包含全部构建依赖。

当前只是本地待发布代码，不代表线上组件已更新。本机没有 Docker 引擎，后续正式发布前仍需 Docker 构建、容器健康检查及外层反向代理／VPS 的独立版本核验。没有暂存、commit、push、触发工作流或部署。全部验收预览服务已关闭。

## 本地汇总提交授权

以上“未暂存／未提交”等表述记录的是各阶段验收完成时的历史状态。用户随后明确授权把当前恢复、风雾融合、写作自动化和安全升级整理为**一个本地汇总提交**；该授权不包含 push、触发工作流、镜像发布或部署。私有实验、生成日期快照、依赖、构建输出和真实环境配置仍不进入提交。

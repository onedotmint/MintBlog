import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const logger = {
  info(message) {
    console.log(message)
  },
  error(message) {
    console.error(message)
  },
}

const targetDefinitions = [
  {
    sourcePath: 'blog',
    targetPath: 'src/content/blog',
    label: 'blog posts',
    requiredInStrict: true,
  },
  {
    sourcePath: 'reading',
    targetPath: 'src/content/reading',
    label: 'reading resources',
    requiredInStrict: true,
  },
  {
    sourcePath: 'projects',
    targetPath: 'src/content/projects',
    label: 'projects',
    requiredInStrict: true,
  },
  {
    sourcePath: 'assets/images/blog',
    targetPath: 'public/images/blog',
    label: 'blog images',
    requiredInStrict: false,
  },
  {
    sourcePath: 'assets/images/reading',
    targetPath: 'public/images/reading',
    label: 'reading images',
    requiredInStrict: false,
  },
  {
    sourcePath: 'assets/images/projects',
    targetPath: 'public/images/projects',
    label: 'project images',
    requiredInStrict: false,
  },
  {
    sourcePath: 'assets/files',
    targetPath: 'public/files',
    label: 'files',
    requiredInStrict: false,
  },
]

class SyncContentError extends Error {}

function createTargets(root) {
  return targetDefinitions.map((target) => ({
    ...target,
    target: join(root, target.targetPath),
  }))
}

function fail(message) {
  throw new SyncContentError(message)
}

function validateArgs(args) {
  const allowedArgs = new Set(['--strict'])

  for (const arg of args) {
    if (!allowedArgs.has(arg)) {
      fail(`Unknown argument: ${arg}`)
    }
  }
}

function resolveSourceRoot(value, root) {
  if (!value) {
    return join(root, 'private-content')
  }

  const trimmed = value.trim()

  if (!trimmed) {
    fail('PRIVATE_CONTENT_ROOT cannot be empty')
  }

  return isAbsolute(trimmed) ? resolve(trimmed) : resolve(root, trimmed)
}

function isSameOrInside(parent, child) {
  const path = relative(parent, child)

  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function formatPath(root, path) {
  return relative(root, path) || '.'
}

function assertSafeSourceRoot(root, sourceRoot, targets) {
  for (const { target, label } of targets) {
    if (isSameOrInside(sourceRoot, target) || isSameOrInside(target, sourceRoot)) {
      fail(`PRIVATE_CONTENT_ROOT overlaps ${label} target: ${formatPath(root, target)}`)
    }
  }
}

function hasEntries(path) {
  return existsSync(path) && readdirSync(path, { withFileTypes: true }).some((entry) => entry.name !== '.gitkeep')
}

function resetDirectory(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true })
  }

  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, '.gitkeep'), '\n')
}

function resolveTargetSource(root, target, privateRoot, sampleRoot, strict) {
  const privateSource = join(privateRoot, target.sourcePath)
  const sampleSource = join(sampleRoot, target.sourcePath)

  if (hasEntries(privateSource)) {
    return {
      kind: 'private',
      path: privateSource,
    }
  }

  if (strict) {
    return {
      kind: 'clean',
      path: undefined,
      error: target.requiredInStrict
        ? `Strict mode requires non-empty private ${target.label}: ${formatPath(root, privateSource)}`
        : undefined,
    }
  }

  if (hasEntries(sampleSource)) {
    return {
      kind: 'sample',
      path: sampleSource,
    }
  }

  return {
    kind: 'clean',
    path: undefined,
  }
}

export function runSyncContent(options = {}) {
  const root = options.root ?? defaultRoot
  const args = options.args ?? process.argv.slice(2)
  const env = options.env ?? process.env
  const log = options.logger ?? logger

  try {
    /*
     * ================================================================================
     * 步骤1：解析同步配置
     * ================================================================================
     * 目标：
     * 1) 校验命令行参数，只允许 strict 开关
     * 2) 解析 private-content、sample-content 和同步目标目录
     */
    log.info('开始解析内容同步配置...')

    // 1.1 校验脚本参数
    validateArgs(args)

    // 1.2 解析同步模式和目录
    const strict = args.includes('--strict') || env.PRIVATE_CONTENT_STRICT === '1'
    const privateRoot = resolveSourceRoot(env.PRIVATE_CONTENT_ROOT, root)
    const sampleRoot = join(root, 'sample-content')
    const targets = createTargets(root)

    // 1.3 阻止 private root 与目标目录重叠
    assertSafeSourceRoot(root, privateRoot, targets)
    log.info(`[sync] Start content sync (${strict ? 'strict' : 'sample fallback'})`)
    log.info(`[sync] Private source: ${formatPath(root, privateRoot)}`)
    log.info('内容同步配置解析完成')

    /*
     * ================================================================================
     * 步骤2：同步内容目录
     * ================================================================================
     * 目标：
     * 1) 每个目标先清理为只含 .gitkeep 的空目录
     * 2) private 内容优先；非 strict 模式才回退 sample 内容
     */
    log.info('开始同步内容目录...')

    // 2.1 初始化错误列表和同步统计
    const errors = []
    const summary = {
      private: 0,
      sample: 0,
      clean: 0,
    }

    // 2.2 逐个目标选择来源并同步
    for (const target of targets) {
      const source = resolveTargetSource(root, target, privateRoot, sampleRoot, strict)

      resetDirectory(target.target)

      if (source.error) {
        errors.push(source.error)
        summary.clean += 1
        log.info(`[sync] Cleaned ${target.label}: ${formatPath(root, target.target)}`)
        continue
      }

      if (!source.path) {
        summary.clean += 1
        log.info(`[sync] Cleaned ${target.label}: ${formatPath(root, target.target)}`)
        continue
      }

      cpSync(source.path, target.target, { recursive: true })
      summary[source.kind] += 1
      log.info(`[sync] Synced ${target.label} from ${source.kind}: ${formatPath(root, source.path)}`)
    }

    log.info('内容目录同步完成')

    /*
     * ================================================================================
     * 步骤3：返回同步结果
     * ================================================================================
     * 目标：
     * 1) strict 缺失必填 private 内容时返回失败码
     * 2) 成功时输出 private/sample/clean 统计
     */
    log.info('开始汇总内容同步结果...')

    // 3.1 strict 缺失必填内容时报告所有错误
    if (errors.length > 0) {
      log.error('[sync] failed')

      for (const error of errors) {
        log.error(`[sync] ${error}`)
      }

      return 1
    }

    // 3.2 同步成功时返回通过码
    log.info(`[sync] ok: ${summary.private} private, ${summary.sample} sample, ${summary.clean} cleaned`)
    log.info('内容同步结果汇总完成')
    return 0
  } catch (error) {
    if (error instanceof SyncContentError) {
      log.error(`[sync] ${error.message}`)
      return 1
    }

    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runSyncContent())
}

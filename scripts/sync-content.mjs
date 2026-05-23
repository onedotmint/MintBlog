import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict') || process.env.PRIVATE_CONTENT_STRICT === '1'
const logger = {
  info(message) {
    console.log(message)
  },
  error(message) {
    console.error(message)
  },
}

const targets = [
  {
    sourcePath: 'blog',
    target: join(root, 'src/content/blog'),
    label: 'blog posts',
    requiredInStrict: true,
  },
  {
    sourcePath: 'assets/images/blog',
    target: join(root, 'public/images/blog'),
    label: 'blog images',
    requiredInStrict: false,
  },
  {
    sourcePath: 'assets/images/projects',
    target: join(root, 'public/images/projects'),
    label: 'project images',
    requiredInStrict: false,
  },
  {
    sourcePath: 'assets/files',
    target: join(root, 'public/files'),
    label: 'files',
    requiredInStrict: false,
  },
]

function fail(message) {
  logger.error(`[sync] ${message}`)
  process.exit(1)
}

function validateArgs() {
  const allowedArgs = new Set(['--strict'])

  for (const arg of process.argv.slice(2)) {
    if (!allowedArgs.has(arg)) {
      fail(`Unknown argument: ${arg}`)
    }
  }
}

function resolveSourceRoot(value) {
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

function formatPath(path) {
  return relative(root, path) || '.'
}

function assertSafeSourceRoot(sourceRoot) {
  for (const { target, label } of targets) {
    if (isSameOrInside(sourceRoot, target) || isSameOrInside(target, sourceRoot)) {
      fail(`PRIVATE_CONTENT_ROOT overlaps ${label} target: ${formatPath(target)}`)
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

function resolveTargetSource(target, privateRoot, sampleRoot) {
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
        ? `Strict mode requires non-empty private ${target.label}: ${formatPath(privateSource)}`
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

validateArgs()

const privateRoot = resolveSourceRoot(process.env.PRIVATE_CONTENT_ROOT)
const sampleRoot = join(root, 'sample-content')
const errors = []
const summary = {
  private: 0,
  sample: 0,
  clean: 0,
}

assertSafeSourceRoot(privateRoot)

logger.info(`[sync] Start content sync (${strict ? 'strict' : 'sample fallback'})`)
logger.info(`[sync] Private source: ${formatPath(privateRoot)}`)

for (const target of targets) {
  const source = resolveTargetSource(target, privateRoot, sampleRoot)

  resetDirectory(target.target)

  if (source.error) {
    errors.push(source.error)
    summary.clean += 1
    logger.info(`[sync] Cleaned ${target.label}: ${formatPath(target.target)}`)
    continue
  }

  if (!source.path) {
    summary.clean += 1
    logger.info(`[sync] Cleaned ${target.label}: ${formatPath(target.target)}`)
    continue
  }

  cpSync(source.path, target.target, { recursive: true })
  summary[source.kind] += 1
  logger.info(`[sync] Synced ${target.label} from ${source.kind}: ${formatPath(source.path)}`)
}

if (errors.length > 0) {
  logger.error('[sync] failed')

  for (const error of errors) {
    logger.error(`[sync] ${error}`)
  }

  process.exit(1)
}

logger.info(`[sync] ok: ${summary.private} private, ${summary.sample} sample, ${summary.clean} cleaned`)

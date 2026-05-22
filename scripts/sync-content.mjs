import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = process.env.PRIVATE_CONTENT_ROOT
  ? join(root, process.env.PRIVATE_CONTENT_ROOT)
  : join(root, 'private-content')

const targets = [
  {
    source: join(sourceRoot, 'blog'),
    target: join(root, 'src/content/blog'),
    label: 'blog posts',
  },
  {
    source: join(sourceRoot, 'assets/images/blog'),
    target: join(root, 'public/images/blog'),
    label: 'blog images',
  },
  {
    source: join(sourceRoot, 'assets/images/projects'),
    target: join(root, 'public/images/projects'),
    label: 'project images',
  },
  {
    source: join(sourceRoot, 'assets/files'),
    target: join(root, 'public/files'),
    label: 'files',
  },
]

function hasEntries(path) {
  return existsSync(path) && readdirSync(path, { withFileTypes: true }).length > 0
}

function resetDirectory(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true })
  }

  mkdirSync(path, { recursive: true })
}

for (const { source, target, label } of targets) {
  if (!hasEntries(source)) {
    console.log(`[sync] Skip ${label}: ${source} is missing or empty`)
    continue
  }

  resetDirectory(target)
  cpSync(source, target, { recursive: true })
  console.log(`[sync] Synced ${label}`)
}

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(root, 'package.json')
const distPath = join(root, 'dist')

const allowedDependencies = new Set(['@astrojs/mdx', 'astro'])
const allowedDevDependencies = new Set(['@astrojs/check', '@types/node', 'typescript'])

const distBudget = {
  totalBytes: 5 * 1024 * 1024,
  jsBytes: 50 * 1024,
  jsFileCount: 5,
}

const shouldCheckDist = process.argv.includes('--dist')

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fail(message) {
  console.error(`[budget] ${message}`)
  process.exitCode = 1
}

function checkDependencyGroup(packageJson, key, allowed) {
  const actual = Object.keys(packageJson[key] ?? {}).sort()
  const unexpected = actual.filter((name) => !allowed.has(name))

  if (unexpected.length > 0) {
    fail(`Unexpected ${key}: ${unexpected.join(', ')}`)
  }
}

function walkFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(path))
      continue
    }

    if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function checkDistBudget() {
  if (!existsSync(distPath)) {
    fail('dist/ does not exist. Run npm run build before checking dist budget.')
    return
  }

  const files = walkFiles(distPath)
  const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0)
  const jsFiles = files.filter((file) => extname(file) === '.js')
  const jsBytes = jsFiles.reduce((sum, file) => sum + statSync(file).size, 0)

  if (totalBytes > distBudget.totalBytes) {
    fail(`dist/ size ${formatBytes(totalBytes)} exceeds ${formatBytes(distBudget.totalBytes)}`)
  }

  if (jsFiles.length > distBudget.jsFileCount) {
    fail(`Generated JavaScript count ${jsFiles.length} exceeds ${distBudget.jsFileCount}`)
  }

  if (jsBytes > distBudget.jsBytes) {
    fail(`Generated JavaScript size ${formatBytes(jsBytes)} exceeds ${formatBytes(distBudget.jsBytes)}`)
  }

  if (process.exitCode) {
    const jsList = jsFiles.map((file) => relative(root, file)).join(', ')
    console.error(`[budget] JavaScript files: ${jsList || '(none)'}`)
    return
  }

  console.log(
    `[budget] dist ok: total ${formatBytes(totalBytes)}, js ${formatBytes(jsBytes)} in ${jsFiles.length} file(s)`,
  )
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

checkDependencyGroup(packageJson, 'dependencies', allowedDependencies)
checkDependencyGroup(packageJson, 'devDependencies', allowedDevDependencies)

if (!process.exitCode) {
  console.log('[budget] dependencies ok')
}

if (shouldCheckDist) {
  checkDistBudget()
}

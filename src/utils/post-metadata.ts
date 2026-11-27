import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative, resolve, sep } from 'node:path'

interface PostDates {
  pubDate: string
  lastModDate: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function postFileHash(filePath: string) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

export function getPostDates(root: string, filePath: string): PostDates {
  const path = relative(root, resolve(filePath)).split(sep).join('/')
  if (
    !/^src\/content\/(blog|shorts|projects\/posts)\/.+\.(md|mdx)$/.test(path) ||
    path.split('/').includes('..')
  )
    throw new Error(`Post is outside a dated content collection: ${path}`)

  if (existsSync(join(root, '.git'))) {
    const git = (...args: string[]) =>
      execFileSync('git', ['--literal-pathspecs', '-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    if (git('rev-parse', '--is-shallow-repository') === 'true')
      throw new Error(
        'Automatic post dates need full Git history. Run git fetch --unshallow, or use checkout fetch-depth: 0.',
      )
    const dates = git('log', '--follow', '--format=%cI', '--', path)
      .split('\n')
      .filter(Boolean)
    if (dates.length)
      return {
        pubDate: new Date(dates.at(-1)!).toISOString(),
        lastModDate: new Date(dates[0]).toISOString(),
      }
    // Uncommitted new files have no publication history; this is a local preview date.
    const date = statSync(filePath).mtime.toISOString()
    return { pubDate: date, lastModDate: date }
  }

  const snapshotPath = join(root, '.post-dates.json')
  const snapshot: unknown = existsSync(snapshotPath)
    ? JSON.parse(readFileSync(snapshotPath, 'utf8'))
    : null
  const entry =
    isRecord(snapshot) && snapshot.version === 1 && isRecord(snapshot.posts)
      ? snapshot.posts[path]
      : undefined
  if (
    isRecord(entry) &&
    entry.hash === postFileHash(filePath) &&
    typeof entry.pubDate === 'string' &&
    Number.isFinite(Date.parse(entry.pubDate)) &&
    typeof entry.lastModDate === 'string' &&
    Number.isFinite(Date.parse(entry.lastModDate))
  )
    return { pubDate: entry.pubDate, lastModDate: entry.lastModDate }

  throw new Error(
    `Cannot determine dates for ${path}. Before building without Git (including Docker), run pnpm content:dates in the full Git checkout. The snapshot must match the current Markdown.`,
  )
}

const postDatePattern =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?)?$/

export function parsePostDate(value: unknown): Date {
  if (value instanceof Date || typeof value === 'number') return new Date(value)
  const parts = typeof value === 'string' && postDatePattern.exec(value.trim())
  if (!parts) return new Date(NaN)

  const [, year, month, day, time, zone] = parts
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const midnight = new Date(`${date}T00:00:00Z`)
  // Date silently rolls some invalid calendar dates into the following month.
  if (
    !Number.isFinite(+midnight) ||
    midnight.toISOString().slice(0, 10) !== date
  )
    return new Date(NaN)
  return time ? new Date(`${date}T${time}${zone ?? 'Z'}`) : midnight
}

export function fillPostMetadata(
  root: string,
  filePath: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data }
  if (result.title === undefined)
    result.title = basename(filePath, extname(filePath))

  if (
    result.pubDate === undefined ||
    result.lastModDate === undefined ||
    result.lastModDate === ''
  ) {
    const dates = getPostDates(root, filePath)
    if (result.pubDate === undefined) result.pubDate = dates.pubDate
    if (result.lastModDate === undefined || result.lastModDate === '') {
      const published = parsePostDate(result.pubDate)
      const updated = new Date(dates.lastModDate)
      result.lastModDate =
        published > updated ? published.toISOString() : dates.lastModDate
    }
  }
  return result
}

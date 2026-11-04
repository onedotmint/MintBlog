import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { fillPostMetadata, getPostDates } from '../src/utils/post-metadata.ts'

const exporter = fileURLToPath(
  new URL('../scripts/export-post-dates.ts', import.meta.url)
)
const first = '2025-12-31T23:30:00Z'
const second = '2026-02-03T05:00:00Z'

function fixture(
  run: (root: string, git: (...args: string[]) => string) => void
) {
  const root = mkdtempSync(join(tmpdir(), 'mintblog-post-metadata-'))
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  try {
    mkdirSync(join(root, 'src/content/blog'), { recursive: true })
    mkdirSync(join(root, 'src/content/shorts'), { recursive: true })
    git('init', '-q')
    git('config', 'user.name', 'Metadata Test')
    git('config', 'user.email', 'metadata@example.invalid')
    git('config', 'commit.gpgsign', 'false')
    git('commit', '--allow-empty', '-qm', 'baseline')
    run(root, git)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function commit(root: string, date: string) {
  execFileSync('git', ['-C', root, 'add', '.'], { stdio: 'pipe' })
  execFileSync('git', ['-C', root, 'commit', '-qm', 'content'], {
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    stdio: 'pipe',
  })
}

test('pure Markdown gets filename and Git dates, keeps source intact, and follows renames', () => {
  fixture((root, git) => {
    const original = join(root, 'src/content/blog/第一篇笔记.md')
    writeFileSync(original, '这里是正文。\n\n## 小节\n\n更多内容。\n')
    commit(root, first)
    const bytes = readFileSync(original)
    assert.deepEqual(fillPostMetadata(root, original, {}), {
      title: '第一篇笔记',
      pubDate: new Date(first).toISOString(),
      lastModDate: '',
    })
    assert.deepEqual(readFileSync(original), bytes)
    writeFileSync(original, bytes + '\n新的一段。\n')
    commit(root, second)
    assert.deepEqual(getPostDates(root, original), {
      pubDate: new Date(first).toISOString(),
      lastModDate: new Date(second).toISOString(),
    })
    assert.equal(
      fillPostMetadata(root, original, {}).lastModDate,
      new Date(second).toISOString()
    )
    const renamed = join(root, 'src/content/blog/改名后的笔记.md')
    git('mv', original, renamed)
    commit(root, '2026-03-04T10:00:00Z')
    assert.equal(
      getPostDates(root, renamed).pubDate,
      new Date(first).toISOString()
    )
    assert.equal(fillPostMetadata(root, renamed, {}).title, '改名后的笔记')
  })
})

test('explicit metadata wins, including empty lastModDate, drafts and invalid fields', () => {
  fixture((root) => {
    const path = join(root, 'src/content/shorts/a.mdx')
    writeFileSync(path, 'An MDX note: {2 + 2}.\n')
    commit(root, first)
    const explicit = {
      title: 'Custom',
      pubDate: '2020-01-02',
      lastModDate: '',
      draft: true,
      search: false,
    }
    assert.deepEqual(fillPostMetadata(root, path, explicit), explicit)
    assert.deepEqual(
      fillPostMetadata(root, path, {
        title: '',
        pubDate: 'invalid',
        lastModDate: null,
      }),
      { title: '', pubDate: 'invalid', lastModDate: null }
    )
    assert.equal(
      fillPostMetadata(root, path, { pubDate: 'invalid' }).pubDate,
      'invalid'
    )
    assert.equal(
      fillPostMetadata(root, path, { pubDate: '2030-01-01' }).lastModDate,
      ''
    )
  })
})

test('new local notes use mtime temporarily, but committed dates ignore filesystem copy times', () => {
  fixture((root) => {
    const path = join(root, 'src/content/blog/local.md')
    writeFileSync(path, 'A new note.\n')
    utimesSync(path, new Date(first), new Date(first))
    assert.equal(
      getPostDates(root, path).pubDate,
      new Date(first).toISOString()
    )
    commit(root, second)
    utimesSync(path, new Date('2040-01-01'), new Date('2040-01-01'))
    assert.equal(
      getPostDates(root, path).pubDate,
      new Date(second).toISOString()
    )
  })
})

test('Git-free builds require an exact date snapshot, never invent a deployment date', () => {
  fixture((root) => {
    const path = join(root, 'src/content/blog/offline.md')
    writeFileSync(path, 'Content for a container.\n')
    commit(root, first)
    const expected = fillPostMetadata(root, path, {})
    execFileSync(process.execPath, ['--experimental-strip-types', exporter], {
      cwd: root,
      stdio: 'pipe',
    })
    const snapshot = readFileSync(join(root, '.post-dates.json'))
    execFileSync(process.execPath, ['--experimental-strip-types', exporter], {
      cwd: root,
      stdio: 'pipe',
    })
    assert.deepEqual(readFileSync(join(root, '.post-dates.json')), snapshot)
    renameSync(join(root, '.git'), join(root, '.saved-git'))
    utimesSync(path, new Date('2040-01-01'), new Date('2040-01-01'))
    assert.deepEqual(fillPostMetadata(root, path, {}), expected)
    writeFileSync(path, 'Changed after snapshot.\n')
    assert.throws(() => fillPostMetadata(root, path, {}), /snapshot must match/)
    rmSync(join(root, '.post-dates.json'))
    assert.throws(() => fillPostMetadata(root, path, {}), /pnpm content:dates/)
    assert.deepEqual(
      fillPostMetadata(root, path, { pubDate: '2020-01-01', lastModDate: '' }),
      { title: 'offline', pubDate: '2020-01-01', lastModDate: '' }
    )
  })
})

test('shallow history is rejected rather than silently assigning the wrong first date', () => {
  fixture((root, git) => {
    const path = join(root, 'src/content/blog/shallow.md')
    writeFileSync(path, 'A note.\n')
    commit(root, first)
    writeFileSync(path, 'An updated note.\n')
    commit(root, second)
    writeFileSync(join(root, '.git/shallow'), git('rev-parse', 'HEAD') + '\n')
    assert.throws(() => getPostDates(root, path), /full Git history/)
  })
})

test('post filenames are literal Git paths, not pathspec patterns', () => {
  fixture((root) => {
    const path = join(root, 'src/content/blog/[example].md')
    writeFileSync(path, 'Brackets in a filename.\n')
    commit(root, first)
    assert.equal(
      getPostDates(root, path).pubDate,
      new Date(first).toISOString()
    )
    assert.throws(
      () => getPostDates(root, join(root, '../outside.md')),
      /outside a dated content collection/
    )
  })
})

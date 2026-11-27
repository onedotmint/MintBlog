import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { CollectionEntry } from 'astro:content'
import { postFileHash } from '../src/utils/post-metadata.ts'
import { groupShorts } from '../src/utils/short-collections.ts'

const astro = (path: string) =>
  new URL(path, import.meta.resolve('astro/package.json'))
const repo = (path: string) => new URL(`../${path}`, import.meta.url)

// Use Astro's real content sync, including YAML parsing, glob IDs, and date validation.
test('Astro loads path-based Shorts IDs and timezone-independent post dates', async () => {
  const { MutableDataStore } = await import(
    astro('dist/content/mutable-data-store.js').href
  )
  const { getRouteGenerator } = await import(
    astro('dist/core/routing/generator.js').href
  )
  const { getOutFolder, getOutFile } = await import(
    astro('dist/core/build/common.js').href
  )
  const root = mkdtempSync(join(tmpdir(), 'mintblog-post-loader-'))
  try {
    symlinkSync(
      fileURLToPath(repo('node_modules')),
      join(root, 'node_modules'),
      'junction',
    )
    writeFileSync(
      join(root, 'astro.config.mjs'),
      `export default { cacheDir: './cache' }`,
    )
    writeFileSync(join(root, 'package.json'), '{"type":"module"}')
    mkdirSync(join(root, 'src'))
    writeFileSync(
      join(root, 'src/content.config.ts'),
      `export { collections } from ${JSON.stringify(fileURLToPath(repo('src/content.config.ts')))};`,
    )

    function markdown(path: string, frontmatter: string) {
      const file = join(root, 'src/content', path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, `---\n${frontmatter}\n---\n\nA note.\n`)
    }

    markdown(
      'shorts/Private Notes/index.md',
      "slug: root-leak\ncollection: notes\npubDate: 2030-01-02T01:30\nlastModDate: ''",
    )
    markdown('short-collections/Private Notes.md', 'slug: decoy\ndraft: true')
    markdown(
      'shorts/生活 切片/WeekEnd/index.md',
      "pubDate: 2030-1-2\nlastModDate: '2030-01-03T01:30:00+08:00'",
    )
    markdown(
      'blog/offset.md',
      "pubDate: '2030-01-02T01:30:00-08:00'\nlastModDate: '2030-01-02T06:30'",
    )
    markdown(
      'projects/posts/epoch.md',
      "pubDate: 0\nlastModDate: '2030-01-02T00:00:00Z'",
    )
    const originalPath = 'src/content/shorts/astro-content-collections.md'
    copyFileSync(repo(originalPath), join(root, originalPath))
    const date = '2020-01-01T00:00:00.000Z'
    const snapshot = [
      originalPath,
      'src/content/shorts/Private Notes/index.md',
    ].map((path) => [
      path,
      {
        hash: postFileHash(join(root, path)),
        pubDate: date,
        lastModDate: date,
      },
    ])
    writeFileSync(
      join(root, '.post-dates.json'),
      JSON.stringify({ version: 1, posts: Object.fromEntries(snapshot) }),
    )

    for (const TZ of ['Asia/Shanghai', 'America/Los_Angeles']) {
      execFileSync(
        process.execPath,
        [fileURLToPath(astro('bin/astro.mjs')), 'sync'],
        {
          cwd: root,
          env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', TZ },
          stdio: 'pipe',
        },
      )
      const store = await MutableDataStore.fromFile(
        join(root, 'cache/data-store.json'),
      )
      const posts: CollectionEntry<'shorts'>[] = store
        .values('shorts')
        .map((entry: Omit<CollectionEntry<'shorts'>, 'collection'>) => ({
          ...entry,
          collection: 'shorts',
        }))
      const overrides: CollectionEntry<'shortCollections'>[] = store
        .values('shortCollections')
        .map(
          (entry: Omit<CollectionEntry<'shortCollections'>, 'collection'>) => ({
            ...entry,
            collection: 'shortCollections',
          }),
        )
      assert.deepEqual(
        overrides.map(({ id }) => id),
        ['Private Notes'],
      )
      const [draft] = groupShorts(overrides, posts, false).filter(
        (group) => group.draft,
      )
      assert.deepEqual(
        draft.posts.map(({ id }) => id),
        ['Private Notes/index'],
      )
      const publicPosts = groupShorts(overrides, posts, true).flatMap(
        ({ posts }) => posts,
      )
      assert.deepEqual(publicPosts.map(({ id }) => id).sort(), [
        'astro-content-collections',
        '生活 切片/WeekEnd/index',
      ])
      for (const [collection, id, published, updated] of [
        [
          'shorts',
          'Private Notes/index',
          '2030-01-02T01:30:00.000Z',
          '2030-01-02T01:30:00.000Z',
        ],
        [
          'shorts',
          'astro-content-collections',
          '2026-07-25T00:00:00.000Z',
          '2026-07-25T00:00:00.000Z',
        ],
        [
          'shorts',
          '生活 切片/WeekEnd/index',
          '2030-01-02T00:00:00.000Z',
          '2030-01-02T17:30:00.000Z',
        ],
        [
          'blog',
          'offset',
          '2030-01-02T09:30:00.000Z',
          '2030-01-02T06:30:00.000Z',
        ],
        [
          'projectPosts',
          'epoch',
          '1970-01-01T00:00:00.000Z',
          '2030-01-02T00:00:00.000Z',
        ],
      ]) {
        const { pubDate, lastModDate } = store.get(collection, id).data
        assert.equal(pubDate.toISOString(), published, `${TZ}: ${id} pubDate`)
        assert.equal(
          lastModDate.toISOString(),
          updated,
          `${TZ}: ${id} lastModDate`,
        )
      }

      const generate = getRouteGenerator(
        [[{ content: 'shorts' }], [{ content: '...slug', spread: true }]],
        'always',
      )
      const outRoot = pathToFileURL(`${join(root, 'dist')}/`)
      for (const { id } of publicPosts) {
        const pathname = generate({ slug: id })
        assert.equal(pathname, `/shorts/${id}/`)
        const routeData = { type: 'page' }
        const outFolder = getOutFolder({
          outRoot,
          buildFormat: 'directory',
          pathname,
          routeData,
        })
        const output = getOutFile('directory', outFolder, pathname, routeData)
        assert.equal(
          fileURLToPath(output),
          join(root, 'dist/shorts', id, 'index.html'),
        )
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

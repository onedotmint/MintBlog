import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function transpileCjs(relativePath: string, replaceImportMeta = false) {
  let source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  if (replaceImportMeta) {
    source = source.replaceAll('import.meta.env', '({ PROD: false })')
  }
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
}

const rssCode = transpileCjs('../src/pages/rss.xml.js')
const pathCode = transpileCjs('../src/utils/path.ts')
const dataCode = transpileCjs('../src/utils/data.ts', true)

function loadModule(code: string, mocks: Record<string, unknown>) {
  const mod = { exports: {} as Record<string, unknown> }
  runInNewContext(code, {
    exports: mod.exports,
    module: mod,
    URL,
    require: (id: string) => {
      if (id in mocks) return mocks[id]
      throw new Error(`Unexpected import: ${id}`)
    },
  })
  return mod.exports
}

async function runRss(website: string, base: string, posts: unknown[]) {
  const getCollection = async (name: string) => {
    assert.equal(name, 'blog')
    return posts
  }
  const pathMod = loadModule(pathCode, { 'astro:config/server': { base } })
  const dataMod = loadModule(dataCode, {
    'astro:content': { getCollection },
    './short-collections': { groupShorts: () => [] },
  })
  const rssMod = loadModule(rssCode, {
    'astro:content': { getCollection },
    '@astrojs/rss': {
      __esModule: true,
      default: (options: unknown) => options,
    },
    '~/config': {
      SITE: {
        title: 'MintBlog',
        description: 'Test description',
        website,
        author: 'dotmint',
        base,
      },
    },
    '~/utils/path': pathMod,
    '~/utils/data': dataMod,
  })
  const raw = await (rssMod.GET as () => Promise<unknown>)()
  return JSON.parse(JSON.stringify(raw)) as {
    title: string
    description: string
    site: string
    customData: string
    stylesheet: string
    items: Array<Record<string, unknown>>
  }
}

test('rss resolves image URL, stylesheet, and item links across root and subpath bases', async () => {
  const post = {
    id: 'hello-world',
    data: {
      title: 'Hello World',
      description: 'First post',
      pubDate: new Date('2026-01-15T00:00:00Z'),
    },
  }
  for (const [website, base, prefix] of [
    ['https://blog.example.com/', '/', '/'],
    ['https://blog.example.com', '/notes', '/notes/'],
    ['https://blog.example.com/', '/notes/', '/notes/'],
  ] as const) {
    const rss = await runRss(website, base, [post])
    assert.equal(rss.title, 'MintBlog')
    assert.equal(rss.description, 'Test description')
    assert.equal(rss.site, website)
    assert.equal(rss.stylesheet, `${prefix}rss-styles.xsl`)
    assert.ok(
      rss.customData.includes(
        `<url>https://blog.example.com${prefix}icon-512.png</url>`,
      ),
    )
    assert.ok(rss.customData.includes(`<link>${website}</link>`))
    assert.deepEqual(rss.items, [
      {
        title: 'Hello World',
        link: `${prefix}blog/hello-world/`,
        pubDate: '2026-01-15T00:00:00.000Z',
        description: 'First post',
        author: 'dotmint',
      },
    ])
  }
})

test('rss excludes drafts in dev mode, sorts descending, and prefers data.redirect', async () => {
  const rss = await runRss('https://blog.example.com/', '/notes', [
    {
      id: 'older',
      data: {
        title: 'Older',
        description: 'Old',
        pubDate: new Date('2026-01-01T00:00:00Z'),
      },
    },
    {
      id: 'draft',
      data: {
        title: 'Draft',
        description: 'Skip',
        pubDate: new Date('2026-03-01T00:00:00Z'),
        draft: true,
      },
    },
    {
      id: 'newer',
      data: {
        title: 'Newer',
        description: 'Ext',
        pubDate: new Date('2026-02-01T00:00:00Z'),
        redirect: 'https://external.example.com/article',
      },
    },
  ])
  assert.deepEqual(
    rss.items.map((item) => [item.title, item.link, item.pubDate]),
    [
      [
        'Newer',
        'https://external.example.com/article',
        '2026-02-01T00:00:00.000Z',
      ],
      ['Older', '/notes/blog/older/', '2026-01-01T00:00:00.000Z'],
    ],
  )
})

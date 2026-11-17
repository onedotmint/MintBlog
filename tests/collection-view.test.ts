import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const readSource = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('CardView only renders collection cards and its caller needs no collection type', () => {
  const source = readSource('src/components/views/CardView.astro')
  const page = readSource('src/pages/shorts/index.mdx')

  assert.doesNotMatch(
    source,
    /collectionType|CollectionKey|getFilteredPosts|sortPostsByField/
  )
  assert.match(
    source,
    /const dataForGrid: CardItemData\[\] = \(await getShortCollections\(\)\)\.map/
  )
  assert.match(
    source,
    /new Set\(group\.posts\.flatMap\(\(post\) => post\.data\.tags\)\)/
  )
  assert.match(source, /const isEmpty = dataForGrid\.length === 0/)
  assert.match(source, /const tags = tagEnabled/)
  assert.match(page, /<CardView pageTag=\{true\} \/>/)
})

test('post and collection draft previews independently explain both publishing settings', () => {
  const source = readSource('src/components/views/RenderPost.astro')
  const warnings = [
    ...source.matchAll(/\{([^{}]+) && <Warning html=\{(\w+)\} \/>\}/g),
  ].map(([, condition, name]) => {
    const message = source.match(new RegExp('const ' + name + ' = `([^`]+)`'))
    assert.ok(message, `${name} must remain a static HTML literal`)
    assert.doesNotMatch(message[1], /\$\{/)
    return { condition, name, html: message[1] }
  })
  assert.equal(warnings.length, 2)

  for (const isDraft of [false, true]) {
    for (const collectionDraft of [undefined, false, true]) {
      const visible = warnings.filter(({ condition }) =>
        runInNewContext(condition, {
          isDraft,
          shortCollection:
            collectionDraft === undefined
              ? undefined
              : {
                  draft: collectionDraft,
                  id: '<img src=x onerror=alert(1)>',
                  title: '<script>alert(1)</script>',
                },
        })
      )
      assert.deepEqual(visible.map(({ name }) => name), [
        ...(isDraft ? ['WARNING'] : []),
        ...(collectionDraft ? ['COLLECTION_WARNING'] : []),
      ])
      for (const { html } of visible) {
        assert.match(html, /will not be published/)
        assert.match(html, /<code>draft<\/code>/)
        assert.match(html, /<code>false<\/code> or remove it/)
        assert.doesNotMatch(html, /<img|<script/)
      }
    }
  }

  assert.match(warnings[0].html, /post's[\s\S]+frontmatter/)
  assert.match(warnings[1].html, /collection[\s\S]+all its posts/)
  assert.match(
    warnings[1].html,
    /override file in <code>src\/content\/short-collections\//
  )
})

test('project Markdown alone supplies grouped cards, stable URLs, ordering and draft previews', async () => {
  const source = readSource('src/components/views/GroupView.astro')
  assert.doesNotMatch(source, /data\.json|detailSlugs|projectOrder/)
  assert.match(readSource('src/pages/projects.mdx'), /<GroupView pageToc=\{true\} \/>/)
  const code = source.match(/const projects = ([\s\S]*?)\/\* Toc \*\//)
  assert.ok(code)
  const post = (id: string, category: string, date: string, draft = false) => ({
    id,
    data: { title: 'Same title', category, description: 'Intro', icon: 'i-ri-code-line', pubDate: new Date(date), draft },
  })
  const posts = [
    post('older', 'Now', '2025-01-01'),
    post('nested/b', '__proto__', '2026-01-01'),
    post('nested/a', '__proto__', '2026-01-01'),
    post('draft', 'Labs', '2027-01-01', true),
  ]
  for (const production of [false, true]) {
    const groups: Map<string, Array<{ title: string; href: string; desc: string; icon: string }>> =
      await runInNewContext(
        '(async () => { const projects = ' + code[1]
          .replaceAll('import.meta.env.PROD', 'production')
          .replace('new Map<string, GroupItemData[]>()', 'new Map()') + '; return data })()',
        {
          production,
          withBasePath: (path: string) => '/base' + path,
          async getCollection(collection: string, filter: (post: (typeof posts)[number]) => boolean) {
            assert.equal(collection, 'projectPosts')
            return posts.filter(filter)
          },
        },
      )
    assert.deepEqual(Array.from(groups.keys()), production ? ['__proto__', 'Now'] : ['Labs', '__proto__', 'Now'])
    const items = Array.from(groups.values()).flatMap((items) => Array.from(items))
    assert.deepEqual(items.map((item) => item.href), [
      ...(!production ? ['/base/projects/draft/'] : []),
      '/base/projects/nested/a/', '/base/projects/nested/b/', '/base/projects/older/',
    ])
    assert.ok(items.every((item) => item.desc === 'Intro' && item.icon === 'i-ri-code-line'))
    assert.equal(items[0].title, production ? 'Same title' : 'Same title（草稿）')
  }
})


test('project draft detail routes are available in development but excluded from production', async () => {
  const source = readSource('src/pages/projects/[...id].astro')
  const route = source.match(/export async function getStaticPaths\(\) \{([\s\S]*?)\n\}/)
  assert.ok(route)
  const posts = [
    { id: 'notes/published', data: { draft: false } },
    { id: 'draft', data: { draft: true } },
  ]
  for (const production of [false, true]) {
    const paths: Array<{ params: { id: string }; props: { post: (typeof posts)[number] } }> =
      await runInNewContext(`(async () => { ${route[1].replaceAll('import.meta.env.PROD', 'production')} })()`, {
        production,
        async getCollection(collection: string, filter: (post: (typeof posts)[number]) => boolean) {
          assert.equal(collection, 'projectPosts')
          return posts.filter(filter)
        },
      })
    assert.deepEqual(Array.from(paths, (path) => path.params.id), production ? ['notes/published'] : ['notes/published', 'draft'])
    assert.equal(paths[0].props.post, posts[0])
    if (!production) assert.equal(paths[1].props.post, posts[1])
  }
})


test('project icons are generated from Markdown without a JSON safelist', async () => {
  const config = readSource('unocss.config.ts')
  assert.doesNotMatch(config, /data\.json|projectIcons/)
  assert.match(config, /\.\/src\/content\/\*\*\/\*\.\{md,mdx\}/)
  assert.match(config, /'i-ri-code-line'/)
  const { createGenerator, presetIcons } = await import('unocss')
  const uno = await createGenerator({ presets: [presetIcons()], safelist: ['i-ri-code-line'] })
  const { matched } = await uno.generate(['mintblog', 'reroute', 'siftpath']
    .map((slug) => readSource('src/content/projects/posts/' + slug + '.md')).join('\n'))
  for (const icon of ['i-grommet-icons:blog', 'i-ri-route-line', 'i-ri-search-eye-line', 'i-ri-code-line']) {
    assert.ok(matched.has(icon), icon)
  }
})

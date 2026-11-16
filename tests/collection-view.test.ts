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

test('project detail links exclude drafts and keep published detail slugs', async () => {
  const source = readSource('src/components/views/GroupView.astro')
  const expression = source.match(
    /const detailSlugs = ([\s\S]*?)\n\s*const projectOrder/,
  )
  assert.ok(expression)
  const posts = [
    { id: 'reroute', data: { title: 'Reroute', draft: false } },
    { id: 'siftpath', data: { title: 'Siftpath', draft: true } },
  ]
  const slugs: Map<string, string> = await runInNewContext(
    `(async () => { return ${expression[1]} })()`,
    {
      async getCollection(
        collection: string,
        filter?: (post: (typeof posts)[number]) => boolean,
      ) {
        assert.equal(collection, 'projectPosts')
        return posts.filter(filter ?? (() => true))
      },
    },
  )
  assert.equal(slugs.get('Reroute'), 'reroute')
  assert.equal(slugs.has('Siftpath'), false)
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

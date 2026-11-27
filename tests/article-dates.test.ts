import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('both article metadata styles always include a labelled modified time', () => {
  const source = read('src/components/base/PostMeta.astro')
  const modifiedTimes = [
    ...source.matchAll(/<time\b[^>]*datetime=\{lastModDate\}/g),
  ]
  assert.equal(modifiedTimes.length, 2)
  assert.equal([...source.matchAll(/最后修改/g)].length, 2)
  assert.doesNotMatch(source, /lastModDate\s*&&/)
})

test('Writing, Shorts and project details pass a non-empty modified date to metadata and head', () => {
  for (const component of ['RenderPost', 'RenderProject']) {
    const source = read(`src/components/views/${component}.astro`)
    assert.match(
      source,
      /\(\s*frontmatter\.lastModDate\s*\|\|\s*frontmatter\.pubDate\s*\)\.toISOString\(\)/,
    )
    assert.match(source, /<PostMeta\b/)
    assert.match(source, /<BaseLayout[\s\S]*?\{lastModDate\}/)
  }
})

test('the static article template has editable dates and starts as a draft', () => {
  const source = read('docs/templates/post.md')
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
  assert.ok(frontmatter)
  assert.match(frontmatter, /^title:\s*\S/m)
  const publication = frontmatter.match(/^pubDate:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]
  assert.ok(publication && Number.isFinite(Date.parse(publication)))
  assert.match(frontmatter, /^lastModDate:\s*(?:''|"")\s*(?:#.*)?$/m)
  assert.match(frontmatter, /^draft:\s*true\s*$/m)
})

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { validateContent } from '../scripts/check-content.mjs'

function createFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'blog-content-test-'))

  mkdirSync(join(root, 'src/content/blog'), { recursive: true })
  mkdirSync(join(root, 'src/content/reading'), { recursive: true })
  mkdirSync(join(root, 'public/images/blog'), { recursive: true })
  mkdirSync(join(root, 'public/images/reading'), { recursive: true })
  writeFileSync(join(root, 'public/images/blog/post.svg'), '<svg />')
  writeFileSync(join(root, 'public/images/reading/resource.svg'), '<svg />')

  return root
}

function writeBlog(root, name, frontmatter, body = '') {
  writeFileSync(join(root, 'src/content/blog', name), `---\n${frontmatter}\n---\n${body}`)
}

function writeReading(root, name, frontmatter, body = '') {
  writeFileSync(join(root, 'src/content/reading', name), `---\n${frontmatter}\n---\n${body}`)
}

test('passes valid blog and reading content', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'valid-post.mdx',
    [
      'title: "Valid Post"',
      'date: "2026-05-23"',
      'description: "A valid post."',
      'tags: ["Go", "Systems"]',
      'readingTime: "4 min"',
      'series:',
      '  title: "Build Notes"',
      '  slug: "build-notes"',
      '  order: 1',
    ].join('\n'),
    '![Post](/images/blog/post.svg)\n\n[Series](/blog/series/build-notes/)',
  )
  writeReading(
    root,
    'valid-resource.mdx',
    [
      'title: "Valid Resource"',
      'type: "Documentation"',
      'note: "A valid reading item."',
      'tags:',
      '  - "Astro"',
      '  - "Content"',
      'url: "https://docs.astro.build"',
      'image: "/images/reading/resource.svg"',
    ].join('\n'),
  )

  assert.deepEqual(validateContent({ root }).errors, [])
})

test('handles realistic blog frontmatter values without false positives', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'quoted-values.mdx',
    [
      'title: "Quoted Values"',
      'date: "2026-05-23"',
      'description: "Covers quoted arrays, commas, and inline series data."',
      'tags: ["Go, Systems", "Astro", "Notes"]',
      'readingTime: "7 min"',
      'series: { title: "Build, Notes", slug: "build-notes", order: 2 }',
    ].join('\n'),
    '[Series](/blog/series/build-notes/)',
  )
  writeReading(
    root,
    'block-tags.mdx',
    [
      'title: "Block Tags"',
      'type: "Documentation"',
      'note: "Block arrays accept common indentation and quoted commas."',
      'tags:',
      '    - "Content, Collections"',
      "    - 'Astro'",
      'image: "/images/reading/resource.svg"',
    ].join('\n'),
  )

  assert.deepEqual(validateContent({ root }).errors, [])
})

test('reports empty required arrays and empty block array items predictably', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'empty-tags.mdx',
    [
      'title: "Empty Tags"',
      'date: "2026-05-23"',
      'description: "Tags are required for blog content."',
      'tags: []',
      'readingTime: "4 min"',
    ].join('\n'),
  )
  writeReading(
    root,
    'empty-reading-tag.mdx',
    [
      'title: "Empty Reading Tag"',
      'type: "Reference"',
      'note: "Reading tags are optional, but present values cannot be empty."',
      'tags:',
      '  - ""',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/empty-tags.mdx: missing required frontmatter: tags')))
  assert(errors.some((error) => error.includes('src/content/reading/empty-reading-tag.mdx: tags cannot contain empty values')))
})

test('reports failing content with file-specific errors', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'bad-post.mdx',
    [
      'title: ""',
      'date: "2026-05-23"',
      'description: "A broken post."',
      'tags: ["Go", "go", ""]',
      'readingTime: "4 min"',
    ].join('\n'),
    '[Missing](/missing-route/)',
  )
  writeReading(
    root,
    'bad-resource.mdx',
    [
      'title: "Bad Resource"',
      'type: "Reference"',
      'note: ""',
      'tags: ["HTTP", "http"]',
      'image: "images/reading/resource.svg"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: missing required frontmatter: title')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: duplicate tag: go')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: tags cannot contain empty values')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: missing internal route or public file: /missing-route/')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: missing required frontmatter: note')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: duplicate tag: http')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: image must use a root-relative public path')))
})

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
  mkdirSync(join(root, 'src/content/projects'), { recursive: true })
  mkdirSync(join(root, 'public/images/blog'), { recursive: true })
  mkdirSync(join(root, 'public/images/reading'), { recursive: true })
  mkdirSync(join(root, 'public/images/projects'), { recursive: true })
  writeFileSync(join(root, 'public/images/blog/post.svg'), '<svg />')
  writeFileSync(join(root, 'public/images/reading/resource.svg'), '<svg />')
  writeFileSync(join(root, 'public/images/projects/project.svg'), '<svg />')

  return root
}

function writeBlog(root, name, frontmatter, body = '') {
  writeFileSync(join(root, 'src/content/blog', name), `---\n${frontmatter}\n---\n${body}`)
}

function writeReading(root, name, frontmatter, body = '') {
  writeFileSync(join(root, 'src/content/reading', name), `---\n${frontmatter}\n---\n${body}`)
}

function writeProject(root, name, frontmatter, body = '') {
  writeFileSync(join(root, 'src/content/projects', name), `---\n${frontmatter}\n---\n${body}`)
}

test('passes valid blog, reading, and project content', () => {
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
  writeProject(
    root,
    'valid-project.mdx',
    [
      'name: "Valid Project"',
      'description: "A valid project."',
      'group:',
      '  title: "Tools"',
      '  description: "Useful project tools."',
      '  order: 0',
      'order: 0',
      'tags: ["Astro", "Content"]',
      'detail: true',
      'summary: "A detail project."',
      'designNotes:',
      '  - "Keep it static."',
      'links:',
      '  - label: "Project image"',
      '    href: "/images/projects/project.svg"',
      'retrospective: "It stayed small."',
    ].join('\n'),
    'Project body with [post](/blog/valid-post/) and [asset](/images/projects/project.svg).',
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
    'Notes kept directly in the reading entry.',
  )
  writeProject(
    root,
    'list-only-project.mdx',
    [
      'name: "List Only"',
      'description: "Project without a detail page."',
      'group: { title: "Tools", description: "Project tools.", order: 0 }',
      'order: 1',
      'tags: ["Astro, Content", "Notes"]',
      'link: "/reading/"',
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
  writeProject(
    root,
    'empty-project-tag.mdx',
    [
      'name: "Empty Project Tag"',
      'description: "Project tags are optional, but present values cannot be empty."',
      'group:',
      '  title: "Tools"',
      '  description: "Project tools."',
      '  order: 0',
      'order: 0',
      'tags:',
      '  - ""',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/empty-tags.mdx: missing required frontmatter: tags')))
  assert(errors.some((error) => error.includes('src/content/reading/empty-reading-tag.mdx: tags cannot contain empty values')))
  assert(errors.some((error) => error.includes('src/content/projects/empty-project-tag.mdx: tags cannot contain empty values')))
})

test('reports blank required scalar values after trimming', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'blank-description.mdx',
    [
      'title: "Blank Description"',
      'date: "2026-05-23"',
      'description: "   "',
      'tags: ["Validation"]',
      'readingTime: "4 min"',
    ].join('\n'),
  )
  writeReading(
    root,
    'blank-note.mdx',
    [
      'title: "Blank Note"',
      'type: "Reference"',
      'note: "   "',
      'url: "https://example.com/resource"',
    ].join('\n'),
  )
  writeProject(
    root,
    'blank-group-title.mdx',
    [
      'name: "Blank Group Title"',
      'description: "Project group fields should be meaningful."',
      'group:',
      '  title: "   "',
      '  description: "Project tools."',
      '  order: 0',
      'order: 0',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/blank-description.mdx: missing required frontmatter: description')))
  assert(errors.some((error) => error.includes('src/content/reading/blank-note.mdx: missing required frontmatter: note')))
  assert(errors.some((error) => error.includes('src/content/projects/blank-group-title.mdx: missing required frontmatter: group.title')))
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
  writeProject(
    root,
    'bad-project.mdx',
    [
      'name: ""',
      'description: "A broken project."',
      'group:',
      '  title: ""',
      '  description: "Project tools."',
      'order: 0',
      'tags: ["Astro", "astro", ""]',
      'detail: true',
      'summary: ""',
      'designNotes: []',
      'retrospective: ""',
    ].join('\n'),
    '[Missing](/missing-project-route/)',
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: missing required frontmatter: title')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: duplicate tag: go')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: tags cannot contain empty values')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-post.mdx: missing internal route or public file: /missing-route/')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: missing required frontmatter: note')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: duplicate tag: http')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-resource.mdx: image must use a root-relative public path')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: name')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: group.title')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: group.order')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: duplicate tag: astro')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: tags cannot contain empty values')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: summary')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: designNotes')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing required frontmatter: retrospective')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project.mdx: missing internal route or public file: /missing-project-route/')))
})

test('reports missing root-relative project frontmatter links', () => {
  const root = createFixtureRoot()

  writeProject(
    root,
    'bad-frontmatter-links.mdx',
    [
      'name: "Bad Frontmatter Links"',
      'description: "Project frontmatter links should resolve."',
      'group:',
      '  title: "Tools"',
      '  description: "Project tools."',
      '  order: 0',
      'order: 0',
      'tags: ["Validation"]',
      'link: "/missing-project-link/"',
      'links:',
      '  - label: "Missing Asset"',
      '    href: "/images/projects/missing.svg"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/projects/bad-frontmatter-links.mdx: missing internal route or public file: /missing-project-link/')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-frontmatter-links.mdx: missing internal route or public file: /images/projects/missing.svg')))
})

test('reports invalid blog dates and updatedAt order', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'bad-dates.mdx',
    [
      'title: "Bad Dates"',
      'date: "2026-02-30"',
      'updatedAt: "2026-02-01"',
      'description: "Date values should be real calendar dates."',
      'tags: ["Validation"]',
      'readingTime: "4 min"',
    ].join('\n'),
  )
  writeBlog(
    root,
    'bad-updated-order.mdx',
    [
      'title: "Bad Updated Order"',
      'date: "2026-05-23"',
      'updatedAt: "2026-05-22"',
      'description: "updatedAt cannot move backward."',
      'tags: ["Validation"]',
      'readingTime: "4 min"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/bad-dates.mdx: date must use YYYY-MM-DD')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-updated-order.mdx: updatedAt must not be earlier than date')))
})

test('reports invalid blog reading time and series order', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'bad-reading-time.mdx',
    [
      'title: "Bad Reading Time"',
      'date: "2026-05-23"',
      'description: "Reading time should use minutes."',
      'tags: ["Validation"]',
      'readingTime: "about four minutes"',
      'series:',
      '  title: "Validation Notes"',
      '  slug: "validation-notes"',
      '  order: 0',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/bad-reading-time.mdx: readingTime must use minutes format like "4 min"')))
  assert(errors.some((error) => error.includes('src/content/blog/bad-reading-time.mdx: series.order must be a positive integer')))
})

test('reports missing blog series title', () => {
  const root = createFixtureRoot()

  writeBlog(
    root,
    'bad-series-title.mdx',
    [
      'title: "Bad Series Title"',
      'date: "2026-05-23"',
      'description: "Series metadata needs a display title."',
      'tags: ["Validation"]',
      'readingTime: "4 min"',
      'series:',
      '  slug: "validation-notes"',
      '  order: 1',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/blog/bad-series-title.mdx: missing required frontmatter: series.title')))
})

test('reports reading resources without url or body content', () => {
  const root = createFixtureRoot()

  writeReading(
    root,
    'empty-resource.mdx',
    [
      'title: "Empty Resource"',
      'type: "Reference"',
      'note: "A reading item needs somewhere to send the reader."',
      'tags: ["Validation"]',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/reading/empty-resource.mdx: reading resources require url or body content')))
})

test('validates reading url values', () => {
  const root = createFixtureRoot()

  writeReading(
    root,
    'internal-resource.mdx',
    [
      'title: "Internal Resource"',
      'type: "Reference"',
      'note: "Root-relative links should resolve like body links."',
      'url: "/blog/missing-post/"',
    ].join('\n'),
  )
  writeReading(
    root,
    'invalid-url.mdx',
    [
      'title: "Invalid URL"',
      'type: "Reference"',
      'note: "Only http(s) and internal targets are supported."',
      'url: "ftp://example.com/resource"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/reading/internal-resource.mdx: missing internal route or public file: /blog/missing-post/')))
  assert(errors.some((error) => error.includes('src/content/reading/invalid-url.mdx: url must be http(s) or a root-relative internal target')))
})

test('continues reading validation after invalid image path', () => {
  const root = createFixtureRoot()

  writeReading(
    root,
    'bad-image-and-url.mdx',
    [
      'title: "Bad Image And URL"',
      'type: "Reference"',
      'note: "Validation should aggregate independent reading errors."',
      'image: "images/reading/resource.svg"',
      'url: "ftp://example.com/resource"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/reading/bad-image-and-url.mdx: image must use a root-relative public path')))
  assert(errors.some((error) => error.includes('src/content/reading/bad-image-and-url.mdx: url must be http(s) or a root-relative internal target')))
})

test('reports invalid project ordering and link shapes', () => {
  const root = createFixtureRoot()

  writeProject(
    root,
    'bad-project-shapes.mdx',
    [
      'name: "Bad Project Shapes"',
      'description: "Project numeric and link values should match the schema."',
      'group:',
      '  title: "Tools"',
      '  description: "Project tools."',
      '  order: -1',
      'order: -2',
      'tags: ["Validation"]',
      'link: "reading/"',
      'links:',
      '  - label: ""',
      '    href: "files/project.txt"',
      '  - label: "Missing href"',
    ].join('\n'),
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: order must be a nonnegative integer')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: group.order must be a nonnegative integer')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: link must be http(s) or a root-relative internal target')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: missing required frontmatter: links.label')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: links.href must be http(s) or a root-relative internal target')))
  assert(errors.some((error) => error.includes('src/content/projects/bad-project-shapes.mdx: missing required frontmatter: links.href')))
})

test('reports detail projects without frontmatter links', () => {
  const root = createFixtureRoot()

  writeProject(
    root,
    'detail-without-links.mdx',
    [
      'name: "Detail Without Links"',
      'description: "Detail pages should expose related links."',
      'group:',
      '  title: "Tools"',
      '  description: "Project tools."',
      '  order: 0',
      'order: 0',
      'tags: ["Validation"]',
      'detail: true',
      'summary: "A detail page without links."',
      'designNotes:',
      '  - "Keep metadata complete."',
      'retrospective: "Links were missing."',
    ].join('\n'),
    'Project body.',
  )

  const errors = validateContent({ root }).errors

  assert(errors.some((error) => error.includes('src/content/projects/detail-without-links.mdx: missing required frontmatter: links')))
})

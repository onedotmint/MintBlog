import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { postSchema, projectPostSchema } from '../src/schema.ts'
import { parsePostData, safeParseFrontmatter } from './helpers/content-image.ts'

const readSource = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('post redirects accept only credential-free HTTP(S) URLs or an empty value', async () => {
  assert.equal((await parsePostData({})).redirect, '')
  for (const value of [
    '',
    'https://example.com/post?q=1#part',
    'http://example.com/',
  ])
    assert.equal((await parsePostData({ redirect: value })).redirect, value)

  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/file',
    '//example.com/post',
    '/blog/post/',
    'https://user:password@example.com/',
    'https://user@example.com/',
    'not a URL',
  ])
    await assert.rejects(parsePostData({ redirect: value }), /redirect/)
})

test('post covers accept local images, credential-free HTTP(S) URLs, or empty values', async () => {
  assert.equal((await parsePostData({})).cover, '')

  for (const value of ['./cover.png', '../images/封面 图.svg', 'cover.jpg', '~/assets/cover.webp']) {
    assert.equal((await parsePostData({ cover: value })).cover, `__ASTRO_IMAGE_${value}`)
  }

  for (const value of [
    '',
    'https://example.com/cover.png?w=800#hero',
    'http://example.com/cover.jpg',
  ])
    assert.equal((await parsePostData({ cover: value })).cover, value)

  for (const value of [
    'javascript:alert(1)',
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/cover.png',
    '//example.com/cover.png',
    '/blog/cover.png',
    'https://user:password@example.com/cover.png',
    'https://user@example.com/cover.png',
    'not a URL',
    ' https://user:password@example.com/cover.png',
    'java\tscript:alert(1).png',
    '\\\\example.com\\cover.png',
    'C:\\images\\cover.png',
  ]) {
    await assert.rejects(parsePostData({ cover: value }), /cover/)
    await assert.rejects(parsePostData({ cover: value }, projectPostSchema), /cover/)
  }
})

test('both JSON-LD outputs preserve content without exposing HTML script delimiters', () => {
  const expressions = [
    ...readSource('src/components/base/Head.astro').matchAll(/set:html=\{([\s\S]*?)\}/g),
  ]
  assert.equal(expressions.length, 2)
  const payload = {
    title: '</script><script>alert(1)</script>',
    description: '<!-- 中文 <img src=x onerror=alert(1)> & "quotes"',
  }
  for (const [, expression] of expressions) {
    const serialized: string = runInNewContext(expression, {
      blogPostingData: payload,
      webPageData: payload,
    })
    assert.doesNotMatch(serialized, /</)
    assert.deepEqual(JSON.parse(serialized), payload)
  }
})

test('search subresult titles stay text while Pagefind excerpts keep highlighting', () => {
  const search = readSource('src/scripts/search-panel.ts')
  assert.match(search, /title\.textContent\s*=\s*subResults\[s\]\.title/)
  assert.doesNotMatch(search, /\$\{subResults\[s\]\.title\}/)
  assert.match(search, /excerpt\.innerHTML\s*=\s*subResults\[s\]\.excerpt/)
  assert.match(search, /a\.append\(title, excerpt\)/)
})


test('real content loading normalizes an existing bare cover filename as a local image import', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mintblog-cover-'))
  try {
    writeFileSync(join(root, 'cover.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')
    for (const schema of [postSchema, projectPostSchema]) {
      const data = await parsePostData({ cover: 'cover.svg' }, schema, join(root, 'post.md'))
      assert.equal(data.cover, '__ASTRO_IMAGE_./cover.svg')
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})


test('publication dates reject YAML sequences and other coercible non-date inputs', async () => {
  const { frontmatter: data } = safeParseFrontmatter(
    "---\npubDate: [2030-01-01]\nlastModDate: ''\n---\nAn article.\n",
  )
  assert.ok(Array.isArray(data.pubDate))
  for (const schema of [postSchema, projectPostSchema]) {
    await assert.rejects(parsePostData(data, schema), /pubDate/)
    for (const pubDate of [null, true, false, {}, [], ['2030-01-01'], NaN, Infinity, 'not a date']) {
      await assert.rejects(parsePostData({ pubDate }, schema), /pubDate/)
    }
    for (const pubDate of ['2030-01-01', new Date('2030-01-01'), Date.parse('2030-01-01'), 0]) {
      const parsed = await parsePostData({ pubDate }, schema)
      assert.ok(parsed.pubDate instanceof Date)
      assert.equal(parsed.pubDate.getTime(), new Date(pubDate).getTime())
    }
  }
})

test('modification dates reject non-date inputs and preserve supported overrides', async () => {
  for (const schema of [postSchema, projectPostSchema]) {
    for (const yamlValue of ['', 'null', 'false', 'true', '[2030-01-01]']) {
      const { frontmatter: data } = safeParseFrontmatter(
        `---\nlastModDate: ${yamlValue}\n---\nAn article.\n`,
      )
      await assert.rejects(parsePostData(data, schema), /lastModDate/)
    }
    for (const lastModDate of [null, true, false, {}, [], ['2030-01-01'], NaN, Infinity, new Date(NaN), 'not a date']) {
      await assert.rejects(parsePostData({ lastModDate }, schema), /lastModDate/)
    }
    assert.equal((await parsePostData({}, schema)).lastModDate, undefined)
    const { frontmatter: automatic } = safeParseFrontmatter(
      "---\nlastModDate: ''\n---\nAn article.\n",
    )
    assert.equal((await parsePostData(automatic, schema)).lastModDate, '')
    for (const lastModDate of ['2030-01-01', new Date('2030-01-01'), Date.parse('2030-01-01'), 0]) {
      const parsed = await parsePostData({ lastModDate }, schema)
      assert.ok(parsed.lastModDate instanceof Date)
      assert.equal(parsed.lastModDate.getTime(), new Date(lastModDate).getTime())
    }
  }
})


test('project Markdown needs no extra metadata and validates optional repository, category and icon', async () => {
  const data = await parsePostData({}, projectPostSchema)
  assert.equal(data.category, 'Now')
  assert.equal(data.icon, 'i-ri-code-line')
  assert.equal(data.repo, undefined)
  for (const repo of ['https://github.com/onedotmint/MintBlog', 'http://example.com/']) {
    assert.equal((await parsePostData({ repo }, projectPostSchema)).repo, repo)
  }
  for (const repo of ['javascript:alert(1)', '//example.com/', 'https://user:password@example.com/']) {
    await assert.rejects(parsePostData({ repo }, projectPostSchema), /repo/)
  }
  for (const icon of ['i-ri-code-line', 'i-grommet-icons:blog']) {
    assert.equal((await parsePostData({ icon }, projectPostSchema)).icon, icon)
  }
  for (const icon of ['', 'invalid', 'i-ri-code-line extra-class']) {
    await assert.rejects(parsePostData({ icon }, projectPostSchema), /icon/)
  }
  assert.equal((await parsePostData({ category: ' 实验室 ' }, projectPostSchema)).category, '实验室')
  await assert.rejects(parsePostData({ category: ' ' }, projectPostSchema), /category/)
})

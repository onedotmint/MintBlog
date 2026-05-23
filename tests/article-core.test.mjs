import assert from 'node:assert/strict'
import test from 'node:test'
import { importTsModule } from './import-ts-module.mjs'

const {
  getArticleTags,
  getFeaturedArticles,
  getRelatedArticles,
  normalizeArticleSlug,
  normalizeTagSlug,
  sortArticlesByDateDesc,
} = await importTsModule(new URL('../src/utils/article-core.ts', import.meta.url))

function article(slug, date, tags, featured = false) {
  return {
    slug,
    href: `/blog/${slug}/`,
    data: {
      date: new Date(date),
      tags,
      featured,
    },
  }
}

test('normalizes article and taxonomy slugs', () => {
  assert.equal(normalizeArticleSlug('linux-nginx-note.mdx'), 'linux-nginx-note')
  assert.equal(normalizeArticleSlug('go-tcp-server.md'), 'go-tcp-server')
  assert.equal(normalizeTagSlug('  Go / Systems  '), 'go-systems')
})

test('sorts articles by publish date descending without mutating input', () => {
  const oldest = { data: { date: new Date('2026-05-19') } }
  const newest = { data: { date: new Date('2026-05-23') } }
  const input = [oldest, newest]

  assert.deepEqual(sortArticlesByDateDesc(input), [newest, oldest])
  assert.deepEqual(input, [oldest, newest])
})

test('fills featured articles with recent fallback articles', () => {
  const featured = article('featured', '2026-05-20', ['Go'], true)
  const recent = article('recent', '2026-05-22', ['Rust'])
  const older = article('older', '2026-05-18', ['Linux'])

  assert.deepEqual(getFeaturedArticles([featured, recent, older], 2), [featured, recent])
})

test('groups article tags by normalized slug', () => {
  const articles = [
    article('newer', '2026-05-22', ['Go', 'Systems']),
    article('older', '2026-05-20', ['go']),
  ]

  const tags = getArticleTags(articles)
  const go = tags.find((tag) => tag.slug === 'go')

  assert.equal(go?.label, 'Go')
  assert.deepEqual(go?.articles.map((item) => item.slug), ['newer', 'older'])
})

test('ranks related articles by shared tags and then recency', () => {
  const current = article('current', '2026-05-23', ['Go', 'Systems'])
  const best = article('best', '2026-05-19', ['Go', 'Systems'])
  const recentTie = article('recent-tie', '2026-05-22', ['Go'])
  const olderTie = article('older-tie', '2026-05-20', ['Go'])
  const unrelated = article('unrelated', '2026-05-24', ['Astro'])

  assert.deepEqual(
    getRelatedArticles(current, [current, recentTie, unrelated, olderTie, best]).map((item) => item.slug),
    ['best', 'recent-tie', 'older-tie'],
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { importTsModule } from './import-ts-module.mjs'

const {
  getArticleArchives,
  getArticleSeries,
  getArticleTags,
  isPublishedArticle,
  sortArticlesByDateDesc,
} = await importTsModule(new URL('../src/utils/article-core.ts', import.meta.url))
const { buildRssXml } = await importTsModule(new URL('../src/utils/rss.ts', import.meta.url))
const { buildSitemapXml } = await importTsModule(new URL('../src/utils/sitemap.ts', import.meta.url))

function article(slug, date, title, description, options = {}) {
  return {
    slug,
    href: `/blog/${slug}/`,
    data: {
      title,
      description,
      date: new Date(date),
      tags: options.tags ?? [],
      draft: options.draft ?? false,
      updatedAt: options.updatedAt ? new Date(options.updatedAt) : undefined,
      series: options.series,
    },
  }
}

function publishedArticles(articles) {
  return sortArticlesByDateDesc(articles).filter(isPublishedArticle)
}

test('builds RSS with absolute URLs, escaped XML, and published articles only', () => {
  const published = article(
    'xml-post',
    '2026-05-20T00:00:00.000Z',
    'AT&T <Systems> "Notes"',
    'Use <xml> & keep "quotes" safe.',
    { updatedAt: '2026-05-23T00:00:00.000Z' },
  )
  const draft = article('draft-post', '2026-05-21T00:00:00.000Z', 'Draft', 'Hidden draft.', { draft: true })
  const rss = buildRssXml(publishedArticles([published, draft]))

  assert(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert(rss.includes('<link>http://localhost:4321/</link>'))
  assert(rss.includes('<link>http://localhost:4321/blog/xml-post/</link>'))
  assert(rss.includes('<guid>http://localhost:4321/blog/xml-post/</guid>'))
  assert(rss.includes('<title>AT&amp;T &lt;Systems&gt; &quot;Notes&quot;</title>'))
  assert(rss.includes('<description>Use &lt;xml&gt; &amp; keep &quot;quotes&quot; safe.</description>'))
  assert(rss.includes(`<lastBuildDate>${published.data.updatedAt.toUTCString()}</lastBuildDate>`))
  assert(!rss.includes('draft-post'))
})

test('builds sitemap with static and dynamic URLs plus article lastmod dates', () => {
  const updated = article('updated-post', '2026-05-20T00:00:00.000Z', 'Updated', 'Updated post.', {
    updatedAt: '2026-05-23T00:00:00.000Z',
    tags: ['Go', 'Systems'],
    series: { title: 'Build Notes', slug: 'build-notes', order: 1 },
  })
  const original = article('original-post', '2026-05-19T00:00:00.000Z', 'Original', 'Original post.', {
    tags: ['Astro'],
  })
  const draft = article('draft-post', '2026-05-22T00:00:00.000Z', 'Draft', 'Hidden draft.', { draft: true })
  const articles = publishedArticles([updated, original, draft])
  const sitemap = buildSitemapXml({
    articles,
    articleArchives: getArticleArchives(articles),
    articleSeries: getArticleSeries(articles),
    articleTags: getArticleTags(articles),
    readingResources: [{ slug: 'http-reference', href: '/reading/http-reference/', data: { title: 'HTTP', type: 'Reference' } }],
    projectDetails: [
      {
        slug: 'tcp-server-lab',
        href: '/projects/tcp-server-lab/',
        data: {
          name: 'TCP Server Lab',
          description: 'A project.',
          group: { title: 'Systems', description: 'Systems work.', order: 0 },
          order: 0,
          tags: [],
          detail: true,
          summary: 'Project summary.',
          designNotes: ['Keep it small.'],
          links: [],
          retrospective: 'Done.',
        },
      },
    ],
  })

  assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert(sitemap.includes('<loc>http://localhost:4321/blog/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/talks/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/blog/archive/2026/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/blog/series/build-notes/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/blog/tags/go/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/reading/http-reference/</loc>'))
  assert(sitemap.includes('<loc>http://localhost:4321/projects/tcp-server-lab/</loc>'))
  assert(sitemap.includes('<url><loc>http://localhost:4321/blog/updated-post/</loc><lastmod>2026-05-23</lastmod></url>'))
  assert(sitemap.includes('<url><loc>http://localhost:4321/blog/original-post/</loc><lastmod>2026-05-19</lastmod></url>'))
  assert(!sitemap.includes('draft-post'))
})

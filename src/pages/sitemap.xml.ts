import { toAbsoluteUrl } from '../data/site'
import { getArticleSeries, getArticles, getArticleUpdatedDate } from '../utils/articles'

function sitemapUrl(path: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''

  return `<url><loc>${toAbsoluteUrl(path)}</loc>${lastmodTag}</url>`
}

export async function GET() {
  const articles = await getArticles()
  const articleSeries = getArticleSeries(articles)
  const staticPages = ['/', '/blog/', '/blog/series/', '/projects/', '/about/']
  const urls = [
    ...staticPages.map((path) => sitemapUrl(path)),
    ...articleSeries.map((series) => sitemapUrl(series.href)),
    ...articles.map((article) => sitemapUrl(article.href, getArticleUpdatedDate(article) ?? article.data.date)),
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

import { toAbsoluteUrl } from '../data/site'
import { getProjectsWithDetails } from '../data/projects'
import { getArticleArchives, getArticleSeries, getArticleTags, getArticles, getArticleUpdatedDate } from '../utils/articles'
import { getReadingResources } from '../utils/reading'

function sitemapUrl(path: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''

  return `<url><loc>${toAbsoluteUrl(path)}</loc>${lastmodTag}</url>`
}

export async function GET() {
  const articles = await getArticles()
  const readingResources = await getReadingResources()
  const articleArchives = getArticleArchives(articles)
  const articleSeries = getArticleSeries(articles)
  const articleTags = getArticleTags(articles)
  const projectDetails = getProjectsWithDetails()
  const staticPages = ['/', '/blog/', '/blog/archive/', '/blog/series/', '/blog/tags/', '/reading/', '/projects/', '/now/', '/about/']
  const urls = [
    ...staticPages.map((path) => sitemapUrl(path)),
    ...articleArchives.map((archive) => sitemapUrl(archive.href)),
    ...articleSeries.map((series) => sitemapUrl(series.href)),
    ...articleTags.map((tag) => sitemapUrl(tag.href)),
    ...readingResources.map((resource) => sitemapUrl(resource.href)),
    ...projectDetails.map((project) => sitemapUrl(`/projects/${project.detail.slug}/`)),
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

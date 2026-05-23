import { toAbsoluteUrl } from '../data/site'
import type { ArticleArchive, ArticleCore, ArticleSeries, ArticleTag } from './article-core'
import { getArticleUpdatedDate } from './article-core'
import type { ProjectWithDetail } from './project-core'
import type { ReadingResourceCore } from './reading-core'

export interface SitemapInput<TArticle extends ArticleCore = ArticleCore> {
  articles: readonly TArticle[]
  articleArchives: readonly ArticleArchive<TArticle>[]
  articleSeries: readonly ArticleSeries<TArticle>[]
  articleTags: readonly ArticleTag<TArticle>[]
  readingResources: readonly ReadingResourceCore[]
  projectDetails: readonly ProjectWithDetail[]
}

const staticPages = ['/', '/blog/', '/blog/archive/', '/blog/series/', '/blog/tags/', '/reading/', '/projects/', '/now/', '/about/']

function sitemapUrl(path: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''

  return `<url><loc>${toAbsoluteUrl(path)}</loc>${lastmodTag}</url>`
}

export function buildSitemapXml<TArticle extends ArticleCore>(input: SitemapInput<TArticle>) {
  const urls = [
    ...staticPages.map((path) => sitemapUrl(path)),
    ...input.articleArchives.map((archive) => sitemapUrl(archive.href)),
    ...input.articleSeries.map((series) => sitemapUrl(series.href)),
    ...input.articleTags.map((tag) => sitemapUrl(tag.href)),
    ...input.readingResources.map((resource) => sitemapUrl(resource.href)),
    ...input.projectDetails.map((project) => sitemapUrl(project.href)),
    ...input.articles.map((article) => sitemapUrl(article.href, getArticleUpdatedDate(article) ?? article.data.date)),
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('')
}

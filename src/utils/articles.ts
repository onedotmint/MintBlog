import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import {
  isPublishedArticle,
  normalizeArticleSlug,
  sortArticlesByDateDesc,
} from './article-core'
import type {
  AdjacentArticles,
  ArticleArchive as ArticleArchiveCore,
  ArticleCore,
  ArticleSeries as ArticleSeriesCore,
  ArticleTableOfContentsItem,
  ArticleTag as ArticleTagCore,
} from './article-core'

export {
  getAdjacentArticles,
  getArticleArchives,
  getArticleSeries,
  getArticleSeriesHref,
  getArticleSeriesSlug,
  getArticleTableOfContents,
  getArticleTagHref,
  getArticleTags,
  getArticleUpdatedDate,
  getFeaturedArticles,
  getRelatedArticles,
  hasUpdatedDate,
  isPublishedArticle,
  normalizeArticleSlug,
  normalizeSeriesSlug,
  normalizeTagSlug,
  normalizeTaxonomySlug,
  sortArticlesByDateDesc,
  sortArticlesBySeriesOrder,
} from './article-core'

export type BlogEntry = CollectionEntry<'blog'>

export type Article = ArticleCore<BlogEntry['data']> & { entry: BlogEntry }
export type ArticleSeries = ArticleSeriesCore<Article>
export type ArticleTag = ArticleTagCore<Article>
export type ArticleArchive = ArticleArchiveCore<Article>
export type { AdjacentArticles, ArticleTableOfContentsItem }

export function toArticle(entry: BlogEntry): Article {
  const slug = normalizeArticleSlug(entry.id)

  return {
    entry,
    slug,
    href: `/blog/${slug}/`,
    data: entry.data,
  }
}

export async function getArticles() {
  const entries = (await getCollection('blog')) as BlogEntry[]

  return sortArticlesByDateDesc(entries).filter(isPublishedArticle).map(toArticle)
}

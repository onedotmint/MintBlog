import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type BlogEntry = CollectionEntry<'blog'>

export interface Article {
  entry: BlogEntry
  slug: string
  href: string
  data: BlogEntry['data']
}

export interface ArticleSeries {
  title: string
  slug: string
  href: string
  articles: Article[]
}

export function normalizeArticleSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
}

export function normalizeSeriesSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function toArticle(entry: BlogEntry): Article {
  const slug = normalizeArticleSlug(entry.slug)

  return {
    entry,
    slug,
    href: `/blog/${slug}/`,
    data: entry.data,
  }
}

export function isPublishedArticle(entry: BlogEntry) {
  return !entry.data.draft
}

export function hasUpdatedDate(article: Article) {
  return Boolean(article.data.updatedAt && article.data.updatedAt.getTime() > article.data.date.getTime())
}

export function getArticleUpdatedDate(article: Article) {
  return hasUpdatedDate(article) ? article.data.updatedAt : undefined
}

export function getArticleSeriesSlug(article: Article) {
  const series = article.data.series

  if (!series) {
    return undefined
  }

  return normalizeSeriesSlug(series.slug ?? series.title)
}

export function getArticleSeriesHref(article: Article) {
  const slug = getArticleSeriesSlug(article)

  return slug ? `/blog/series/${slug}/` : undefined
}

export function sortArticlesByDateDesc(entries: BlogEntry[]) {
  return [...entries].sort((left, right) => right.data.date.getTime() - left.data.date.getTime())
}

export function sortArticlesBySeriesOrder(articles: Article[]) {
  return [...articles].sort((left, right) => {
    const leftOrder = left.data.series?.order
    const rightOrder = right.data.series?.order

    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    if (leftOrder !== undefined && rightOrder === undefined) {
      return -1
    }

    if (leftOrder === undefined && rightOrder !== undefined) {
      return 1
    }

    return left.data.date.getTime() - right.data.date.getTime()
  })
}

export async function getArticles() {
  const entries = (await getCollection('blog')) as BlogEntry[]

  return sortArticlesByDateDesc(entries).filter(isPublishedArticle).map(toArticle)
}

export function getFeaturedArticles(articles: Article[], limit: number) {
  const featured = articles.filter((article) => article.data.featured).slice(0, limit)

  if (featured.length >= limit) {
    return featured
  }

  const featuredSlugs = new Set(featured.map((article) => article.slug))
  const fallback = articles.filter((article) => !featuredSlugs.has(article.slug)).slice(0, limit - featured.length)

  return [...featured, ...fallback]
}

export function getArticleSeries(articles: Article[]) {
  const seriesBySlug = new Map<string, ArticleSeries>()

  for (const article of articles) {
    const series = article.data.series

    if (!series) {
      continue
    }

    const slug = getArticleSeriesSlug(article)

    if (!slug) {
      continue
    }

    const existing = seriesBySlug.get(slug)

    if (existing) {
      existing.articles.push(article)
      continue
    }

    seriesBySlug.set(slug, {
      title: series.title,
      slug,
      href: `/blog/series/${slug}/`,
      articles: [article],
    })
  }

  return [...seriesBySlug.values()]
    .map((series) => ({
      ...series,
      articles: sortArticlesBySeriesOrder(series.articles),
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

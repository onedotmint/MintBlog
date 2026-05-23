import { getCollection } from 'astro:content'
import type { MarkdownHeading } from 'astro'
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

export interface ArticleTag {
  label: string
  slug: string
  href: string
  articles: Article[]
}

export interface AdjacentArticles {
  newer?: Article
  older?: Article
}

export interface ArticleTableOfContentsItem {
  depth: number
  slug: string
  text: string
}

export function normalizeArticleSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
}

export function normalizeTaxonomySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeSeriesSlug(value: string) {
  return normalizeTaxonomySlug(value)
}

export function normalizeTagSlug(value: string) {
  return normalizeTaxonomySlug(value)
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

export function getArticleTagHref(tag: string) {
  const slug = normalizeTagSlug(tag)

  return slug ? `/blog/tags/${slug}/` : undefined
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

export function getAdjacentArticles(article: Article, articles: Article[]): AdjacentArticles {
  const currentIndex = articles.findIndex((candidate) => candidate.slug === article.slug)

  if (currentIndex === -1) {
    return {}
  }

  return {
    newer: currentIndex > 0 ? articles[currentIndex - 1] : undefined,
    older: currentIndex < articles.length - 1 ? articles[currentIndex + 1] : undefined,
  }
}

export function getArticleTableOfContents(headings: MarkdownHeading[], minimumItems = 2): ArticleTableOfContentsItem[] {
  const items = headings
    .filter((heading) => heading.depth >= 2 && heading.depth <= 3 && heading.slug && heading.text)
    .map((heading) => ({
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
    }))

  return items.length >= minimumItems ? items : []
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

export function getArticleTags(articles: Article[]) {
  const tagsBySlug = new Map<string, ArticleTag>()

  for (const article of articles) {
    for (const tag of article.data.tags) {
      const slug = normalizeTagSlug(tag)

      if (!slug) {
        continue
      }

      const existing = tagsBySlug.get(slug)

      if (existing) {
        existing.articles.push(article)
        continue
      }

      tagsBySlug.set(slug, {
        label: tag,
        slug,
        href: `/blog/tags/${slug}/`,
        articles: [article],
      })
    }
  }

  return [...tagsBySlug.values()]
    .map((tag) => ({
      ...tag,
      articles: [...tag.articles].sort((left, right) => right.data.date.getTime() - left.data.date.getTime()),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function getRelatedArticles(article: Article, articles: Article[], limit = 3) {
  const tagSlugs = new Set(article.data.tags.map(normalizeTagSlug).filter(Boolean))

  if (tagSlugs.size === 0) {
    return []
  }

  return articles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      const sharedTagCount = candidate.data.tags.filter((tag) => tagSlugs.has(normalizeTagSlug(tag))).length

      return {
        article: candidate,
        sharedTagCount,
      }
    })
    .filter((candidate) => candidate.sharedTagCount > 0)
    .sort((left, right) => {
      if (left.sharedTagCount !== right.sharedTagCount) {
        return right.sharedTagCount - left.sharedTagCount
      }

      return right.article.data.date.getTime() - left.article.data.date.getTime()
    })
    .slice(0, limit)
    .map((candidate) => candidate.article)
}

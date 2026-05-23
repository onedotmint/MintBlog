import type { MarkdownHeading } from 'astro'

export interface ArticleSeriesData {
  title: string
  slug?: string
  order?: number
}

export interface ArticleDataShape {
  date: Date
  tags: readonly string[]
  draft?: boolean
  featured?: boolean
  updatedAt?: Date
  series?: ArticleSeriesData
}

export interface ArticleCore<TData extends ArticleDataShape = ArticleDataShape> {
  slug: string
  href: string
  data: TData
}

export interface ArticleSeries<TArticle extends ArticleCore = ArticleCore> {
  title: string
  slug: string
  href: string
  articles: TArticle[]
}

export interface ArticleTag<TArticle extends ArticleCore = ArticleCore> {
  label: string
  slug: string
  href: string
  articles: TArticle[]
}

export interface ArticleArchive<TArticle extends ArticleCore = ArticleCore> {
  year: string
  href: string
  articles: TArticle[]
}

export interface AdjacentArticles<TArticle extends ArticleCore = ArticleCore> {
  newer?: TArticle
  older?: TArticle
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

export function isPublishedArticle<TEntry extends { data: { draft?: boolean } }>(entry: TEntry) {
  return !entry.data.draft
}

export function hasUpdatedDate<TArticle extends ArticleCore>(article: TArticle) {
  return Boolean(article.data.updatedAt && article.data.updatedAt.getTime() > article.data.date.getTime())
}

export function getArticleUpdatedDate<TArticle extends ArticleCore>(article: TArticle) {
  return hasUpdatedDate(article) ? article.data.updatedAt : undefined
}

export function getArticleSeriesSlug<TArticle extends ArticleCore>(article: TArticle) {
  const series = article.data.series

  if (!series) {
    return undefined
  }

  return normalizeSeriesSlug(series.slug ?? series.title)
}

export function getArticleSeriesHref<TArticle extends ArticleCore>(article: TArticle) {
  const slug = getArticleSeriesSlug(article)

  return slug ? `/blog/series/${slug}/` : undefined
}

export function getArticleTagHref(tag: string) {
  const slug = normalizeTagSlug(tag)

  return slug ? `/blog/tags/${slug}/` : undefined
}

export function sortArticlesByDateDesc<TEntry extends { data: { date: Date } }>(entries: readonly TEntry[]) {
  return [...entries].sort((left, right) => right.data.date.getTime() - left.data.date.getTime())
}

export function sortArticlesBySeriesOrder<TArticle extends ArticleCore>(articles: readonly TArticle[]) {
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

export function getFeaturedArticles<TArticle extends ArticleCore>(articles: readonly TArticle[], limit: number) {
  const featured = articles.filter((article) => article.data.featured).slice(0, limit)

  if (featured.length >= limit) {
    return featured
  }

  const featuredSlugs = new Set(featured.map((article) => article.slug))
  const fallback = articles.filter((article) => !featuredSlugs.has(article.slug)).slice(0, limit - featured.length)

  return [...featured, ...fallback]
}

export function getAdjacentArticles<TArticle extends ArticleCore>(
  article: TArticle,
  articles: readonly TArticle[],
): AdjacentArticles<TArticle> {
  const currentIndex = articles.findIndex((candidate) => candidate.slug === article.slug)

  if (currentIndex === -1) {
    return {}
  }

  return {
    newer: currentIndex > 0 ? articles[currentIndex - 1] : undefined,
    older: currentIndex < articles.length - 1 ? articles[currentIndex + 1] : undefined,
  }
}

export function getArticleTableOfContents(headings: readonly MarkdownHeading[], minimumItems = 2): ArticleTableOfContentsItem[] {
  const items = headings
    .filter((heading) => heading.depth >= 2 && heading.depth <= 3 && heading.slug && heading.text)
    .map((heading) => ({
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
    }))

  return items.length >= minimumItems ? items : []
}

export function getArticleSeries<TArticle extends ArticleCore>(articles: readonly TArticle[]) {
  const seriesBySlug = new Map<string, ArticleSeries<TArticle>>()

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

export function getArticleTags<TArticle extends ArticleCore>(articles: readonly TArticle[]) {
  const tagsBySlug = new Map<string, ArticleTag<TArticle>>()

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

export function getArticleArchives<TArticle extends ArticleCore>(articles: readonly TArticle[]) {
  const archivesByYear = new Map<string, ArticleArchive<TArticle>>()

  for (const article of articles) {
    const year = String(article.data.date.getFullYear())
    const existing = archivesByYear.get(year)

    if (existing) {
      existing.articles.push(article)
      continue
    }

    archivesByYear.set(year, {
      year,
      href: `/blog/archive/${year}/`,
      articles: [article],
    })
  }

  return [...archivesByYear.values()]
    .map((archive) => ({
      ...archive,
      articles: [...archive.articles].sort((left, right) => right.data.date.getTime() - left.data.date.getTime()),
    }))
    .sort((left, right) => Number(right.year) - Number(left.year))
}

export function getRelatedArticles<TArticle extends ArticleCore>(article: TArticle, articles: readonly TArticle[], limit = 3) {
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

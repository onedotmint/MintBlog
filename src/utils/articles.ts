import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type BlogEntry = CollectionEntry<'blog'>

export interface Article {
  entry: BlogEntry
  slug: string
  href: string
  data: BlogEntry['data']
}

export function normalizeArticleSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
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

export function sortArticlesByDateDesc(entries: BlogEntry[]) {
  return [...entries].sort((left, right) => right.data.date.getTime() - left.data.date.getTime())
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

export interface ArticleSeoInput {
  title: string
  description: string
  canonicalUrl: string
  imageUrl: string
  publishedAt: Date
  modifiedAt?: Date
  tags?: readonly string[]
  authorName: string
  siteName: string
  siteUrl: string
}

export interface JsonLdPerson {
  '@type': 'Person'
  name: string
}

export interface JsonLdWebPage {
  '@type': 'WebPage'
  '@id': string
}

export interface JsonLdWebSite {
  '@type': 'WebSite'
  name: string
  url: string
}

export interface ArticleJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Article'
  headline: string
  description: string
  url: string
  mainEntityOfPage: JsonLdWebPage
  image: string[]
  datePublished: string
  dateModified: string
  author: JsonLdPerson
  publisher: JsonLdPerson
  isPartOf: JsonLdWebSite
  keywords?: string
}

export interface ArticleSeoMetadata {
  publishedTime: string
  modifiedTime?: string
  keywords?: string
  tags: string[]
  jsonLd: ArticleJsonLd
}

export function normalizeSeoTags(tags: readonly string[] = []) {
  return tags.map((tag) => tag.trim()).filter(Boolean)
}

export function getSeoModifiedAt(publishedAt: Date, modifiedAt?: Date) {
  return modifiedAt && modifiedAt.getTime() > publishedAt.getTime() ? modifiedAt : undefined
}

export function buildArticleSeoMetadata(input: ArticleSeoInput): ArticleSeoMetadata {
  const tags = normalizeSeoTags(input.tags)
  const keywords = tags.length > 0 ? tags.join(', ') : undefined
  const modifiedAt = getSeoModifiedAt(input.publishedAt, input.modifiedAt)
  const datePublished = input.publishedAt.toISOString()
  const dateModified = (modifiedAt ?? input.publishedAt).toISOString()
  const person: JsonLdPerson = {
    '@type': 'Person',
    name: input.authorName,
  }

  return {
    publishedTime: datePublished,
    modifiedTime: modifiedAt?.toISOString(),
    keywords,
    tags,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.title,
      description: input.description,
      url: input.canonicalUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': input.canonicalUrl,
      },
      image: [input.imageUrl],
      datePublished,
      dateModified,
      author: person,
      publisher: person,
      isPartOf: {
        '@type': 'WebSite',
        name: input.siteName,
        url: input.siteUrl,
      },
      ...(keywords ? { keywords } : {}),
    },
  }
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

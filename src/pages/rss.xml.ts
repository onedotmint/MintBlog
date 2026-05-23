import { siteIdentity, toAbsoluteUrl } from '../data/site'
import { getArticles, getArticleUpdatedDate } from '../utils/articles'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export async function GET() {
  const articles = await getArticles()
  const lastBuildDate = articles.reduce<Date | undefined>((latest, article) => {
    const updatedAt = getArticleUpdatedDate(article) ?? article.data.date

    if (!latest || updatedAt.getTime() > latest.getTime()) {
      return updatedAt
    }

    return latest
  }, undefined)
  const items = articles
    .map((article) => {
      const url = toAbsoluteUrl(article.href)

      return [
        '<item>',
        `<title>${escapeXml(article.data.title)}</title>`,
        `<link>${url}</link>`,
        `<guid>${url}</guid>`,
        `<description>${escapeXml(article.data.description)}</description>`,
        `<pubDate>${article.data.date.toUTCString()}</pubDate>`,
        '</item>',
      ].join('')
    })
    .join('')

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `<title>${escapeXml(siteIdentity.siteName)}</title>`,
    `<link>${toAbsoluteUrl('/')}</link>`,
    `<description>${escapeXml(siteIdentity.defaultDescription)}</description>`,
    lastBuildDate ? `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>` : '',
    items,
    '</channel>',
    '</rss>',
  ].join('')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

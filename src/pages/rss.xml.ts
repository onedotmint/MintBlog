import { getArticles } from '../utils/articles'
import { buildRssXml } from '../utils/rss'

export async function GET() {
  const articles = await getArticles()

  return new Response(buildRssXml(articles), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

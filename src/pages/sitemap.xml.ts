import { getArticleArchives, getArticleSeries, getArticleTags, getArticles } from '../utils/articles'
import { getDetailedProjects } from '../utils/projects'
import { getReadingResources } from '../utils/reading'
import { buildSitemapXml } from '../utils/sitemap'

export async function GET() {
  const articles = await getArticles()
  const readingResources = await getReadingResources()
  const articleArchives = getArticleArchives(articles)
  const articleSeries = getArticleSeries(articles)
  const articleTags = getArticleTags(articles)
  const projectDetails = await getDetailedProjects()

  return new Response(buildSitemapXml({
    articles,
    articleArchives,
    articleSeries,
    articleTags,
    readingResources,
    projectDetails,
  }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

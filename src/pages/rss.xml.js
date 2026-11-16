import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'

import { SITE } from '~/config'
import { getSortedPosts } from '~/utils/data'
import { withBasePath } from '~/utils/path'

export async function GET() {
  const blog = await getCollection('blog')

  const filteredBlogItems = blog.filter((item) => !item.data.draft)

  const sortedBlogItems = getSortedPosts(filteredBlogItems)

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.website,
    customData: `
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <image>
        <title>${SITE.title}</title>
        <url>${new URL(withBasePath('/icon-512.png'), SITE.website).href}</url>
        <link>${SITE.website}</link>
      </image>`,

    items: sortedBlogItems.map((item) => ({
      title: `${item.data.title}`,
      link: item.data.redirect || withBasePath(`/blog/${item.id}/`),
      pubDate: item.data.pubDate,
      description: item.data.description,
      author: SITE.author,
    })),

    stylesheet: withBasePath('/rss-styles.xsl'),
  })
}

import { glob, file } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { blueskyPostsLoader } from 'astro-loader-bluesky-posts'

import {
  pageSchema,
  postSchema,
  projectSchema,
  linkSchema,
  streamSchema,
  photoSchema,
} from '~/schema'

const pages = defineCollection({
  loader: glob({ base: './src/pages', pattern: '**/*.mdx' }),
  schema: pageSchema,
})

const home = defineCollection({
  loader: glob({ base: './src/content/home', pattern: 'index.{md,mdx}' }),
})

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/[^_]*.{md,mdx}' }),
  schema: postSchema,
})

const projects = defineCollection({
  loader: file('./src/content/projects/data.json'),
  schema: projectSchema,
})

const links = defineCollection({
  loader: file('./src/content/links/data.json'),
  schema: linkSchema,
})

const highlightsSchema = blueskyPostsLoader({
  uris: [],
  fetchThread: true,
  fetchOnlyAuthorReplies: true,
}).schema

const releases = defineCollection({
  loader: file('./src/content/releases/data.json'),
})

const prs = defineCollection({
  loader: file('./src/content/prs/data.json'),
})

const highlights = defineCollection({
  loader: file('./src/content/highlights/data.json'),
  schema: highlightsSchema,
})

const photos = defineCollection({
  loader: file('src/content/photos/data.json'),
  schema: photoSchema,
})

const shorts = defineCollection({
  loader: glob({ base: './src/content/shorts', pattern: '**/[^_]*.{md,mdx}' }),
  schema: postSchema,
})

const changelog = defineCollection({
  loader: glob({
    base: './src/content/changelog',
    pattern: '**/[^_]*.{md,mdx}',
  }),
  schema: postSchema,
})

const streams = defineCollection({
  loader: file('./src/content/streams/data.json'),
  schema: streamSchema,
})

const feeds = defineCollection({
  loader: file('./src/content/feeds/data.json'),
})

export const collections = {
  pages,
  home,
  blog,
  projects,
  links,
  releases,
  prs,
  highlights,
  photos,
  shorts,
  changelog,
  streams,
  feeds,
}

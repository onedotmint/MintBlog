import { glob, file } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { postLoader } from './utils/post-loader'

import {
  pageSchema,
  postSchema,
  projectSchema,
  linkSchema,
  photoSchema,
  collectionSchema,
  articleSchema,
} from '~/schema'

const pages = defineCollection({
  loader: glob({ base: './src/pages', pattern: '**/*.mdx' }),
  schema: pageSchema,
})

const home = defineCollection({
  loader: glob({ base: './src/content/home', pattern: 'index.{md,mdx}' }),
})

const blog = defineCollection({
  loader: postLoader('./src/content/blog'),
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

const photos = defineCollection({
  loader: file('src/content/photos/data.json'),
  schema: photoSchema,
})

const shorts = defineCollection({
  loader: postLoader('./src/content/shorts'),
  schema: postSchema,
})

const collectionRecords = defineCollection({
  loader: glob({ base: './src/content/collections', pattern: '[^_]*.{md,mdx}' }),
  schema: collectionSchema,
})

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '[^_]*.{md,mdx}' }),
  schema: articleSchema,
})

export const collections = {
  pages,
  home,
  blog,
  projects,
  links,
  photos,
  shorts,
  collections: collectionRecords,
  articles,
}

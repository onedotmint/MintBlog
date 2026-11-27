import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { postLoader } from './utils/post-loader'
import { shortPathId } from './utils/short-collections'

import {
  pageSchema,
  postSchema,
  shortCollectionSchema,
  projectPostSchema,
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

const projectPosts = defineCollection({
  loader: postLoader('./src/content/projects/posts'),
  schema: projectPostSchema,
})

const shortCollections = defineCollection({
  loader: glob({
    base: './src/content/short-collections',
    pattern: '[^_]*.{md,mdx}',
    generateId: shortPathId,
  }),
  schema: shortCollectionSchema,
})

const shorts = defineCollection({
  loader: postLoader('./src/content/shorts', shortPathId),
  schema: postSchema,
})

export const collections = {
  pages,
  home,
  blog,
  projectPosts,
  shorts,
  shortCollections,
}

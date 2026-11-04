import { glob, file } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { postLoader } from './utils/post-loader'

import {
  pageSchema,
  postSchema,
  shortCollectionSchema,
  projectSchema,
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

const shortCollections = defineCollection({
  loader: glob({
    base: './src/content/short-collections',
    pattern: '[^_]*.{md,mdx}',
  }),
  schema: shortCollectionSchema,
})

const shorts = defineCollection({
  loader: postLoader('./src/content/shorts'),
  schema: postSchema,
})

export const collections = {
  pages,
  home,
  blog,
  projects,
  shorts,
  shortCollections,
}

import { defineCollection, z } from 'astro:content'
import { readingTypeValues } from './utils/reading-core'

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    readingTime: z.string(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    updatedAt: z.coerce.date().optional(),
    series: z.object({
      title: z.string(),
      slug: z.string().optional(),
      order: z.number().int().positive().optional(),
    }).optional(),
  }),
})

const reading = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(readingTypeValues),
    note: z.string(),
    tags: z.array(z.string()).default([]),
    url: z.string().optional(),
    image: z.string().optional(),
  }),
})

const projectLink = z.object({
  label: z.string(),
  href: z.string(),
})

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    group: z.object({
      title: z.string(),
      description: z.string(),
      order: z.number().int().nonnegative(),
    }),
    order: z.number().int().nonnegative(),
    tags: z.array(z.string()).default([]),
    link: z.string().optional(),
    detail: z.boolean().default(false),
    summary: z.string().optional(),
    designNotes: z.array(z.string()).default([]),
    links: z.array(projectLink).default([]),
    retrospective: z.string().optional(),
  }),
})

export const collections = { blog, reading, projects }

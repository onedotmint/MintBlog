import { defineCollection, z } from 'astro:content'

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

export const collections = { blog }

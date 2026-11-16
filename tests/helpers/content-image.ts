import { fileURLToPath } from 'node:url'
import { postSchema } from '../../src/schema.ts'

// Exercise Astro's content-layer image transform, not a metadata-object substitute.
const { getEntryData, safeParseFrontmatter } = await import(
  new URL('./dist/content/utils.js', import.meta.resolve('astro/package.json')).href
)

export { safeParseFrontmatter }

export async function parsePostData(
  data: Record<string, unknown>,
  schema = postSchema,
  filePath = fileURLToPath(new URL('../../src/content/blog/start.md', import.meta.url)),
): Promise<Record<string, unknown>> {
  return getEntryData(
    {
      id: 'test',
      collection: 'blog',
      unvalidatedData: { title: 'Post', pubDate: '2026-01-01', ...data },
      _internal: { filePath, rawData: undefined },
    },
    { type: 'content_layer', schema },
    false,
  )
}

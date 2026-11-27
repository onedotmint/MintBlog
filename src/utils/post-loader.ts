import { glob, type Loader } from 'astro/loaders'
import { fileURLToPath } from 'node:url'
import { fillPostMetadata } from './post-metadata'

export function postLoader(
  base: string,
  generateId?: Parameters<typeof glob>[0]['generateId'],
): Loader {
  const original = glob({ base, pattern: '**/[^_]*.{md,mdx}', generateId })
  return {
    ...original,
    async load(context) {
      // Git dates can change without Markdown edits; refresh this collection at loader startup.
      context.store.clear()
      const root = fileURLToPath(context.config.root)
      await original.load({
        ...context,
        parseData: async (entry) =>
          context.parseData({
            ...entry,
            data: entry.filePath
              ? {
                  ...entry.data,
                  ...fillPostMetadata(root, entry.filePath, entry.data),
                }
              : entry.data,
          }),
      })
    },
  }
}

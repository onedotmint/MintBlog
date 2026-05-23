import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import { normalizeReadingSlug, sortReadingResources } from './reading-core'
import type { ReadingResourceCore, ReadingResourceGroup as ReadingResourceGroupCore } from './reading-core'

export {
  getReadingResourceExternalHref,
  getReadingResourceGroups,
  normalizeReadingSlug,
  sortReadingResources,
} from './reading-core'

export type ReadingEntry = CollectionEntry<'reading'>

export type ReadingResource = ReadingResourceCore<ReadingEntry['data']> & { entry: ReadingEntry }
export type ReadingResourceGroup = ReadingResourceGroupCore<ReadingResource>

export function toReadingResource(entry: ReadingEntry): ReadingResource {
  const slug = normalizeReadingSlug(entry.slug)

  return {
    entry,
    slug,
    href: `/reading/${slug}/`,
    data: entry.data,
  }
}

export async function getReadingResources() {
  const entries = (await getCollection('reading')) as ReadingEntry[]

  return sortReadingResources(entries.map(toReadingResource))
}

import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type ReadingEntry = CollectionEntry<'reading'>

export interface ReadingResource {
  entry: ReadingEntry
  slug: string
  href: string
  data: ReadingEntry['data']
}

export interface ReadingResourceGroup {
  type: string
  resources: ReadingResource[]
}

const typeOrder = ['course', 'book', 'documentation', 'reference']

export function normalizeReadingSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
}

export function toReadingResource(entry: ReadingEntry): ReadingResource {
  const slug = normalizeReadingSlug(entry.slug)

  return {
    entry,
    slug,
    href: `/reading/${slug}/`,
    data: entry.data,
  }
}

export function sortReadingResources(resources: ReadingResource[]) {
  return [...resources].sort((left, right) => {
    const leftOrder = typeOrder.indexOf(left.data.type.toLowerCase())
    const rightOrder = typeOrder.indexOf(right.data.type.toLowerCase())
    const normalizedLeftOrder = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder
    const normalizedRightOrder = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder

    if (normalizedLeftOrder !== normalizedRightOrder) {
      return normalizedLeftOrder - normalizedRightOrder
    }

    if (left.data.type !== right.data.type) {
      return left.data.type.localeCompare(right.data.type)
    }

    return left.data.title.localeCompare(right.data.title)
  })
}

export async function getReadingResources() {
  const entries = (await getCollection('reading')) as ReadingEntry[]

  return sortReadingResources(entries.map(toReadingResource))
}

export function getReadingResourceGroups(resources: ReadingResource[]) {
  const groupsByType = new Map<string, ReadingResource[]>()

  for (const resource of sortReadingResources(resources)) {
    const existing = groupsByType.get(resource.data.type)

    if (existing) {
      existing.push(resource)
      continue
    }

    groupsByType.set(resource.data.type, [resource])
  }

  return [...groupsByType.entries()].map(([type, groupedResources]) => ({
    type,
    resources: groupedResources,
  }))
}

export function getReadingResourceExternalHref(resource: ReadingResource) {
  const rawUrl = resource.data.url?.trim()

  if (!rawUrl) {
    return undefined
  }

  try {
    const url = new URL(rawUrl)

    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

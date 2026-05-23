export interface ReadingResourceDataShape {
  title: string
  type: ReadingResourceType
  url?: string
}

export interface ReadingResourceCore<TData extends ReadingResourceDataShape = ReadingResourceDataShape> {
  slug: string
  href: string
  data: TData
}

export interface ReadingResourceGroup<TResource extends ReadingResourceCore = ReadingResourceCore> {
  type: string
  resources: TResource[]
}

export const readingTypeValues = ['Course', 'Book', 'Documentation', 'Reference'] as const

export type ReadingResourceType = (typeof readingTypeValues)[number]

const typeOrder = readingTypeValues.map((type) => type.toLowerCase())

export function isReadingResourceType(value: string): value is ReadingResourceType {
  return readingTypeValues.includes(value as ReadingResourceType)
}

export function normalizeReadingSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
}

export function sortReadingResources<TResource extends ReadingResourceCore>(resources: readonly TResource[]) {
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

export function getReadingResourceGroups<TResource extends ReadingResourceCore>(resources: readonly TResource[]) {
  const groupsByType = new Map<string, TResource[]>()

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

export function getReadingResourceExternalHref<TResource extends ReadingResourceCore>(resource: TResource) {
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

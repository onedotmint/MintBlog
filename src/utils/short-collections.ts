import type { CollectionEntry } from 'astro:content'

/** Folder name (or override title) for Shorts files written directly in `src/content/shorts/`. */
export const DEFAULT_SHORT_COLLECTION = { id: 'notes', title: '随手记' }

/** Astro's glob entry is a base-relative, slash-separated file path. */
export function shortPathId({ entry }: { entry: string }) {
  const id = entry.replace(/\.mdx?$/, '').normalize()
  // These segments or characters are rewritten by URL parsing in static output paths.
  if (
    /[\\%#?\p{Cc}]/u.test(id) ||
    id.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Shorts path "${entry}" cannot be used as a public URL.`)
  return id
}

export interface ShortCollection {
  id: string
  title: string
  description: string
  draft: boolean
  posts: CollectionEntry<'shorts'>[]
}

/** The first path segment of a post id is its collection; root files fall back to the default. */
export function getShortCollectionId(postId: string) {
  const slash = postId.indexOf('/')
  return slash === -1 ? DEFAULT_SHORT_COLLECTION.id : postId.slice(0, slash)
}

/**
 * Derives collections from folder names, so writing a post needs no frontmatter.
 * `src/content/short-collections/<id>.md` is optional and only overrides title,
 * description or draft for that folder.
 */
export function groupShorts(
  overrides: CollectionEntry<'shortCollections'>[],
  posts: CollectionEntry<'shorts'>[],
  production: boolean,
): ShortCollection[] {
  const byId = new Map<string, ShortCollection>()
  const ensure = (id: string) => {
    let group = byId.get(id)
    if (!group) {
      group = {
        id,
        title:
          id === DEFAULT_SHORT_COLLECTION.id
            ? DEFAULT_SHORT_COLLECTION.title
            : id,
        description: '',
        draft: false,
        posts: [],
      }
      byId.set(id, group)
    }
    return group
  }

  for (const post of posts) {
    if (post.id === 'collections' || post.id.startsWith('collections/'))
      throw new Error(
        `Shorts "${post.id}": collections/ is reserved for collection pages.`,
      )
    ensure(getShortCollectionId(post.id)).posts.push(post)
  }

  for (const override of overrides) {
    const group = ensure(override.id)
    const { title, description, draft } = override.data
    if (title) group.title = title
    group.description = description
    group.draft = draft
  }

  return [...byId.values()]
    .filter((group) => !production || !group.draft)
    .map((group) => ({
      ...group,
      posts: group.posts
        .filter((post) => !production || !post.data.draft)
        .sort(
          (a, b) =>
            b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
            a.id.localeCompare(b.id),
        ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
}

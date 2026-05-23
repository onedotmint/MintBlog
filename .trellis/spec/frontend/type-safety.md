# Type Safety

> TypeScript and content schema conventions.

---

## Overview

Use TypeScript for configuration, content schemas, and structured data files. Keep types close to the data they describe unless a type is reused across files.

Astro Content Collections should validate blog, reading, and project frontmatter with Zod through `src/content.config.ts`.

---

## Type Organization

Define content collection wrapper types close to the utility that normalizes that collection.

Define Astro component props with local `interface Props` blocks inside component frontmatter.

Avoid global type files in V1 unless a type is shared by several modules.

---

## Validation

The blog collection schema must validate:

```ts
{
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
}
```

Use `z.coerce.date()` so MDX frontmatter date strings become dates consistently.

`draft` and `featured` must default to `false` so existing public posts do not need extra metadata.

`updatedAt` is optional. Only display it when it is later than `date`.

`series` is optional. Each post can belong to at most one series in V1.
Use `title` as the display label, optional `slug` for stable route generation,
and optional positive integer `order` for sequence ordering.

---

## Common Patterns

Use `src/utils/articles.ts` for blog collection loading, date-desc sorting, slug normalization, and article URLs before rendering lists.

Use `src/utils/reading.ts` for reading collection loading, slug normalization, group construction, and detail URLs before rendering reading lists and detail pages.

Use `getArticles()` for public article lists and static routes. It filters out draft posts.

Use `getFeaturedArticles()` when the home page should prefer highlighted posts before falling back to recent posts.

Use `getArticleSeries()` for series index/detail pages. It groups already-published normalized articles,
keeps series routes build-time only, and sorts each series by `series.order` before falling back to publish date.

Use `getArticleTags()` and `getArticleTagHref()` for tag badges, tag indexes, sitemap entries, and tag detail pages.
Tag routes stay build-time only under `/blog/tags/<slug>/`. Do not duplicate tag slug normalization in route files.

Use `getArticleArchives()` for year archive indexes, year detail pages, and sitemap entries.
Archive routes stay build-time only under `/blog/archive/<year>/`, and each archive should reuse the already-published normalized article list from `getArticles()`.
Do not re-read blog content or duplicate draft filtering inside archive route files.

Use `getRelatedArticles()` for related-post sections. It should receive the current normalized article plus the published article list,
exclude the current article, rank by shared tag count first, then by publish date.

Format dates in one helper or local utility function when the format repeats across pages/components.

Reading resources use a dedicated content collection schema with these fields:

```ts
{
  title: z.string(),
  type: z.string(),
  note: z.string(),
  tags: z.array(z.string()).default([]),
  url: z.string().optional(),
  image: z.string().optional(),
}
```

Use a helper that normalizes the filename to the route slug and a second helper that groups resources by `type` for the index page. Keep the MDX body on the detail route, not in the index data path.

When generating blog routes or links, use the normalized slug from `src/utils/articles.ts`.
Astro collection slugs for `.mdx` content can still carry the source extension in this project,
so route URLs must normalize them first.

Projects use a dedicated content collection schema with these fields:

```ts
{
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
  links: z.array(z.object({
    label: z.string(),
    href: z.string(),
  })).default([]),
  retrospective: z.string().optional(),
}
```

Use `src/utils/projects.ts` for project collection loading, slug normalization, grouping, detail filtering, and URL construction before rendering lists, detail routes, or sitemap entries.

Use `src/utils/project-core.ts` for Astro-free project sorting, grouping, link construction, and detail guards. Add focused `node:test` coverage there when project behavior changes.

Project group ordering comes from `group.order`; item ordering inside a group comes from `order`. Do not derive project order from file system ordering.

Project detail pages are generated only for projects that pass the detail guard: `detail: true`, `summary`, `designNotes`, `links`, and `retrospective` must be present. Detail page background content comes from the MDX body via `entry.render()`.

When generating project routes or links, use the normalized slug from `src/utils/projects.ts` and the `href` returned by project helpers. Do not rebuild `/projects/${slug}/` in route files except inside the shared project helper.

Expose a typed helper that narrows to projects with detail pages before routes,
sitemap entries, or links consume the project route:

```ts
export async function getDetailedProjects() {
  return getProjectsWithDetails(await getProjects())
}
```

Do not access optional project detail fields from broad `ProjectItemData` without using the shared detail helper or guard.

---

## Forbidden Patterns

Do not use `any` for content, project, or component props.

Do not duplicate blog metadata in route files.

Do not bypass content collection validation by reading MDX files manually.

Do not keep project metadata in `src/data/projects.ts`; projects are content files under `src/content/projects/` synced from `sample-content/projects/` or private content.

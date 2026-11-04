---
id: eng.astro
applies_to:
  - src/**
  - astro.config.ts
  - tsconfig.json
  - unocss.config.ts
  - plugins.ts
  - ec.config.mjs
tags:
  - astro
  - typescript
  - structure
---

# Astro and TypeScript Conventions

## ENGA-001 Module boundaries

| Path                    | Ownership                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`            | File-based routes and route composition; Blog/Shorts keep `[...slug].astro`; current Collections uses `/shorts/`, not retired `/collections/`               |
| `src/layouts/`          | `BaseLayout` (shell) and `StandardLayout` (page/article wrapper)                                                                                         |
| `src/components/`       | Focused presentation units with typed props; never redefine collection schemas                                                                           |
| `src/content/`          | Markdown/JSON collection data                                                                                                                            |
| `src/content.config.ts` | Collection loaders and schema wiring                                                                                                                     |
| `src/schema.ts`         | Shared page/post/JSON collection schemas                                                                                                                 |
| `src/config.ts`         | `SITE`, `UI`, `FEATURES` configuration                                                                                                                   |
| `src/types.ts`          | Shared configuration and UI types (`BgType`, ...)                                                                                                        |
| `src/styles/`           | `main.css`, `prose.css`, `markdown.css`, integration styles                                                                                              |
| `src/utils/`            | Build-time helpers: content data, paths, dates, TOC, misc                                                                                                |

- `public/` contains files copied unchanged; generated build output never goes there.
- Use PascalCase for reusable `.astro` components, lowercase route directories, camelCase TypeScript utilities, and kebab-case Markdown filenames.

## ENGA-002 Type safety

- Strict TypeScript with Astro's typed Content Collections. Keep types adjacent to the configuration or utility that owns them.
- Prefer inferred types, schema validation, type predicates, and narrow unions over `as` assertions; use `import type` for type-only imports.
- `any` is forbidden for content, component props, configuration, and utility inputs.
- Use `CollectionEntry` / `CollectionKey` where utility code works with Astro entries; retrieve Collection entries through `getCollection()` or the established helpers and narrow them by declared collection key instead of unchecked casts.
- Validate external URLs at the existing schema/utility boundary before rendering.
- No second untyped content adapter that bypasses Content Collections.

## ENGA-003 Reusable logic and state

- There is no `src/hooks/` directory and no framework hooks. Reusable logic is plain TypeScript functions or Astro frontmatter; do not name plain utilities `useSomething`.
- Function names are descriptive verbs (`getFilteredPosts`, `getSortedPosts`, `buildTagRelations`, `resolvePath`). Note that the current sort helpers operate on collection arrays directly — copy first if you need the original order preserved.
- Prefer page-local derived values or focused utilities over shared mutable module-level caches; build-time work must be reproducible across routes and builds.
- Components receive focused props instead of reading configuration or collection state indirectly.

## ENGA-004 Forbidden legacy paths

`src/data/`, `src/features/`, `src/hooks/`, domain-adapter layers, `src/data/site.ts`, `src/data/profile.ts`, `src/data/now.ts`, `src/utils/articles.ts`, `src/utils/reading.ts`, `src/utils/projects.ts`, and `src/layouts/Layout.astro` are not part of this project. Referencing retired `/writing/` or `/works/` routes is an error. The current Collections section uses `/shorts/`, backed by `src/content/shorts/` and optional `src/content/short-collections/` overrides. The historical `src/content/collections/` and `src/content/articles/` data and their schemas were removed in 2026-11; do not restore them or their retired top-level `/collections/` routes. See [content.collections](../capabilities/content-collections.md).

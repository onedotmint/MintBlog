# Directory Structure

> Frontend structure for this Astro personal blog.

---

## Overview

This project is a static Astro site. Keep the app file-based, content-first, and easy to maintain by hand.

The code repository should be safe to open source. Real posts and assets may live in a private content repository, then be synced or mounted into the Astro project before build.

Use `src/pages/` for routes, `src/components/` for reusable Astro components, `src/layouts/` for page shells, `src/content/` for the Astro Content Collections mount point, `src/data/` for public-safe small typed data sets, `src/styles/` for global CSS, and `public/` for static files exposed at build time.

---

## Directory Layout

```text
src/
├── components/
│   ├── ArticleList.astro
│   ├── Badge.astro
│   ├── Footer.astro
│   ├── Nav.astro
│   ├── ReadingResourceList.astro
│   ├── ProjectItem.astro
│   ├── ProjectList.astro
│   └── SectionTitle.astro
├── content/
│   ├── blog/
│   │   ├── cs61a-week-1.mdx
│   │   ├── go-tcp-server.mdx
│   │   └── linux-nginx-note.mdx
│   ├── projects/
│   │   ├── build-pipeline-sketches.mdx
│   │   ├── nginx-static-host.mdx
│   │   └── tcp-server-lab.mdx
│   └── reading/
│       ├── astro-content-collections.mdx
│       ├── designing-data-intensive-applications.mdx
│       ├── http-reference.mdx
│       └── intro-to-astro.mdx
├── data/
│   ├── now.ts
│   └── site.ts
├── layouts/
│   └── Layout.astro
├── pages/
│   ├── about.astro
│   ├── index.astro
│   ├── now.astro
│   ├── reading.astro
│   ├── reading/
│   │   └── [slug].astro
│   ├── projects.astro
│   ├── projects/
│   │   └── [slug].astro
│   └── blog/
│       ├── [slug].astro
│       ├── index.astro
│       ├── series/
│       │   ├── [series].astro
│       │   └── index.astro
│       └── tags/
│           ├── [tag].astro
│           └── index.astro
├── styles/
│   └── global.css
└── content.config.ts

public/
├── files/
├── images/
│   ├── blog/
│   ├── reading/
│   └── projects/
└── favicon.svg
```

---

## Module Organization

Routes should stay thin. Put repeated visual patterns in components and put shared page framing in layouts.

Astro reads blog content from `src/content/blog/`. Real private posts should be synced or mounted there before build. The public code repository should only commit sample/demo posts.

Astro reads reading resources from `src/content/reading/`. Each resource is one MDX file. The index page shows frontmatter only, while the detail route renders the MDX body. Real private resources should be synced or mounted there before build, and the public repository should keep sample fallback entries.

Astro reads projects from `src/content/projects/`. Each project is one MDX file. Project list metadata, group metadata, ordering, tags, external link, and detail-page metadata belong in frontmatter. Detail page background content belongs in the MDX body. Real private projects should be synced or mounted there before build, and the public repository should keep sample fallback entries.

Static images and downloadable files are exposed from `public/`. Real private assets should be synced or mounted there before build. Reference them from MDX with root-relative URLs such as `/images/blog/example.png`.

Reading assets follow the same rule under `public/images/reading/`. Index cards and detail pages can point at synced root-relative image paths such as `/images/reading/example.svg`.

Use `.gitignore` to prevent accidentally committing real synced private content.

Small static data that is not content, such as site identity or the Now page snapshot, belongs in `src/data/`. Use TypeScript arrays and exported types when the data shape is reused.
Project pages should read normalized project content through `src/utils/projects.ts`; keep detail routes thin and generated with `getStaticPaths()`.

Global design tokens and common prose/list styles belong in `src/styles/global.css`. Component-local styles are allowed inside `.astro` files when they only apply to that component.

---

## Naming Conventions

Astro components and layouts use PascalCase file names, e.g. `ArticleList.astro` and `Layout.astro`.

Pages follow Astro routing conventions. Use lowercase route file names and folder names.

Content slugs should be lowercase kebab-case, e.g. `cs61a-week-1.mdx`.

Data files use lowercase names, e.g. `site.ts`.

---

## Examples

Use this layout for V1:

* `src/pages/index.astro` composes the hero, recent articles, and recent projects.
* `src/pages/blog/index.astro` reads the blog collection and passes entries to `ArticleList`.
* `src/pages/blog/[...slug].astro` generates static article routes from the blog collection.
* `src/pages/reading.astro` reads the reading collection and passes grouped resources to `ReadingResourceList`.
* `src/pages/reading/[slug].astro` generates static reading detail routes from the reading collection.
* `src/pages/blog/tags/index.astro` and `src/pages/blog/tags/[tag].astro` generate static tag archives from article helpers.
* `src/utils/projects.ts` loads project entries from the `projects` content collection and exposes grouped/detail helpers.
* `src/pages/projects/[slug].astro` generates static project detail routes from projects with `detail: true` metadata.
* `src/pages/now.astro` renders the current public learning snapshot from local data.
* A sync script or documented command prepares private content before `npm run build`.
* The same sync step can run in GitHub Actions before deployment.

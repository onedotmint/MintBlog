# Add Reading Resources Index

## Goal

Add a static index page for learning resources: courses, books, documentation, and technical references used while learning. The page should make resources easy to scan and should fit the current small Astro blog structure.

## What I already know

* The task exists as `.trellis/tasks/05-22-reading-resources-index/` and is now in `in_progress`.
* The site is an Astro static blog with MDX blog posts, static project data, and no runtime backend.
* Existing top-level pages are `Blog`, `Projects`, `Now`, and `About`.
* Current public content source is file-based: `private-content/` when present, otherwise `sample-content/`.
* `Projects` already includes a placeholder item named `Reading Index`, which suggests this feature can be linked from project/navigation surfaces.
* The implementation should preserve static output and avoid new dependencies, client JavaScript, CMS, database, search service, or analytics.

## Assumptions

* The index is public and static.
* Real resource records belong in the private content repository, not in the public code repository.
* The public repo can keep sample resource records so local builds and public sample output still work.
* The MVP does not need full-text search, ratings, progress tracking, or client-side filters.

## Open Questions

* None. User confirmed the MVP should include per-resource detail pages.

## Requirements

* Add a top-level `/reading/` resources index page.
* Add static per-resource detail pages under `/reading/<slug>/`.
* Add the page to primary navigation.
* Include `/reading/` in the sitemap.
* Include generated reading detail pages in the sitemap.
* Add a resources index that groups learning resources by type, such as courses, books, documentation, and technical references.
* Keep real resource records in the private content source, with sample records in `sample-content/` for public fallback.
* Extend content sync so reading Markdown/MDX files are copied into `src/content/reading/` before Astro builds.
* Store each reading resource as one Markdown/MDX file.
* Support images in reading resource content through synced private assets, with sample fallback assets in the public repo.
* Render the index at build time with static Astro.
* Render each detail page at build time with static Astro.
* Keep the page readable on desktop and mobile.
* Use existing layout, typography, and token-based CSS patterns.
* Avoid new dependencies and client-side interactivity.
* Include useful metadata per resource: title, category/type, short note, optional tags, and optional URL.
* Allow optional image references from reading MDX files, using root-relative public paths after sync.
* The `/reading/` index should display frontmatter fields only: title, type, URL, tags, image, and short note.
* The `/reading/` index should link each resource title/card to its detail page.
* Detail pages should render the resource MDX body and expose the external URL when present.
* The `/reading/` index should not render each resource MDX body.

## Acceptance Criteria

* [ ] `/reading/` exists and renders in local build output.
* [ ] `/reading/<slug>/` pages exist for each reading resource and render in local build output.
* [ ] Resources are grouped into clear categories.
* [ ] Index entries link to their detail pages.
* [ ] Detail pages render MDX body content.
* [ ] External resource links are accessible and visibly link-like.
* [ ] Reading MDX can reference synced images without broken public paths.
* [ ] Resource body content is rendered only on detail pages, not on the index page.
* [ ] The route is discoverable from primary navigation.
* [ ] The sitemap includes `/reading/` and reading detail pages.
* [ ] `npm run check:content`, `npm run check`, and `npm run build` pass.

## Definition of Done

* Tests/checks added or updated where appropriate.
* Lint, typecheck, content checks, and build are green.
* Docs or specs updated if the task creates a new reusable convention.
* Runtime and dependency budgets remain within existing limits.

## Technical Approach

Recommended MVP: store each reading resource as one Markdown/MDX file in the private content source with a committed sample fallback, sync that content before build, sync reading images into `public/images/reading/`, render grouped resource cards with a new `/reading/` Astro page, generate static detail pages under `/reading/<slug>/` from the same MDX files, reuse existing layout/components, and include the index plus detail routes in the sitemap.

This matches current project patterns:

* `private-content/` owns real content.
* `sample-content/` provides public fallback content.
* `scripts/sync-content.mjs` copies content into generated Astro/public mount points before build.
* Blog posts already use MDX content collections, so reading resources can follow the same content workflow.
* Existing asset sync already supports blog and project images; reading images should follow the same pattern with a new `assets/images/reading` target.
* `src/data/now.ts` owns Now page data.
* Routes stay thin and compose data, layout, and components.
* Existing blog and project detail routes show the static generation pattern for detail pages.
* The project prefers static Astro, TypeScript, MDX, and plain CSS.

## Decision (ADR-lite)

**Context**: The reading resources index needs a public, discoverable route.

**Decision**: Build it as a top-level `/reading/` static page with static per-resource detail pages under `/reading/<slug>/`, add the index to primary navigation, include index and detail routes in the sitemap, source real records from private content sync with sample fallback, and store each resource as one MDX file.

**Consequences**: The page becomes a first-class site section. The navigation gains one item, so the mobile wrap behavior must remain clean. The sync and content-check scripts need to understand the new reading content collection and reading image asset target. Detail routes add more sitemap entries and make the MDX body public.

**Index rendering decision**: The index renders frontmatter only. Detail pages render the MDX body. This keeps the index compact while allowing longer resource notes.

## Feasible Approaches

### Approach A: Top-level static page with synced Markdown/MDX resources

Add `src/pages/reading.astro`, `src/pages/reading/[slug].astro`, `src/content/reading/` as a synced target, sample reading files under `sample-content/reading/`, and reading image sync from `assets/images/reading`.

Pros:

* Most discoverable.
* Matches the task title: an index, not a blog post.
* Keeps real resource content out of the public code repository.
* Keeps sample fallback behavior aligned with existing content sync.
* Matches the existing Markdown/MDX authoring flow.
* No runtime feature.
* Allows each resource to carry longer public notes without crowding the index.

Cons:

* Adds another top-level nav item.
* Needs a new content collection, sync script, content check, sitemap, and nav updates.

### Approach B: Project detail page

Turn the existing `Reading Index` project placeholder into a project detail route.

Pros:

* Avoids adding a new top-level section.
* Fits the current `Projects` surface.

Cons:

* Less direct if the resource index becomes a frequently used reference page.
* Project detail schema is not a natural fit for grouped resources.
* Still needs private-content storage if real resource entries are private.

### Approach C: Blog-adjacent resources page

Add the index under `/blog/resources/` or represent resources through posts/tags.

Pros:

* Keeps learning notes close to blog content.
* Could later connect resources to posts.

Cons:

* Adds route complexity under blog.
* Blog MDX frontmatter is optimized for articles, not resource records.
* Still needs private-content storage if real resource entries are private.

## Expansion Sweep

### Future evolution

* The index may later need filters, reading status, or links from articles.
* Keeping resource records typed now leaves room for generated grouped views later.

### Related scenarios

* Navigation should stay consistent with `Blog`, `Projects`, `Now`, and `About`.
* If resources become part of the public sitemap, RSS should remain article-only.

### Failure and edge cases

* Empty or malformed resource URLs should not break the build.
* Long titles and URLs must not overflow on mobile.
* Private resource content should not be committed accidentally if it becomes private later.

## Out of Scope

* Runtime search.
* CMS or database.
* Authenticated private resources.
* Progress tracking, ratings, or completion status.
* Client-side filters.
* Rendering full resource MDX bodies on the index.

## Technical Notes

* Relevant files inspected:
  * `src/pages/blog/index.astro`
  * `src/pages/projects.astro`
  * `src/pages/now.astro`
  * `src/pages/sitemap.xml.ts`
  * `src/components/Nav.astro`
  * `src/data/projects.ts`
  * `src/data/now.ts`
  * `src/styles/global.css`
  * `src/content.config.ts`
  * `scripts/check-content.mjs`
  * `scripts/sync-content.mjs`
* Relevant specs:
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
  * `.trellis/spec/guides/simplicity-guardrails.md`
  * `.trellis/spec/guides/dependency-runtime-budget.md`
* Relevant ADR:
  * `docs/decisions/004-no-cms-or-runtime-backend-for-v1.md`

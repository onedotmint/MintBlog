---
id: content.collections
applies_to:
  - src/content/**
  - src/content.config.ts
  - src/schema.ts
  - src/utils/data.ts
  - src/utils/datetime.ts
  - src/pages/blog/**
  - src/pages/shorts/**
  - src/pages/projects/**
  - src/utils/short-collections.ts
tags:
  - content
  - routing
---

# Public content collections

- Historical sources are pages, home, blog, projects, links, photos and shorts. Templates were restored from `ca826e2`; subsequent owner-approved atmosphere changes retain their layouts. Links is now data-only: no public route, navigation entry or redirect. No experimental project archive or Connections route is generated.
- Blog and Shorts keep Markdown/MDX, schema date coercion, frontmatter fields, original rendering plugins and production draft filtering. Never fill an empty article with invented prose.
- The public display name is Collections (navigation, page title, back links and search category), backed by `shorts` and optional `shortCollections` overrides. The historical `collections` / `articles` collections were removed in 2026-11. Collections uses `/shorts/`, not the retired top-level `/collections/` routes.
- Shorts is for casual short-form writing: thoughts, everyday reflections, discoveries and brief notes, not a learning-resource collection. It has no required topic, structure or word count. `/shorts/` reuses the original CardView/CardItem presentation for one cover-free card per collection (title, optional description and post count, with member tags aggregated for the original filters); `/shorts/collections/<id>/` lists their posts newest first.
- A Shorts post's first directory segment determines collection membership; the full path relative to `src/content/shorts/`, without its extension, determines its ID and `/shorts/<post-id>/` URL. For example, `生活切片/周末/index.md` belongs to `生活切片` and uses `/shorts/生活切片/周末/index/`. IDs preserve case and normalize Unicode to NFC; `slug` and `collection` frontmatter do not control paths or membership. Reject paths containing URL-unsafe characters (`%`, `#`, `?`, `\`, or control characters). Renaming or moving a file or directory changes its URL; no redirect is generated automatically.
- `notes` defaults to the display title 「随手记」; do not create a second `随手记/` directory for the same purpose. Root files also join `notes`, so legacy root posts keep their original URLs without moving. `shortCollections` optionally overrides title, description and draft via `src/content/short-collections/<id>.{md,mdx}`; the extensionless filename, not `slug`, supplies the ID. All fields are optional; omitted/empty title uses 「随手记」 for `notes` and the directory name otherwise. No body is needed; cover is not supported. Post IDs using the reserved `collections` route namespace fail instead of colliding.
- In production, a draft collection hides its page and all its posts, including direct post routes, sitemap and search. Post drafts are excluded before collection counts; development previews both levels with draft labels. Empty public collections remain visible with zero posts. Collection names sort alphabetically; posts sort by UTC publication timestamp descending, with ID as tie-breaker.
- The original Shorts example remains at `src/content/shorts/astro-content-collections.md`, implicitly in `notes` (随手记), with its body and `/shorts/astro-content-collections/` URL preserved. This does not publish or migrate historical `collections` / `articles` records.
- Blog/Shorts/projectPosts use the native glob loader with a pre-schema metadata wrapper. Missing title uses the filename; missing publication dates use the first Git committer timestamp (following recognized renames). A missing or empty `lastModDate` uses the latest Git timestamp, clamped to publication when the latter is later. Explicit non-empty values win; invalid values are left for schema validation. Publication and non-empty modification inputs accept valid Date objects, millisecond timestamps, and ISO date or date-time strings. Date-only strings allow unpadded month/day and mean UTC midnight. Date-times without an offset mean UTC; explicit offsets are honored. Invalid calendar dates, other string formats, arrays, booleans and null are rejected. No author file is rewritten.
- Project Markdown is the sole source of directory entries and detail pages. Development lists drafts with a visible label and links to their previews; production excludes drafts from both directory entries and detail routes. No JSON directory or title-based matching remains.
- New uncommitted files temporarily use mtime locally; Git-free builds need an exact SHA-256-matched `.post-dates.json` exported from the Git checkout, not Docker checkout/file times. Shallow history is rejected. `pnpm build` automatically exports; CI uses full history and exports before Docker. The snapshot is not authored or committed and never served.
- Complete loader startup clears only its dated collection store to invalidate dates even when Markdown bytes have not changed. Ordinary saves keep native watcher/digest/render/image behavior; history-only changes in a running dev service require a restart.
- UTC date formatting/year grouping remains fixed, independent of build timezone. Every Writing, Shorts and project article detail shows a last-modified date, including first publication and same-day updates; lists, collection cards and search results do not gain another date. Empty `lastModDate` now means automatic, not hidden. Valid manual dates remain authoritative.
- `docs/templates/post.md` is the recommended static starting point for dated articles, outside content collections. It includes editable publication/modification fields and defaults to draft; copying it is optional, no-frontmatter writing remains supported, and saving/building never inserts or rewrites frontmatter.
- Do not reintroduce historical `src/content/collections/` or `src/content/articles/` data or their typed schemas; both were removed in 2026-11 after being preserved data-only. Collections is `/shorts/` only.
- Search uses only the configured public Blog/Shorts body markers. `scripts/build-search.mjs` clears stale output and skips Pagefind when no marker exists, rather than accidentally indexing every page. Search UI keeps the original visual design and only loads bundles when eligible content exists.
- HTTP(S), credential and icon validation remain on project Markdown metadata; repository, category and icon are optional, with category defaulting to `Now` and icon to `i-ri-code-line`. Project media/schema extensions and computed timeline dates from the redesign are archived, not production content requirements.
- All pre-restoration content and media are preserved in the verified external worktree backup. Home and the original project/Shorts data are restored to their historical source; current Blog/Links and unpublished collection data remain in the restored source tree.

## Crawl metadata

- `src/pages/robots.txt.ts` generates the public allow-all robots policy and sitemap URL from `SITE.website` / `SITE.base`; no robots integration or separate hand-maintained domain is needed.

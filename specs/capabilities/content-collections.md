---
id: content.collections
applies_to:
  - src/content/**
  - src/content.config.ts
  - src/schema.ts
  - src/utils/data.ts
  - src/utils/datetime.ts
  - src/pages/blog/**
tags:
  - content
  - routing
---

# Content after original-site restoration

- Historical sources are pages, home, blog, projects, links, photos and shorts. Templates were restored from `ca826e2`; subsequent owner-approved atmosphere changes retain their layouts. Links is now data-only: no public route, navigation entry or redirect. No experimental project archive or Connections route is generated.
- Blog and Shorts keep Markdown/MDX, schema date coercion, frontmatter fields, original rendering plugins and production draft filtering. Never fill an empty article with invented prose.
- Blog/Shorts use the native glob loader with a pre-schema metadata wrapper. Missing title uses the filename; missing publication/update dates use first/latest Git committer timestamps (following recognized renames). Explicit values, including empty lastModDate, win; invalid values still fail schema validation. No author file is rewritten.
- New uncommitted files temporarily use mtime locally; Git-free builds need an exact SHA-256-matched `.post-dates.json` exported from the Git checkout, not Docker checkout/file times. Shallow history is rejected. `pnpm build` automatically exports; CI uses full history and exports before Docker. The snapshot is not authored or committed and never served.
- Complete loader startup clears only its Blog/Shorts store to invalidate dates even when Markdown bytes have not changed. Ordinary saves keep native watcher/digest/render/image behavior; history-only changes in a running dev service require a restart.
- UTC date formatting/year grouping remains fixed and covered by tests, independent of build timezone. Automatic Updated is hidden until a later UTC date; manually supplied dates retain their original behavior.
- Preserve the existing Collections/Articles Markdown files and typed schemas as data only. They still have no public routes and do not enter sitemap, RSS or search. No copy of those entries is automatically published into Blog.
- Search uses only the configured public Blog/Shorts body markers. `scripts/build-search.mjs` clears stale output and skips Pagefind when no marker exists, rather than accidentally indexing every page. Search UI keeps the original visual design and only loads bundles when eligible content exists.
- HTTP(S), credential and icon validation from the original group schema remain. Project media/schema extensions and computed timeline dates from the redesign are archived, not production content requirements.
- All pre-restoration content and media are preserved in the verified external worktree backup. Home and the original project/Shorts data are restored to their historical source; current Blog/Links and unpublished collection data remain in the restored source tree.

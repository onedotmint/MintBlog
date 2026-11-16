# MintBlog Constitution

Repo-wide rules already established by the code, configuration, and workflows.

## Build model

- MintBlog is a single **static Astro site**. Routes, content, and metadata are built at build time; there is no application backend, request-time database, or runtime data service.
- Static-first: content collections and Astro produce the HTML. Do not add a client framework, global state library, or browser fetch for content, routing, filtering, or navigation that the build can do.
- Primary navigation, page content, and links must remain usable without optional browser enhancements.

## Sources of truth

- `src/config.ts` is the single source for site identity, navigation, UI behavior, and `FEATURES` switches. Do not create a second site-identity module.
- `src/schema.ts` owns runtime content schemas; `src/content.config.ts` registers `pages`, `home`, `blog`, `projects`, `projectPosts`, `shorts`, and public `shortCollections`, and connects their schemas (historical `collections` and `articles` have been removed).
- `src/utils/data.ts` owns shared draft filtering, ordering, slug, and URL transformations for content; `src/utils/path.ts` owns base-aware and trailing-slash path handling.
- `package.json` is the source of truth for supported commands.

## Content safety

- Content is validated through Content Collections and `src/schema.ts`; do not parse frontmatter manually in routes.
- Production builds exclude drafts consistently: `draft: true` Blog/Shorts entries and public Shorts collections (including every post in a draft collection) must not generate public pages, links or search entries. Historical `collections` and `articles` have been removed and must not be restored or published.
- Validate external URLs and image inputs at the existing schema/utility boundary (HTTP(S)-only, timeout, byte limit); never render an unchecked external value as a link, image source, or redirect.
- `src/types.ts` owns `BG_TYPES`, its derived `BgType`, and `isBgType`; content schemas and optional OG validation reuse that source. Keep `src/components/backgrounds/Background.astro` and OG image assets complete for those types. The restored backgrounds remain available; the subsequent owner-approved atmosphere blend adds CSS-only `breeze` (Home) and `mist` (Writing), without importing the archived redesign engine. `false` disables decoration.

## Quality and verification

- Keep changes small, type-safe, and consistent with the checked-in Astro structure. Preserve semantic HTML, keyboard access, focus states, image alt text, contrast, responsive layout, and reduced-motion behavior.
- Supported checks are `pnpm sync`, `pnpm check`, `pnpm lint` (zero warnings), `pnpm test`, `pnpm format`, and `pnpm build`. Do not report commands that are not in `package.json`. Private `.local/` experiments stay outside Git, production checks and Docker contexts; this does not exempt production code from lint rules.
- Never modify generated output: `dist/`, `.astro/`, and `node_modules/`.
- Do not commit secrets or deployment keys; deployment credentials live only in GitHub secrets and the VPS-side ignored `.env`.

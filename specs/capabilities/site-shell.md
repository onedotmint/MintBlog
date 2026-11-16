---
id: site.shell
applies_to:
  - src/layouts/**
  - src/components/**
  - src/config.ts
  - src/types.ts
  - src/styles/**
tags:
  - layout
  - restoration
---

# Restored shell with a restrained atmosphere blend

- Structural and typography baseline is Git `ca826e279870b4d6582403bb3ec4cb75047e7f70` (2026-07-25). A subsequent explicit owner request permits a restrained wind/mist blend while retaining that shell; this does not authorize another whole-site redesign.
- Keep its original BaseLayout, StandardLayout, component markup, global/prose/Markdown CSS, Inter / DM Mono / Roboto Condensed font configuration, spacing, colours and navigation.
- Navigation is Writing (`/blog/`), Projects and Collections (display name of the existing `/shorts/` section), followed by the existing function icons. The owner subsequently removed Links: no navigation entry, public `/links/` route or replacement/redirect. Preserve its JSON data only. Use existing base-path helpers.
- Home uses CSS-only `breeze`: soft directional light and colour, no visible line network. Writing and Shorts use CSS-only `mist`. Writing retains its list layout; Shorts reuses its original CardView/CardItem grid, centered heading, card styling, hover behavior and tag controls, with each card now representing a cover-free collection. Collection interiors use text post lists with neutral, unchanged text colours on hover; do not add green/other accent hover colours or substitute a new card design. Both reuse the earlier Lab's muted green/warm radial-gradient approach, not its controllers. The reading column is masked quieter; mobile and reduced-motion are static, hidden tabs pause, and print omits decoration. No WebGL, canvas loop or new dependency.
- Projects retains original Signal. Shorts no longer uses the theme's particle network. Article backgrounds follow their unchanged frontmatter defaults (normally `false`). Original Signal Plus, Rose and other historical backgrounds remain selectable. Optional OG rendering accepts the new types with a shared static atmosphere image; OG remains disabled by default.
- Native Astro components, ClientRouter lifecycle and original theme/search/navigation interactions remain. Preserve the nonvisual cancellation handler for interrupted theme transitions, UTC date handling and Pagefind empty-index safeguards without changing their visible design.
- Disabled historical features remain disabled by their original FEATURES flags; restored original support code is not permission to enable comments, sharing or OG generation.
- `.local/` is a private archive/tool boundary, never production source. The archived Visual Lab can be run from the complete external pre-restoration worktree when its old production imports are required.
- Owner-authorized logo exception: `LogoButton.astro` replaces the old `onedotmint-wordmark.svg` `<img>` with the inline `Three-Beat Rhythm` SVG (`currentColor`, `36x36px`) while preserving the home `Link` and accessibility attributes; it also includes an owner-authorized, CSS-only sequential stroke-reveal mask animation that plays once on entry without looping and renders the full mark immediately under `prefers-reduced-motion: reduce` and `print`.
- Subsequent changes need an explicit task; do not use restoration as another visual-polish opportunity.

- Release accessibility hardening preserves the restored visual shell: mobile primary links are present in static HTML until navigation enhancement is initialized; enhanced panels synchronize their trigger state, move/contain keyboard focus, and restore it on dismissal. Every modal panel provides a named close button inside the dialog, usable without a keyboard or backdrop access. Panel effects cancel obsolete close callbacks, and navigation releases the old scroll lock.
- Keyboard focus must not enter desktop-hidden mobile controls or an invisible return-to-top button. Sidebars reveal on keyboard focus as well as hover; skip links have visible focus styling and focusable, non-display-none targets.
- Search enhancement defers Pagefind loading until a non-empty query, awaits one shared initialization, retries failed initialization on later input, and discards stale requests. IME composition is never intercepted for result navigation. Browser-storage failure or invalid category state must not disable search.
- Search results expose a named listbox containing article groups/options, separate status and pagination controls, and a synchronized active descendant on the input. Category tabs use roving focus with arrow/Home/End navigation; loading more results preserves the current selection. For active queries, category and pagination clicks return focus to the input synchronously; asynchronous completion must not move focus, including after closing and reopening a panel.
- The existing home illustration keeps its source and approximately 512px desktop display width, uses its verified 1024×509 intrinsic size with responsive height/width constraints and descriptive alt text, and opts out of the image-viewer cursor because Home has no viewer.
- Search browser behavior lives in `src/scripts/search-panel.ts`, registered by the Astro shell. Its Pagefind import is a narrow typed I/O boundary; development fixtures use the same result renderer as production, and category labels come from the rendered template. Controller and panel-effect behavior tests import ordinary TS modules instead of rewriting their source.
- Desktop aside branches have distinct IDs and share `data-desktop-aside`; animation exclusion targets that shared marker rather than a duplicated ID.
- Owner-approved article metadata exception: both PostMeta styles always show a labelled last-modified date on Writing, Shorts and project article details, including first publication. This does not add modification dates to lists, collection cards or search results, or change their ordering.

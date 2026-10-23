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
- Navigation is Writing (`/blog/`), Projects and Shorts, followed by the existing function icons. The owner subsequently removed Links: no navigation entry, public `/links/` route or replacement/redirect. Preserve its JSON data only. Use existing base-path helpers.
- Home uses CSS-only `breeze`: soft directional light and colour, no visible line network. Writing and Shorts use CSS-only `mist`, retaining their existing list/card layouts. Both reuse the earlier Lab's muted green/warm radial-gradient approach, not its controllers. The reading column is masked quieter; mobile and reduced-motion are static, hidden tabs pause, and print omits decoration. No WebGL, canvas loop or new dependency.
- Projects retains original Signal. Shorts no longer uses the theme's particle network. Article backgrounds follow their unchanged frontmatter defaults (normally `false`). Original Signal Plus, Rose and other historical backgrounds remain selectable. Optional OG rendering accepts the new types with a shared static atmosphere image; OG remains disabled by default.
- Native Astro components, ClientRouter lifecycle and original theme/search/navigation interactions remain. Preserve the nonvisual cancellation handler for interrupted theme transitions, UTC date handling and Pagefind empty-index safeguards without changing their visible design.
- Disabled historical features remain disabled by their original FEATURES flags; restored original support code is not permission to enable comments, sharing or OG generation.
- `.local/` is a private archive/tool boundary, never production source. The archived Visual Lab can be run from the complete external pre-restoration worktree when its old production imports are required.
- Subsequent changes need an explicit task; do not use restoration as another visual-polish opportunity.

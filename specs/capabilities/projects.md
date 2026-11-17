---
id: projects.directory
applies_to:
  - src/pages/projects.mdx
  - src/components/views/GroupView.astro
  - src/components/views/GroupItem.astro
  - src/content/projects/**
tags:
  - projects
  - restoration
---

# Project directory and Markdown introductions

- Keep the restored Projects `StandardLayout` / `GroupView` / `GroupItem` composition, centred title, existing article/home links, category headings and Signal background. No redesign, timeline or experimental archive is introduced.
- Each `src/content/projects/posts/**/*.{md,mdx}` file supplies both a directory entry and its rendered introduction at `/projects/<relative-path-without-extension>/`. Existing Reroute and Siftpath detail URLs remain unchanged; MintBlog gains its own introduction. There is no separate JSON directory, title matching or required repository URL.
- Reuse the normal post loader and schema: omitted title comes from the filename, dates come from Git with the existing local fallback, and Markdown body is the introduction. Optional `description` supplies the list summary, `repo` supplies the detail-page repository button, `category` defaults to `Now`, and `icon` defaults to `i-ri-code-line`. Preserve credential-free HTTP(S) and icon validation.
- Directory entries sort newest publication first, with ID as tie-breaker, and group by category in encounter order. Every card links to its own detail URL, independent of its title. Markdown icons are extracted by UnoCSS's existing content scan; the default icon is safelisted.
- Development lists draft projects with a visible draft label and allows detail previews. Production excludes draft entries and routes. A new project is only a Markdown content operation; no layout edit, JSON entry or frontmatter is required.
- Private experiments and supporting worktrees remain outside production. Do not restore Links, Connections or the rejected visual system.

---
id: eng.quality
applies_to:
  - package.json
  - eslint.config.mjs
  - .github/workflows/**
  - docs/**
tags:
  - quality
  - ci
  - checks
---

# Quality Gates and Commands

## ENGQ-001 Supported commands

`package.json` is the source of truth. The supported checks are:

```bash
pnpm sync    # astro sync
pnpm check   # astro check
pnpm lint    # eslint, --max-warnings 0
pnpm test    # node --test tests/*.test.ts
pnpm format  # prettier --check
pnpm build   # astro build + postbuild (pagefind)
```

`pnpm test` runs the checked-in dependency-light tests, including lint-boundary negative probes. There is no `check:baseline`, `design:baseline`, `check:content`, `build:deploy`, or `check:static` script. Do not report commands that are not in `package.json`.

Pre-commit runs `simple-git-hooks` → `lint-staged` → `eslint` on changed files.

## ENGQ-002 Pre-completion expectations

- The changed paths and commands must exist in the current repository.
- Run the narrowest applicable checks, and run `pnpm check`, `pnpm lint`, `pnpm test`, and `pnpm build` before completion unless an environment limitation is recorded. CI runs these gates before image publishing; PRs also build the static site.
- For documentation-only work, verify Markdown links, paths, and commands against checked-in sources.
- `pnpm build` also runs the Pagefind postbuild step, so search index and route changes are only proven by a real build.

## ENGQ-003 Astro version

The manifest declares Astro as `^7.4.2` — a caret range, not an exact pin. Inspect the lockfile for resolved versions. The security baseline uses Node 24.22.1 (local version files, CI and Docker build) and pnpm 10.34.7. Audit the complete dependency graph with `pnpm audit`, not `--prod`: this static site intentionally lists its build toolchain in devDependencies. Do not hide advisories or lower the severity gate to make CI pass.

The unused del-cli was removed. The Astro lint toolchain uses supported ESLint 10 / eslint-plugin-astro 3 and its current recommended flat config; keep production lint-boundary tests intact. KaTeX <0.18.2 is overridden to 0.18.10 pending compatible upstream remark/rehype ranges; keep the rendered-math CSS version synchronized and regression-test formulas before changing/removing this override.

## ENGQ-004 Repository discipline

- Do not modify generated output: `dist/`, `.astro/`, `node_modules/`.
- Check `FEATURES` before coupling code or documentation to optional functionality.
- Keep the site's accessibility and static fallback intact when changing presentation: semantic landmarks, focus behavior, descriptive labels, image alt text, contrast, no horizontal overflow at narrow widths, and reduced-motion respect.

## ENGQ-005 Local experiment boundary

`.local/` contains private experiments, downloaded third-party research, browser evidence and scratch files. It is excluded consistently by Git, ESLint, Prettier, TypeScript and Docker context rules, not by disabling code-quality rules. Production `src/`, `scripts/`, `tests/` and root configuration remain linted. Preserve local experiments, but never force-add or deploy that tree.

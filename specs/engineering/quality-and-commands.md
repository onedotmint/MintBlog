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
pnpm lint    # eslint, --report-unused-disable-directives --max-warnings 0
pnpm test    # node --test tests/*.test.ts
pnpm format  # prettier --check
pnpm build   # astro build + postbuild (pagefind)
```

`pnpm test` runs the checked-in dependency-light tests, including lint-boundary negative probes. There is no `check:baseline`, `design:baseline`, `check:content`, `build:deploy`, or `check:static` script. Do not report commands that are not in `package.json`.

Pre-commit runs `simple-git-hooks` → `lint-staged` → `eslint --report-unused-disable-directives --max-warnings 0` on staged JS/TS/Astro files (`*.{js,mjs,cjs,ts,tsx,mts,cts,astro}`).

## ENGQ-002 Pre-completion expectations

- The changed paths and commands must exist in the current repository.
- Run the narrowest applicable checks, and run `pnpm check`, `pnpm lint`, `pnpm test`, and `pnpm build` before completion unless an environment limitation is recorded. CI runs these gates before image publishing; PRs also build the static site.
- For documentation-only work, verify Markdown links, paths, and commands against checked-in sources.
- `pnpm build` also runs the Pagefind postbuild step, so search index and route changes are only proven by a real build.

## ENGQ-003 Astro version

The manifest declares Astro as `^7.4.7` — a caret range, not an exact pin. Inspect the lockfile for resolved versions. The security baseline uses Node 24.22.1 (local version files, CI and Docker build) and pnpm 10.34.7. Audit the complete dependency graph with `pnpm audit`, not `--prod`: this static site intentionally lists its build toolchain in devDependencies. Do not hide advisories or lower the severity gate to make CI pass.

The unused del-cli was removed. The Astro lint toolchain uses supported ESLint 10 / eslint-plugin-astro 3 and its current recommended flat config; keep production lint-boundary tests intact. KaTeX <0.18.2 is overridden to 0.18.10 pending compatible upstream remark/rehype ranges; keep the locally bundled math CSS/fonts version synchronized and regression-test formulas before changing/removing this override. TypeScript is limited to `~6.0.3` because the current check/ESLint tools do not support TypeScript 7. The minimatch override upgrades old toolchain consumers to 11.0.1; preserve matching, ignore-boundary and lint regression tests. Satori pins an affected fflate release upstream, so its scoped fflate override selects 0.7.5 until upstream updates. The scoped `@astrojs/rss>fast-xml-parser` override selects 5.12.0 for GHSA-474x-hrwr-fgx4, compatible with RSS's `^5.5.7`; remove it once the parent requires a patched minimum. Astro 7.4.7 is the minimum for GHSA-r3h5-4585-7x3w. Keep the installed patch-version and real RSS/XML compatibility tests. Use only the scoped `@napi-rs/wasm-runtime@1.2.4>@emnapi/runtime` override to 1.11.3 for Astro check's core 1.x bridge: auto-resolving runtime 2.x there crashes `pnpm check`. Do not pin runtime globally; Rolldown's optional WASM bindings use core/runtime 2.0.0-beta.2 together. Keep lockfile regression tests for both generations, reassess the scoped override when the old bridge upgrades, and keep strict peer validation enabled.

## ENGQ-004 Repository discipline

- Do not modify generated output: `dist/`, `.astro/`, `node_modules/`.
- Check `FEATURES` before coupling code or documentation to optional functionality.
- Keep the site's accessibility and static fallback intact when changing presentation: semantic landmarks, focus behavior, descriptive labels, image alt text, contrast, no horizontal overflow at narrow widths, and reduced-motion respect.

## ENGQ-005 Local experiment boundary

`.local/` contains private experiments, downloaded third-party research, browser evidence and scratch files. It is excluded consistently by Git, ESLint, Prettier, TypeScript and Docker context rules, not by disabling code-quality rules. Production `src/`, `scripts/`, `tests/` and root configuration remain linted. Preserve local experiments, but never force-add or deploy that tree.

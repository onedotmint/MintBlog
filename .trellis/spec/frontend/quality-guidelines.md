# Quality Guidelines

> Quality standards for the Astro personal blog.

---

## Overview

The quality bar for V1 is a small, static, maintainable site that builds cleanly and presents content well across desktop and mobile.

Prefer simple Astro, TypeScript, MDX, and CSS over extra dependencies.

---

## Forbidden Patterns

Do not add:

* database
* CMS
* authentication
* comment system
* search system
* analytics
* heavy animation library
* heavyweight UI framework
* client-side state library

Do not copy source code, exact structure, copy, or design details from antfu.me. Only broad visual mood is allowed as reference.

Do not use pure white body text on pure black background. The requested theme is near-black with soft gray text.

---

## Required Patterns

Use CSS variables for theme tokens:

```css
:root {
  --bg: #080808;
  --bg-soft: #0d0d0d;
  --text: #e7e7e7;
  --text-muted: #9a9a9a;
  --border: #242424;
  --accent: #d8d8d8;
  --accent-muted: #747474;
  --card: #101010;
  --radius: 8px;
}
```

Keep max content width around 760-900px.

Use low-contrast borders, subtle hover states, and restrained decoration.

Keep transitions between 150ms and 250ms.

Ensure mobile layouts do not overflow horizontally.

---

## Testing Requirements

For V1, run:

```bash
npm run check:content
npm run check
npm run build
```

`npm run check:content` must pass before publishing content. It validates blog,
reading, and project frontmatter, root-relative public asset links, and empty or
duplicated tags.

If additional Astro check or lint scripts are configured, run them before finishing.

## Scenario: Utility and Script Unit Tests

### 1. Scope / Trigger

- Trigger: adding or changing reusable utility behavior or build-time validation script behavior.
- Scope: keep tests local, fast, and dependency-light for static blog helpers and Node scripts.

### 2. Signatures

- Command: `npm test`
- Runner: `node --test "tests/**/*.test.mjs"`
- Test files: `tests/*.test.mjs`
- TypeScript helper: `tests/import-ts-module.mjs`

### 3. Contracts

- Tests must not add a browser, backend service, database, or runtime dependency.
- Tests may use Node's built-in `node:test` and the existing `typescript` dev dependency.
- Tests for Astro-free utility logic should import pure utility modules, not `astro:content` entry modules.
- Build-time scripts that need tests should expose pure functions while keeping CLI output and exit behavior stable.
- RSS and sitemap route output should be built by pure utility functions, then consumed by thin Astro route adapters.
- XML builders should receive already-filtered public content lists from shared helpers such as `getArticles()`.

### 4. Validation & Error Matrix

- Missing test command -> add `npm test`.
- New utility behavior without focused assertions -> add a unit test.
- Script behavior only reachable through `process.exit` -> expose a pure function and test that function.
- Test helper adds an unexpected dependency -> reject it and use existing tooling.
- RSS XML with unescaped title or description -> test fails on escaped entity assertions.
- Sitemap article URL without `updatedAt`/`date` lastmod -> test fails on exact `<lastmod>` assertion.
- Draft article passed through public article helper -> test fails because draft slug appears in RSS or sitemap output.

### 5. Good/Base/Bad Cases

- Good: test `src/utils/article-core.ts` sorting with fake article objects.
- Good: test `src/utils/rss.ts` and `src/utils/sitemap.ts` with fake article objects and exact XML substrings.
- Base: test a script through exported `validateContent()` using a temporary fixture directory.
- Bad: add Vitest, Playwright, or browser tooling only for small pure helper tests.
- Bad: test `rss.xml.ts` or `sitemap.xml.ts` by mocking `astro:content` when the XML assembly can be tested as a pure helper.

### 6. Tests Required

- Article utility tests cover slug normalization, taxonomy grouping, date sorting, featured fallback, and related ranking.
- Reading utility tests cover slug normalization, grouping, ordering, and external URL safety.
- Project utility tests cover slug normalization, group/order sorting, detail filtering, and project href construction.
- Content validation tests cover at least one passing fixture and one failing fixture with file-specific errors.
- RSS and sitemap tests cover absolute URLs, XML escaping, draft filtering through public article helpers, and sitemap article lastmod dates.
- Finish by running `npm test`, `npm run check`, and `npm run check:budget`.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

#### Correct

```json
{
  "scripts": {
    "test": "node --test \"tests/**/*.test.mjs\""
  }
}
```

## Scenario: Static Article Reading Experience

### 1. Scope / Trigger

- Trigger: changes to article detail layout, prose CSS, table of contents, adjacent article navigation, or code/table overflow behavior.
- Scope: static Astro article reading experience only; no client JavaScript.

### 2. Signatures

- Route: `src/pages/blog/[slug].astro`
- Components: `src/components/ArticleTableOfContents.astro`, `src/components/ArticleReadingNav.astro`
- Shared styles: `src/styles/global.css`
- Visual baseline command: `npm run design:baseline`

### 3. Contracts

- Article pages render semantic `<article>` content with an accessible title target.
- Long body content has a focus-visible skip link before the article body.
- Table of contents uses `entry.render()` headings and remains static.
- Adjacent navigation uses semantic `nav` and descriptive accessible labels.
- Body links are visibly underlined; hover cannot be the only affordance.
- Code blocks and tables must scroll horizontally inside the content column instead of widening the viewport.

### 4. Validation & Error Matrix

- Added client JavaScript for TOC, reading progress, or copy buttons -> reject for V1 static reading work.
- Long code/table content widens mobile viewport -> fix CSS overflow.
- Body links rely only on color or hover -> add persistent underline.
- Visual article-page change without refreshed baseline -> run `npm run design:baseline` or document why unavailable.

### 5. Good/Base/Bad Cases

- Good: CSS-only prose improvements with code block overflow and focus-visible skip link.
- Base: route loads article data, renders `Content`, TOC, adjacent nav, and related articles.
- Bad: adding a client island to highlight the current TOC section for a readability-only task.

### 6. Tests Required

- Run `npm test`.
- Run `npm run check`.
- Run `npm run build`.
- Run `npm run design:baseline` for visual article-page changes.

### 7. Wrong vs Correct

#### Wrong

```astro
<script>
  // scroll spy for static article reading
</script>
```

#### Correct

```css
.post-body :global(pre) {
  max-width: 100%;
  overflow-x: auto;
}
```

## Scenario: CI Quality Workflow

### 1. Scope / Trigger

- Trigger: adding or changing the GitHub Actions workflow that validates the
  Astro site before merge.
- Scope: quality checks only; deployment stays in the deploy workflow.

### 2. Signatures

- Workflow file: `.github/workflows/quality.yml`
- Events: `push`, `pull_request`
- Runner: `ubuntu-latest`
- Node version: `20`
- Install command: `npm ci`
- Quality commands, in order:
  1. `npm run check`
  2. `npm test`
  3. `npm run build`

### 3. Contracts

- The workflow must use `actions/checkout@v4`.
- The workflow must use `actions/setup-node@v4`.
- The setup step must enable `cache: npm`.
- The workflow must not require private content or deployment secrets.
- The workflow must validate using public sample content when no private source
  exists.
- The workflow must not deploy, upload artifacts, or mutate production state.

### 4. Validation & Error Matrix

- Missing `package-lock.json` compatibility -> `npm ci` fails.
- Content schema or route issue -> `npm run check` fails.
- Utility or script regression -> `npm test` fails.
- Static output or budget issue -> `npm run build` fails through `postbuild`.
- Secret-dependent build path -> pull request workflow becomes unusable and
  must be rejected.

### 5. Good/Base/Bad Cases

- Good: separate `quality.yml` runs `npm ci`, `npm run check`, `npm test`, and
  `npm run build` on push and pull request.
- Base: workflow uses Node 20 and npm cache, matching deploy.
- Bad: quality workflow reads deploy secrets, runs `rsync`, or deploys from pull
  requests.

### 6. Tests Required

- Run `npm run check`.
- Run `npm test`.
- Run `npm run build`.
- Run a workflow linter such as `actionlint` when available.

### 7. Wrong vs Correct

#### Wrong

```yaml
- name: Build and deploy
  run: rsync -az --delete dist/ "$DEPLOY_TARGET"
```

#### Correct

```yaml
- name: Build site
  run: npm run build
```

Manual verification should cover:

* home page
* blog index
* at least one blog detail page
* projects page
* about page
* narrow mobile viewport

## Scenario: Design Screenshot Baseline

### 1. Scope / Trigger

- Trigger: work that adds or refreshes manual visual reference screenshots.
- Scope: capture static Astro output for representative public pages without adding visual-regression infrastructure.

### 2. Signatures

- Command: `npm run design:baseline`
- Script: `scripts/capture-design-baseline.mjs`
- Output: `docs/design-baseline/screenshots/*.png`
- Documentation: `docs/design-baseline/README.md`

### 3. Contracts

- The command must run `npm run build` before capturing screenshots.
- The script must serve only generated `dist/` files from a local ephemeral HTTP port.
- The script must use local Chrome or Chromium found on `PATH`, or `CHROME_PATH` when a custom browser path is needed.
- Baseline viewports are desktop `1440x1200` and mobile `390x900`.
- Baseline route coverage must include home, blog index, one article detail page, projects index, one project detail page, and about.
- Screenshot output is documentation data, not runtime site output.

### 4. Validation & Error Matrix

- Missing `dist/` -> print an error telling the contributor to run `npm run build`.
- Missing Chrome/Chromium -> print an error telling the contributor to set `CHROME_PATH`.
- Local port listen failure -> print the listen error and exit non-zero.
- Browser capture failure -> print the Chromium error and exit non-zero after closing the local server.
- Missing generated PNGs -> treat the baseline refresh as failed.

### 5. Good/Base/Bad Cases

- Good: `npm run design:baseline` produces desktop and mobile PNGs for every documented route.
- Base: `CHROME_PATH=/path/to/chrome npm run design:baseline` works when the browser is not on `PATH`.
- Bad: adding Playwright, a CI pixel-diff gate, or shipped client JavaScript only to support this manual baseline.

### 6. Tests Required

- Run `npm run design:baseline`.
- Run `npm run check`.
- Verify the expected PNG count under `docs/design-baseline/screenshots/`.
- Verify PNG dimensions match the documented desktop and mobile viewports.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "scripts": {
    "visual:test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.0.0"
  }
}
```

#### Correct

```json
{
  "scripts": {
    "design:baseline": "npm run build && node scripts/capture-design-baseline.mjs"
  }
}
```

---

## Code Review Checklist

Check that:

* pages are static and generated by Astro
* Content Collections validate blog frontmatter
* `npm run check:content` passes for public sample content and synced private content
* project data is centralized in the `projects` content collection
* canonical URLs, RSS, sitemap, Open Graph, Twitter metadata, and default social image paths derive from `src/data/site.ts`
* default social image metadata is emitted by `src/layouts/Layout.astro` with absolute `og:image` and `twitter:image` URLs
* static tag, series, year archive, and Now pages appear in `sitemap.xml` when present
* global CSS tokens are used instead of hard-coded repeated colors
* typography is readable in article pages
* code blocks are legible in dark theme
* hover/focus states are subtle but visible
* no unnecessary dependency was added
* the official Astro MDX integration is used for `.mdx` posts
* static assets are referenced from `public/` without adding an upload backend
* private real content is not committed to the public code repository
* the site can still build with public sample content
* CI can build from public code plus private content using secrets
* private repository credentials are never hard-coded in source files
* deployment uploads only the generated `dist/` output to the server
* the production server serves static files with Nginx and does not need a Node app process
* project detail pages are generated statically and included in `sitemap.xml`

# Quality Guidelines

> Backend quality policy.

---

## Overview

V1 should not include backend code. The backend quality gate is to keep the static blog free of unnecessary runtime infrastructure.

---

## Forbidden Patterns

Do not add:

* database
* ORM
* API server
* auth layer
* queues
* background workers
* CMS backend

---

## Required Patterns

Use Astro static generation for blog pages and local files for content/data.

## Scenario: Content Validation Script

### 1. Scope / Trigger

- Trigger: changes to `scripts/check-content.mjs` or content frontmatter validation.
- Scope: build-time validation only; Astro Content Collections remain the source of schema validation.

### 2. Signatures

- Command: `npm run check:content`
- Entry point: `scripts/check-content.mjs`
- Test file: `tests/check-content.test.mjs`

### 3. Contracts

- Blog frontmatter requires `title`, `date`, `description`, `tags`, and `readingTime`.
- Reading frontmatter requires `title`, `type`, and `note`; `tags` is optional.
- `tags` must support quoted inline arrays, block arrays, empty arrays, and quoted values containing commas.
- Optional blog `series` may be a block object or inline object. Series routes derive from `series.slug`, then `series.title`.
- Internal root-relative links and public asset paths must remain file-specific checks.

### 4. Validation & Error Matrix

- Missing required scalar -> `missing required frontmatter: <key>`
- Missing or empty blog `tags` -> `missing required frontmatter: tags`
- Empty tag value -> `tags cannot contain empty values`
- Duplicate tag ignoring case -> `duplicate tag: <tag>`
- Unknown root-relative route or public file -> `missing internal route or public file: <path>`
- Invalid blog `date` -> `date must use YYYY-MM-DD`
- Invalid blog `updatedAt` -> `updatedAt must use YYYY-MM-DD`
- Blog `updatedAt` before `date` -> `updatedAt must not be earlier than date`
- Invalid blog `readingTime` -> `readingTime must use minutes format like "4 min"`
- Invalid blog `series.order` -> `series.order must be a positive integer`
- Reading entry without `url` and without body content -> `reading resources require url or body content`
- Reading `url` that is neither `http(s)` nor root-relative -> `url must be http(s) or a root-relative internal target`

### 5. Good/Base/Bad Cases

- Good: `tags: ["Go, Systems", "Astro"]`
- Good: `readingTime: "4 min"`
- Good: reading resource with `url: "https://example.com"` or body notes
- Base:
  ```yaml
  tags:
    - "Astro"
    - "Content"
  ```
- Bad: parsing inline arrays with `value.split(',')`, because quoted commas become false tag values.
- Bad: `date: "2026-02-30"` or `updatedAt` earlier than `date`.
- Bad: `readingTime: "about four minutes"`; keep the short minutes format.
- Bad: reading resource with only metadata and no `url` or body.

### 6. Tests Required

- Add `node:test` coverage for any parser behavior change.
- Include at least one valid-content case and one actionable error case when changing validation semantics.
- Run `npm test` and `npm run check`.

### 7. Wrong vs Correct

#### Wrong

```js
return rawValue.split(',').map((tag) => tag.trim())
```

#### Correct

```js
return splitTopLevelCommaValues(rawValue).map(cleanScalarValue)
```

## Scenario: Static Docker Compose Deployment

### 1. Scope / Trigger

- Trigger: deployment work that adds or changes Docker, Compose, Nginx, or environment wiring.
- Scope: build the Astro site in Docker, then serve only generated `dist/` files.

### 2. Signatures

- Command: `docker compose up --build`
- Files: `Dockerfile`, `compose.yaml`, `nginx.conf`, `.dockerignore`

### 3. Contracts

- `BLOG_PORT`: optional host port; defaults to `8080`.
- `PUBLIC_SITE_ORIGIN`: optional build-time origin; defaults to `http://localhost:8080`.
- Runtime container must not run Node, Astro, or npm.
- Runtime container serves `/usr/share/nginx/html` with Nginx.

### 4. Validation & Error Matrix

- Missing Docker CLI -> document that Compose verification cannot run in that environment.
- Missing `PUBLIC_SITE_ORIGIN` -> local default origin is acceptable.
- Unknown static path -> Nginx returns 404.
- Missing private content -> sync script logs skips and public sample content still builds.

### 5. Good/Base/Bad Cases

- Good: `PUBLIC_SITE_ORIGIN=https://example.com BLOG_PORT=3000 docker compose up --build`
- Base: `docker compose up --build`
- Bad: adding a production Node server or API process for static file serving.

### 6. Tests Required

- Run `npm run check`.
- Run `npm run build`.
- Run `docker compose config` and `docker compose up --build` when Docker is available.
- If Docker is unavailable, record that limitation in the work summary.

### 7. Wrong vs Correct

#### Wrong

```Dockerfile
CMD ["npm", "run", "preview"]
```

#### Correct

```Dockerfile
COPY --from=build /app/dist /usr/share/nginx/html
```

## Scenario: GitHub Actions Production Deployment Guard

### 1. Scope / Trigger

- Trigger: changes to `.github/workflows/deploy.yml`, production build scripts, or deployment environment wiring.
- Scope: GitHub Actions deployment must install from the lockfile, require a production site origin, build static output, then upload only `dist/`.

### 2. Signatures

- Workflow: `.github/workflows/deploy.yml`
- Install command: `npm ci`
- Deploy configuration guard command: `npm run check:deploy-env`
- Origin guard command: `npm run check:origin`
- Deploy build command: `npm run build:deploy`
- Deploy configuration guard entry point: `scripts/check-deploy-env.mjs`
- Guard entry point: `scripts/check-origin.mjs`
- Deploy configuration test file: `tests/check-deploy-env.test.mjs`
- Test file: `tests/check-origin.test.mjs`

### 3. Contracts

- GitHub Actions deploys must run `npm run check:deploy-env` after Node setup
  and before private content checkout, build, SSH setup, or rsync.
- `PRIVATE_CONTENT_REPOSITORY` is required for GitHub Actions deploys.
- `PRIVATE_CONTENT_TOKEN` is required for GitHub Actions deploys.
- `PUBLIC_SITE_ORIGIN` is required for GitHub Actions production deployment builds.
- `DEPLOY_HOST` is required for GitHub Actions deploys.
- `DEPLOY_USER` is required for GitHub Actions deploys.
- `DEPLOY_PATH` is required for GitHub Actions deploys.
- `DEPLOY_KEY` is required for GitHub Actions deploys.
- Blank or whitespace-only deploy configuration values are invalid.
- Blank or whitespace-only `PUBLIC_SITE_ORIGIN` is invalid.
- Local `npm run build` must keep the development fallback origin and sample content fallback.
- `npm run build:deploy` must run the origin guard before `PRIVATE_CONTENT_STRICT=1 npm run build`.
- The deployment workflow must not use `npm install`, because deploys must resolve dependencies from `package-lock.json`.
- RSS, sitemap, canonical, Open Graph, and Twitter URLs must keep deriving from `src/data/site.ts`.

### 4. Validation & Error Matrix

- Missing `PUBLIC_SITE_ORIGIN` in deploy build -> `[origin] PUBLIC_SITE_ORIGIN is required for production deployment builds.`
- Blank `PUBLIC_SITE_ORIGIN` in deploy build -> same error as missing.
- Configured `PUBLIC_SITE_ORIGIN` -> guard prints `[origin] ok: <origin>` and returns `0`.
- Missing deploy configuration in workflow preflight -> `[deploy-env] Missing required deployment values: <names>`
- Blank deploy configuration value in workflow preflight -> same missing-value error with that key name.
- Configured deploy environment -> guard prints `[deploy-env] Deployment configuration check complete, checked: 7` and returns `0`.
- Missing private content in strict deploy build -> content sync fails before publishing.
- Missing `package-lock.json` compatibility -> `npm ci` fails before build.

### 5. Good/Base/Bad Cases

- Good: `PUBLIC_SITE_ORIGIN=https://example.com npm run build:deploy`
- Good: `PRIVATE_CONTENT_REPOSITORY=owner/private-content PRIVATE_CONTENT_TOKEN=token PUBLIC_SITE_ORIGIN=https://example.com DEPLOY_HOST=example.com DEPLOY_USER=deploy DEPLOY_PATH=/var/www/blog DEPLOY_KEY=key npm run check:deploy-env`
- Base: `npm run build` without `PUBLIC_SITE_ORIGIN` succeeds locally with sample content and `http://localhost:4321`.
- Bad: relying on `src/data/site.ts` localhost fallback for production deployment.
- Bad: changing the deployment workflow back to `npm install`.
- Bad: conditionally skipping private content checkout when content secrets are blank; the preflight must fail first.

### 6. Tests Required

- Add or update `node:test` coverage for missing, blank, and configured deploy environment values.
- Add or update `node:test` coverage for missing, blank, and configured `PUBLIC_SITE_ORIGIN`.
- Run `npm test`.
- Run `npm run check`.
- Run `npm run build`.
- Verify `npm run check:deploy-env` fails when deploy environment values are unset.
- Verify `npm run check:deploy-env` passes when all deploy environment values are configured.
- Verify `npm run build:deploy` fails at `check:origin` when `PUBLIC_SITE_ORIGIN` is unset.
- Verify a build with `PUBLIC_SITE_ORIGIN` emits that origin in RSS, sitemap, canonical, and social metadata.
- Run a workflow linter such as `actionlint` when available.

### 7. Wrong vs Correct

#### Wrong

```yaml
- name: Install dependencies
  run: npm install

- name: Build site
  run: PRIVATE_CONTENT_STRICT=1 npm run build
```

#### Correct

```yaml
- name: Install dependencies
  run: npm ci

- name: Check deployment configuration
  run: npm run check:deploy-env

- name: Build site
  run: npm run build:deploy
```

---

## Testing Requirements

No backend tests are required for V1 because no backend should exist.

The relevant verification is `npm run build` for the Astro site.

---

## Code Review Checklist

Check that no backend dependency or runtime service was introduced for V1.

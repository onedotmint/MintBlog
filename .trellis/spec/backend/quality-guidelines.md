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

---

## Testing Requirements

No backend tests are required for V1 because no backend should exist.

The relevant verification is `npm run build` for the Astro site.

---

## Code Review Checklist

Check that no backend dependency or runtime service was introduced for V1.

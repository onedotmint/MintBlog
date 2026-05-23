# Simplicity Guardrails

> Project rules that keep the blog static-first, small, and easy to maintain.

---

## Purpose

This blog should remain a static Astro site. New features must preserve a small code surface, predictable build output, and content that can be maintained by hand.

Use these guardrails before adding dependencies, client JavaScript, build scripts, content fields, or new page systems.

---

## Core Rules

### 1. Static-first

Prefer build-time Astro pages, Content Collections, local data files, and static assets.

Do not add runtime services for V1:

* API server
* database
* ORM
* auth
* queues
* background workers
* CMS backend
* comment system
* analytics service
* search service

If a feature can be generated at build time, generate it at build time.

### 2. Content owns content metadata

Blog metadata belongs in MDX frontmatter validated by `src/content.config.ts`.

Project metadata belongs in the `projects` content collection frontmatter validated by `src/content.config.ts`.

Site identity belongs in one shared source once identity consolidation exists.

Do not duplicate article title, description, date, tags, slug, or reading time in route files.

### 3. Routes stay thin

Routes should compose layouts, components, and utilities.

Repeated collection loading, sorting, filtering, slug normalization, metadata shaping, and URL building belongs in shared utilities.

### 4. Dependencies need a concrete job

Prefer platform APIs, Astro, TypeScript, MDX, and plain CSS.

Do not add a dependency for small formatting, sorting, path, string, date, or validation work if the current stack already covers it.

Runtime dependencies require a written reason and must stay within the dependency budget.

### 5. Client JavaScript is exceptional

The default UI should render without client islands.

Client JavaScript is allowed only for a concrete interaction that cannot be solved with static HTML and CSS.

Avoid React, Vue, Svelte, state libraries, animation frameworks, and client data fetching in V1.

### 6. CSS remains local and token-based

Use `src/styles/global.css` for tokens, layout primitives, prose, and reusable patterns.

Use component-scoped styles only for styles tied to that component.

Avoid one-off color values when an existing CSS variable fits.

### 7. Private content stays private

The public repo may contain sample posts and sample assets under `sample-content/`.

Treat `src/content/blog/`, `src/content/reading/`, `src/content/projects/`, `public/images/blog/`, `public/images/reading/`, `public/images/projects/`, and `public/files/` as generated sync targets. Do not use those mount points as the canonical source for committed sample content.

Real private content must come from `private-content/`, CI secrets, or another non-public source before build.

Real publishing should use strict sync: `PRIVATE_CONTENT_STRICT=1` or `npm run sync:content:strict`.

Do not hard-code private repository credentials, private contact details, or private content paths into source-controlled app code.

### 8. Automation should be small

Use simple Node scripts for build-time checks when possible.

Do not introduce a framework, service, or dependency just to enforce a rule that can be checked from local files.

---

## Review Checklist

Before merging a feature, check:

* Does the site still build as static output?
* Did the change avoid new backend/runtime infrastructure?
* Did the change avoid unnecessary dependencies?
* Did route code stay thin?
* Is repeated article/project/site metadata centralized?
* Can the feature work with public sample content?
* Does private content still stay out of the public repository?
* Are budget and build checks still green?

---

## When to Reconsider

These guardrails can change only when a real requirement cannot be met within the static-first model.

Record that decision in an ADR or project spec before adding heavier infrastructure.

# State Management

> State policy for the static blog.

---

## Overview

V1 has no client-side state management. Astro renders pages at build time from local files.

Theme values are CSS variables, not JavaScript state. A future light mode may be added later, but V1 only needs a dark default.

---

## State Categories

Static content:

* Blog posts from `src/content/blog/`, populated by sample content or synced private content
* Reading resources from `src/content/reading/`, populated by sample content or synced private content
* Projects from `src/content/projects/`, populated by sample content or synced private content
* Navigation links from component constants or simple arrays

Presentation state:

* Hover, focus, and responsive layout are handled with CSS.
* Active navigation can be derived from `Astro.url.pathname`.

---

## When to Use Global State

Do not add global state in V1.

Future global state is only acceptable for a concrete client feature, such as a persisted theme switcher, and should be introduced in a separate task.

---

## Server State

There is no server state in V1.

Do not add API routes, databases, or runtime data fetching for the first version.

---

## Common Mistakes

Avoid state libraries for static content.

Avoid storing content metadata in multiple places. Blog, reading, and project metadata belongs in content collection frontmatter.

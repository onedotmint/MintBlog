# Content is rendered at build time; no client framework or runtime state

## Context

The site is an editorial blog and project index whose content lives in Astro Content Collections. Features such as navigation, tag filtering, tables of contents, and backgrounds are presentation over data that is fully known at build time. Framework-oriented tooling (React/Vue/Svelte hooks, Redux/Zustand/Pinia/React Query, client-side content fetches) is common in Astro projects and is easy to reach for when a page gets interactive.

## Decision

Keep the site static-first: build-time data from Content Collections and `src/config.ts`, server-rendered `.astro` components, and plain TypeScript utilities. Client behavior is limited to the existing progressive enhancements and Astro navigation events. Do not add a client framework, global state library, or browser fetch for content, routing, filtering, or navigation.

## Why

- Build-time rendering keeps the HTML usable without JavaScript and avoids hydration cost for content that never changes at runtime.
- One source of truth per concept (`src/config.ts`, `src/schema.ts`, `src/utils/data.ts`) prevents duplicated filtering/ordering rules and stale client caches.
- Accessibility and SEO depend on real static HTML; a client-rendered shell weakens both.

## Revisit when

An approved feature has a genuine browser lifecycle or mutable client-state requirement that static HTML plus a small optional enhancement cannot satisfy. Even then, keep it optional and leave static content and primary navigation working without it.

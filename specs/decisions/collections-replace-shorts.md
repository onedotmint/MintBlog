# Collections replaces Shorts without legacy redirects

> **Status: Superseded / 已废止。** This decision describes a retired `/collections/` + Articles design, not today's Collections section. The current [content specification](../capabilities/content-collections.md) keeps `/shorts/`, derives membership from the first directory segment, and uses optional `shortCollections` overrides; historical `src/content/collections/` and `src/content/articles/` remain data-only. The text below is historical rationale, not implementation guidance.

## Context

The site previously exposed a flat "Shorts" section at `/shorts/` backed by a `shorts` collection. The owner wanted multi-article editorial groupings that can be maintained through content files, and the existing Blog archive already provided the desired visual baseline.

## Decision

Replace Shorts as a user-facing section with Collections. Use `/collections/`, `/collections/<collection-slug>/`, and `/collections/<collection-slug>/<article-slug>/`. Collections are first-class editorial records (`title`, `description`, `order`, optional `cover`/`draft`), and each Article requires exactly one `collection`. Remove `/shorts/...` **without redirects**; old URLs may become unavailable. Keep tags independent of Collection membership.

## Why

- A separate record type plus a required membership field is maintainable through content only — adding a Collection needs no application code — whereas repurposing `tags` would have conflated two meanings.
- The nested URL hierarchy makes the editorial structure legible and lets Collection/Article pages reuse the Blog list/detail presentation instead of building a parallel visual system.
- A redirect layer for a low-traffic, one-entry section would add permanent surface area for no real compatibility value; the section was replaced, not moved.

## Historical revisit condition (no longer active)

Real external inbound traffic to `/shorts/...` appears and the owner wants it preserved. Then add explicit redirects as a deliberate, separately scoped change — do not silently reintroduce a `shorts` collection or route.

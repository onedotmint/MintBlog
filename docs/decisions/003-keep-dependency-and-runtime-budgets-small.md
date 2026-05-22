# 003 - Keep Dependency and Runtime Budgets Small

## Status

Accepted

## Date

2026-05-22

## Context

The site should stay small enough to build, inspect, deploy, and serve as static files. V1 does not need client islands, client state, analytics, search, comments, or runtime services.

The repository already includes a budget check for dependency allowlists and generated output limits.

## Decision

Allow only the dependencies needed for Astro, MDX, TypeScript, and Astro checks.

Keep generated output within the runtime budget enforced by `scripts/check-budget.mjs`. Avoid client JavaScript unless a concrete interaction cannot be solved with static HTML and CSS.

## Consequences

Build output remains predictable and cheap to audit.

New dependencies need a written reason. Features that rely on extra packages, shipped JavaScript, or runtime infrastructure must justify their cost before implementation.

## Revisit Triggers

Reconsider this decision when:

- a real feature cannot be delivered with Astro, MDX, TypeScript, Node, and CSS
- the dependency allowlist blocks a documented requirement
- generated output budgets prevent acceptable content or UX
- the site intentionally adds client-side interactivity

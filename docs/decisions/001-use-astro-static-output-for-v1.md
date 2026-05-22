# 001 - Use Astro Static Output for V1

## Status

Accepted

## Date

2026-05-22

## Context

The project is a personal blog whose main content is MDX posts, project data, static assets, and a small set of file-based pages.

The site should build from public sample content plus optional private content, then deploy as static files. Production should not need a Node process.

## Decision

Use Astro as a static site generator for V1. Keep routes build-time rendered, use Astro Content Collections for blog posts, keep small typed data in local TypeScript files, and serve the generated `dist/` output as static files.

## Consequences

The site remains easy to inspect, build, deploy, and host with Nginx or another static file server.

Features that need per-user state, runtime writes, server-side APIs, or live queries are out of scope for V1 unless this decision is revisited first.

## Revisit Triggers

Reconsider this decision when:

- the blog needs authenticated user-specific behavior
- content must be edited through a web interface
- the static build cannot meet a real publishing requirement
- deployment no longer supports static file hosting

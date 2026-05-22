# 004 - Do Not Add a CMS or Runtime Backend for V1

## Status

Accepted

## Date

2026-05-22

## Context

V1 is a static personal blog. Current publishing works from files, Git, CI secrets, a private content source, Astro build output, and static hosting.

Adding a CMS, database, API server, authentication, queues, search service, comments, analytics, or background workers would add operational cost before the product needs it.

## Decision

Do not add a CMS or runtime backend for V1.

Keep content file-based and build-time processed. Keep production hosting static.

## Consequences

The project avoids backend operations, credential storage in app code, database migrations, runtime monitoring, and server process management.

Editing and publishing depend on Git-oriented workflows. Interactive features that need runtime persistence stay out of scope until this decision is revisited.

## Revisit Triggers

Reconsider this decision when:

- content editing through Git becomes the main publishing bottleneck
- authenticated private areas become a real requirement
- comments, search, analytics, or forms are accepted as product requirements
- static deployment no longer satisfies production needs

# 002 - Keep Real Content in a Private Sync Source

## Status

Accepted

## Date

2026-05-22

## Context

The code repository should be safe to open source. Real posts, images, downloadable files, private contact details, and other non-public material should not be committed to public source.

The project still needs sample content so local builds and CI checks can run without the private content source.

## Decision

Keep real blog content and private assets outside the public code repository. Sync or mount private content into `src/content/blog/` and `public/` before running Astro commands.

Use public sample MDX and sample assets in the repository so the project remains buildable without private content.

## Consequences

Public code can be shared without exposing private content.

Local development and CI must prepare private content before building the real site. The sync step must stay simple, file-based, and safe against accidentally committing private material.

## Revisit Triggers

Reconsider this decision when:

- private content no longer needs to stay separate from public source
- the sync step becomes too complex to maintain safely
- content authors need a non-Git editing flow
- CI can no longer access the private content source securely

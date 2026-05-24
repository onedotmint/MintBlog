# 005 - Use GHCR Image and Compose for Production

## Status

Accepted

## Date

2026-05-24

## Context

The blog is static, but production should be managed with Docker Compose alongside other server containers.

The content source is private and separate from the public code repository. Building on the server would make the server run dependency installation, content sync, Astro build, and Docker image build work.

## Decision

Build the production Docker image in GitHub Actions after checking out the public code repository and private content repository.

Push the image to `ghcr.io/<owner>/mintblog` with both the commit SHA tag and `latest`.

Run production with Docker Compose on the server. The server pulls the published image and restarts the Nginx-only container. The server does not build the site during the normal deploy path.

## Consequences

Server deploys become lighter and rollback can target an older image tag.

Production now depends on GHCR package access and image retention hygiene. The final image can contain private content, so private images must stay private unless the content is intentionally public.

The Dockerfile remains a manual fallback so the image can still be built outside GitHub Actions when needed.

## Revisit Triggers

Reconsider this decision when:

- GitHub Actions or GHCR cost, limits, or availability no longer fit the project
- the server needs fully offline deployments
- image storage grows enough to require a retention policy or a different registry
- production needs a reverse proxy or TLS stack managed in the same Compose project

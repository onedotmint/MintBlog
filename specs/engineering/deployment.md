---
id: eng.deployment
applies_to:
  - Dockerfile
  - docker-compose.yml
  - docker/**
  - .env.example
  - .github/workflows/**
tags:
  - deployment
  - docker
  - ci
---

# Deployment

MintBlog is built as a static Astro site and published as a Docker image. GitHub Actions validates the repository, publishes to the current repository's GHCR package, and deploys to the VPS over SSH.

## DEP-001 Runtime layout

```text
GitHub Actions -> ghcr.io/OWNER/REPOSITORY -> SSH to VPS
  -> docker compose pull && up -d -> MintBlog container on the proxy network
  -> external Nginx container -> domain
```

- The MintBlog container serves port `80` inside the Docker network and does **not** publish a host port. The external Nginx container joins the same network and proxies to `mintblog:80`.
- `Dockerfile` builds with Node 24.22.1 + pnpm 10.34.7 and serves `dist/` with Nginx 1.30.6-alpine. Both base images are digest-pinned; refreshing a tag alone does not update a pinned image. `.git` remains excluded from its context. CI checks out full history and exports `.post-dates.json` with the dependency-free Node script before Docker build; local `pnpm build` also exports automatically. A manual Docker build needs `pnpm content:dates` first. Git-free loaders reject missing/stale date records rather than redating posts.
- `docker-compose.yml` runs the public GHCR image on a configurable external network, defaulting to `npm_default` (`MINTBLOG_PROXY_NETWORK` overrides it).
- `docker/nginx.conf` is the internal static-file server configuration, separate from the external reverse proxy.

## DEP-002 Workflow boundary

- `.github/workflows/deploy.yml` validates, publishes, and deploys the image **without overwriting the server-managed Compose file or `.env`**.
- The workflow derives the image path from the full GitHub repository name, so a fork publishes to its own GHCR package.
- Deployments inject an immutable commit image (`ghcr.io/OWNER/REPOSITORY:sha-<commit>`); the server-side `.env` provides only the default image for manual `docker compose up -d`.
- GitHub may create a new package as private: the publish job can succeed while the deploy job fails to pull. Make the package public (or configure registry credentials on the VPS) before relying on automatic deployment.
- Rollback uses a previously published commit image with `docker compose pull` + `up -d --remove-orphans`.

## DEP-003 Credentials

Deployment secrets are repository secrets: `DEPLOY_HOST`, `DEPLOY_PORT` (optional, default 22), `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`. `.env.example` is a safe template and may be committed; the real server-side `.env` stays local and ignored. Never commit or paste deployment keys.

## DEP-004 Domain

HTTPS and the domain are configured in the external Nginx stack, outside this repository's Compose file. If the site builds but canonical URLs still point to GitHub Pages, update `SITE.website` in `src/config.ts`.

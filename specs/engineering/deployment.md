---
id: eng.deployment
applies_to:
  - Dockerfile
  - docker-compose.yml
  - docker/**
  - scripts/deploy.sh
  - .env.example
  - .github/workflows/**
tags:
  - deployment
  - docker
  - ci
---

# Deployment

MintBlog is built as a static Astro site and published as a Docker image. GitHub Actions validates the repository and publishes to its GHCR package. An operator deploys a chosen version from the VPS; Actions has no server access.

## DEP-001 Runtime layout

```text
GitHub Actions -> ghcr.io/owner/repository:sha-<commit> (no server update)
Operator on VPS -> bash deploy.sh <chosen-image>
  -> docker compose pull && up --wait -> MintBlog container on the proxy network
  -> external Nginx container -> domain
```

- The MintBlog container serves port `80` inside the Docker network and does **not** publish a host port. The external Nginx container joins the same network and proxies to `mintblog:80`.
- `Dockerfile` builds with Node 24.22.1 + pnpm 10.34.7 and serves `dist/` with Nginx 1.30.6-alpine. Both base images are digest-pinned; refreshing a tag alone does not update a pinned image. `.git` remains excluded from its context. CI checks out full history and exports `.post-dates.json` with the dependency-free Node script before Docker build; local `pnpm build` also exports automatically. A manual Docker build needs `pnpm content:dates` first. Git-free loaders reject missing/stale date records rather than redating posts.
- `docker-compose.yml` runs the public GHCR image on a configurable external network, defaulting to `npm_default` (`MINTBLOG_PROXY_NETWORK` overrides it).
- `docker/nginx.conf` is the internal static-file server configuration, separate from the external reverse proxy.

## DEP-002 Workflow boundary

- `.github/workflows/deploy.yml` only validates and publishes images. Pushes to `main` and manual runs on `main` publish after validation; PRs and manual runs on other branches only validate. No event in this workflow updates the VPS.
- Both jobs use `ubuntu-24.04` rather than the rolling `ubuntu-latest` label. External Actions are pinned to full commit SHAs with exact release comments; their own JavaScript runtime is Node 24, separate from the project Node version installed by setup-node. Do not hide deprecation notices using runtime override environment variables.
- Workflow concurrency is isolated by Git ref. New PR runs cancel obsolete checks for the same PR; `main` image builds queue rather than cancel an active run.
- The workflow derives the image path from the full GitHub repository name, so a fork publishes to its own GHCR package.
- CI publishes full-SHA image tags, not `latest`. From the server deployment directory, an operator runs `bash deploy.sh ghcr.io/owner/repository:sha-<40 lowercase hex characters>` using `scripts/deploy.sh`. The script requires Bash, `flock` and Docker Compose with `up --wait --wait-timeout` support; it never builds source or executes SSH.
- Manual updates are locked per deployment directory. A failed pull leaves the existing service untouched. Startup/health failures restore the previous local image ID and wait for its health; failed first deployments stop only `web`. Recovery failure remains a nonzero error requiring operator action.
- The script does not edit `.env`: after public acceptance the operator pins its `BLOG_IMAGE` to the selected version. Unqualified Compose commands otherwise use the value already in `.env`. Public acceptance is separate from container liveness.
- GitHub may create a new package as private. Make it public or configure read-only GHCR pull credentials on the VPS. A deliberate rollback uses the same manual script with a previously accepted full-SHA image.

## DEP-003 Credentials

Actions only uses its scoped `GITHUB_TOKEN` to publish GHCR images; no VPS credentials belong in this workflow. Operators keep personal SSH credentials locally and any private-registry pull credentials on the VPS. After the new workflow is effective and old deployment runs have stopped, remove obsolete `DEPLOY_*` repository secrets and revoke the old dedicated server key if unused elsewhere. `.env.example` is a safe template; the real server-side `.env` remains ignored. Never commit or paste keys.

## DEP-004 Domain

HTTPS and the domain are configured in the external Nginx stack, outside this repository's Compose file. If the site builds but canonical URLs still point to GitHub Pages, update `SITE.website` in `src/config.ts`.

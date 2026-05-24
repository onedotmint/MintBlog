# Define deployment contract and health checks

## Goal

Make the production deployment path explicit and add only the smallest checks needed to catch broken static deploys. The project should keep the current static-first model and avoid adding a release system, backend, or operational complexity that does not match a personal blog.

## What I already know

* The project builds a static Astro site into `dist/`.
* GitHub Actions currently deploys by running `npm run build:deploy`, then `rsync -az --delete dist/` to `${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/`.
* `Dockerfile`, `compose.yaml`, and `nginx.conf` exist, but the GitHub Actions production path does not use the Docker runtime image.
* `nginx.conf` only applies to container-based serving, unless the production server has separately copied or mirrored that config.
* Existing deployment safeguards already include `check:deploy-env`, `check:origin`, strict content sync, build, content checks, type checks, tests, and budget checks.
* The user agrees that this deployment area is worth improving, but other directions are acceptable as-is.

## Assumptions (temporary)

* Production should continue using the existing `rsync dist/` deployment path.
* Docker should remain available as a local or alternate static-serving path, not become the main production deployment requirement.
* The deployment hardening should focus on documentation and a minimal post-deploy probe.
* The post-deploy probe should use `PUBLIC_SITE_ORIGIN` as the public URL.

## Open Questions

* None.

## Requirements (evolving)

* Document the real production deployment contract.
* Explain the difference between the `rsync dist/` path and the Docker/Nginx path.
* Add a minimal deployment health check that verifies the public static entry points after upload.
* Use `PUBLIC_SITE_ORIGIN` as the health check origin instead of adding a separate deployment URL setting.
* Keep the health check dependency-free and compatible with GitHub Actions.
* Make the health check safe for secrets: logs must not print private keys or tokens.
* Keep rollback directories, symlink releases, deployment platforms, and runtime monitoring out of this task.
* Preserve the static-only architecture.

## Acceptance Criteria (evolving)

* [ ] A deployment contract doc exists and describes build, artifact, upload, serving, configuration ownership, and what `nginx.conf` does or does not govern.
* [ ] A deployment health check script or command checks at least `/`, `/rss.xml`, and `/sitemap.xml`.
* [ ] The GitHub Actions deploy workflow runs the health check after `rsync`.
* [ ] The health check fails CI on missing origin, non-2xx HTTP responses, or empty response body for key pages.
* [ ] Existing quality commands still pass: `npm test`, `npm run check`, and relevant deployment script tests.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / CI green.
* Docs updated because deployment behavior is clarified.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* No release directory layout such as `releases/current`.
* No server-side rollback automation.
* No new hosting provider, dashboard, CMS, database, API, or runtime backend.
* No broad Nginx production rewrite unless the implementation proves that this repo's `nginx.conf` is part of the real production serving path.
* No uptime monitoring or alerting service.

## Technical Notes

* GitHub deploy workflow: `.github/workflows/deploy.yml`
* Quality workflow: `.github/workflows/quality.yml`
* Deployment env validation: `scripts/check-deploy-env.mjs`
* Origin validation: `scripts/check-origin.mjs`
* Static sync and strict content behavior: `scripts/sync-content.mjs`
* Container-only Nginx config: `nginx.conf`
* Docker static runtime: `Dockerfile`
* Existing no-runtime decision: `docs/decisions/004-no-cms-or-runtime-backend-for-v1.md`

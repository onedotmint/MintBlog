# Personal Blog V1

Static personal blog built with Astro 6 and MDX.

## Runtime policy

Use Node.js 24 for CI, local builds, and local Docker builds. `package.json`
keeps the local engine range at `>=24.0.0`, and Node 24 is the pinned build
baseline used for reproducible project checks.

Production serving remains static-only. The final Docker image uses Nginx and
does not run Node.

Dependency policy:

- Runtime dependencies stay limited to `astro` and `@astrojs/mdx`.
- `@astrojs/check`, TypeScript, and Node types are development-only.
- `package.json` pins `volar-service-yaml` through `overrides` so Astro's
  development language tooling uses the patched YAML language server chain.

## Commands

```bash
npm install
npm run dev
npm run check
npm run check:content
npm run build
npm run preview
```

`npm run build` and `npm run dev` both run the content sync script first.
If `private-content/` exists, private files are copied into `src/content/blog/`,
`src/content/reading/`, `src/content/projects/`, and `public/` before Astro starts.
Missing private directories fall back to
`sample-content/` during local builds so the public sample site remains usable.

For real publishing, use strict sync:

```bash
npm run sync:content:strict
```

or:

```bash
PRIVATE_CONTENT_STRICT=1 npm run build
```

Strict sync fails when private blog, reading, or project content is missing.
Optional asset directories are cleaned instead of falling back to sample assets.

## Docker Compose

Build and serve the static site locally with Nginx:

```bash
docker compose up --build
```

The site is available at `http://localhost:8080` by default.

Optional environment variables:

```bash
BLOG_PORT=3000 PUBLIC_SITE_ORIGIN=https://example.com docker compose up --build
```

`BLOG_PORT` changes the host port. `PUBLIC_SITE_ORIGIN` is passed at build time
and is used for canonical URLs, RSS links, sitemap URLs, and social metadata.
If you change `BLOG_PORT`, set `PUBLIC_SITE_ORIGIN` to the matching public URL.

The final container serves only generated static files from `dist/`. It does not
run Node. The default Docker build context excludes `private-content/` and the
generated content mount points, so local Docker Compose builds use the public
sample content.

For a local private-content container, build the static output on the host first,
then package only `dist/` with the production Dockerfile:

```bash
PRIVATE_CONTENT_STRICT=1 PUBLIC_SITE_ORIGIN=https://example.com npm run build
docker build -f Dockerfile.production -t personal-blog-v1:manual .
```

For production, use `compose.prod.yaml`. It does not build. It pulls a published
image and runs the Nginx-only runtime container:

```bash
BLOG_IMAGE=ghcr.io/owner/mintblog:latest docker compose -f compose.prod.yaml up -d
```

The production server must be logged in to GHCR before it can pull a private
image:

```bash
docker login ghcr.io
```

## Content source layout

```text
private-content/
  blog/
  reading/
  projects/
  assets/
    images/
      blog/
      projects/
    files/

sample-content/
  blog/
  reading/
  projects/
  assets/
    images/
      blog/
      projects/
    files/
```

`private-content/` is ignored by Git. `sample-content/` is committed and is the
public fallback copied into Astro mount points when no private source exists.

## Architecture decisions

Long-lived technical tradeoffs are recorded in [docs/decisions/](docs/decisions/README.md).

## Production deployment contract

The production deployment path is GitHub Actions plus GHCR plus Docker Compose.

Build ownership:

- GitHub Actions uses Node 24 for deployment guard and health scripts.
- GitHub Actions installs dependencies with `npm ci`.
- `npm run check:deploy-env` validates required secrets before private content
  checkout, static build, image publish, SSH setup, or server update.
- GitHub Actions runs `npm run build:deploy` after private content checkout.
- `PUBLIC_SITE_ORIGIN` is the public production origin used for canonical URLs,
  RSS links, sitemap URLs, social metadata, and post-deploy health checks.

Artifact ownership:

- The GHCR image is the production artifact.
- Private content is copied into Astro content and public asset mount points
  during the strict static build.
- The production image build context is created under the runner temp directory
  and contains only `Dockerfile.production`, `nginx.conf`, and `dist/`.
- The deployment workflow does not upload source files, `node_modules/`, or
  local build caches to the server.
- The deployment workflow does not send `private-content/` to Docker Buildx and
  does not write BuildKit GHA image cache for the production image.

Image and serving ownership:

- The workflow pushes the image to `ghcr.io/<owner>/mintblog`.
- The image includes OCI source and revision labels for GHCR package metadata.
- SSH host identity is pinned through `DEPLOY_KNOWN_HOSTS`; the workflow does
  not trust host keys discovered during the deploy run.
- The workflow uploads `compose.prod.yaml` to
  `${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/compose.yaml` and writes
  `${DEPLOY_PATH}/.env` with the image tag and port.
- The target server runs `docker compose pull` and `docker compose up -d`.
- The target server owns TLS, public reverse proxying, and host-level firewall
  rules if the container is not exposed directly.

Docker ownership:

- `Dockerfile`, `Dockerfile.production`, `compose.yaml`, `compose.prod.yaml`,
  and `nginx.conf` provide the static-serving paths.
- `compose.yaml` is local build-and-run.
- `Dockerfile.production` packages prebuilt `dist/` output only.
- `compose.prod.yaml` is production pull-and-run.
- The Docker runtime image serves generated `dist/` files with Nginx and does
  not run Node.

Health ownership:

- After Compose restarts the container, `npm run check:deployment-health`
  probes the public site at `/`, `/rss.xml`, and `/sitemap.xml`.
- The health check fails when `PUBLIC_SITE_ORIGIN` is missing, a key path
  returns a non-2xx response, or a key path returns an empty body.
- Health check logs print only the public origin, paths, statuses, and error
  categories. They do not print SSH keys or tokens.

## Deployment flow

The repository includes a GitHub Actions workflow that can:

1. checkout the public code repository
2. set up Node.js
3. validate required deployment configuration with `npm run check:deploy-env`
4. checkout the private content repository from CI secrets
5. install dependencies with `npm ci`
6. build strict production static output with `npm run build:deploy`
7. prepare a Docker context containing only `Dockerfile.production`,
   `nginx.conf`, and `dist/`
8. build and push the production image to GHCR with the commit SHA tag and
   `latest`
9. upload the production Compose file and `.env` to the target server
10. run `docker compose pull` and `docker compose up -d` over SSH
11. verify the public deployment with `npm run check:deployment-health`

Required secrets:

- `PRIVATE_CONTENT_REPOSITORY`
- `PRIVATE_CONTENT_TOKEN`
- `PUBLIC_SITE_ORIGIN`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_KEY`
- `DEPLOY_KNOWN_HOSTS`

Optional repository variable:

- `BLOG_PORT` defaults to `8080` when unset

`PUBLIC_SITE_ORIGIN` should be the production origin used for canonical URLs,
RSS links, sitemap URLs, and social metadata. Local builds fall back to
`http://localhost:4321`.

Before the first deploy, the production server needs Docker Compose and GHCR
pull access:

```bash
docker login ghcr.io
mkdir -p /path/to/deploy
```

Use a token with permission to read the private package if the GHCR image is
private.

Set `DEPLOY_KNOWN_HOSTS` to the production server public host key line. Collect
it from a trusted network and verify it against the server fingerprint before
adding it as a GitHub secret:

```bash
ssh-keyscan -H example.com
ssh-keygen -lf ./known_hosts_candidate
```

The secret should look like a `known_hosts` entry such as
`example.com ssh-ed25519 AAAA...`. It is not the private deploy key.

Manual fallback build:

```bash
PRIVATE_CONTENT_STRICT=1 PUBLIC_SITE_ORIGIN=https://example.com npm run build
docker build -f Dockerfile.production -t personal-blog-v1:manual .
```

Then run it with the production Compose file:

```bash
BLOG_IMAGE=personal-blog-v1:manual docker compose -f compose.prod.yaml up -d
```

## Deployment troubleshooting

- Strict content sync fails: check that the private checkout created
  non-empty `private-content/blog/`, `private-content/reading/`, and
  `private-content/projects/`. The failing command is `npm run build:deploy`,
  which runs `PRIVATE_CONTENT_STRICT=1 npm run build`; see
  `scripts/sync-content.mjs` for the required private source layout.
- Origin check fails: set the `PUBLIC_SITE_ORIGIN` secret to the production
  origin, for example `https://example.com`. `npm run build:deploy` runs
  `npm run check:origin` before syncing content, and blank values are rejected.
- Deployment health check fails: open the failed path shown in the workflow log.
  The check runs after `docker compose up -d`, uses `PUBLIC_SITE_ORIGIN`, and requires
  `/`, `/rss.xml`, and `/sitemap.xml` to return non-empty 2xx responses.
- Private content checkout fails: verify `PRIVATE_CONTENT_REPOSITORY` and
  `PRIVATE_CONTENT_TOKEN` in repository secrets. The deployment configuration
  check fails early when either value is blank.
- SSH setup fails: verify `DEPLOY_HOST`, `DEPLOY_KEY`, and `DEPLOY_KNOWN_HOSTS`.
  The workflow writes `DEPLOY_KEY` to `~/.ssh/id_ed25519`, writes
  `DEPLOY_KNOWN_HOSTS` to `~/.ssh/known_hosts`, and uses strict host key
  checking for `ssh` and `scp`.
- SSH host key verification fails: refresh `DEPLOY_KNOWN_HOSTS` only after
  confirming the production server host key changed intentionally.
- Image pull fails on the server: run `docker login ghcr.io` on the server with
  an account or token that can read the private package.
- Compose update fails with a permission or path error: verify `DEPLOY_USER`,
  `DEPLOY_HOST`, and `DEPLOY_PATH`. The deploy user must be able to write
  `compose.yaml` and `.env`, then run Docker Compose from that directory.

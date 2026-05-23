# Personal Blog V1

Static personal blog built with Astro and MDX.

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

Build and serve the static site with Nginx:

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
run Node. If `private-content/` exists during the Docker build, the normal
content sync step can include it in the generated output. Use a trusted local
Docker builder when building with private content, because Docker sends the build
context to the builder before the final runtime image is created.

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

## Deployment flow

The repository includes a GitHub Actions workflow that can:

1. checkout the public code repository
2. set up Node.js
3. validate required deployment configuration with `npm run check:deploy-env`
4. checkout the private content repository from CI secrets
5. sync content into Astro's expected paths
6. install dependencies with `npm ci`
7. run `npm run build:deploy`
8. rsync `dist/` to the target server over SSH

Required secrets:

- `PRIVATE_CONTENT_REPOSITORY`
- `PRIVATE_CONTENT_TOKEN`
- `PUBLIC_SITE_ORIGIN`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_KEY`

`PUBLIC_SITE_ORIGIN` should be the production origin used for canonical URLs,
RSS links, sitemap URLs, and social metadata. Local builds fall back to
`http://localhost:4321`.

## Deployment troubleshooting

- Strict content sync fails: check that the private checkout created
  non-empty `private-content/blog/`, `private-content/reading/`, and
  `private-content/projects/`. The failing command is `npm run build:deploy`,
  which runs `PRIVATE_CONTENT_STRICT=1 npm run build`; see
  `scripts/sync-content.mjs` for the required private source layout.
- Origin check fails: set the `PUBLIC_SITE_ORIGIN` secret to the production
  origin, for example `https://example.com`. `npm run build:deploy` runs
  `npm run check:origin` before syncing content, and blank values are rejected.
- Private content checkout fails: verify `PRIVATE_CONTENT_REPOSITORY` and
  `PRIVATE_CONTENT_TOKEN` in repository secrets. The deployment configuration
  check fails early when either value is blank.
- SSH setup fails: verify `DEPLOY_HOST` and `DEPLOY_KEY`. The workflow writes
  `DEPLOY_KEY` to `~/.ssh/id_ed25519` and runs `ssh-keyscan -H "$DEPLOY_HOST"`,
  so an invalid host or malformed private key fails before upload.
- `rsync` fails with a permission or path error: verify `DEPLOY_USER`,
  `DEPLOY_HOST`, and `DEPLOY_PATH`. The deploy step uploads only `dist/` to
  `${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/`, so the target user must be
  able to create, update, and delete files in that directory.

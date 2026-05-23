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
If `private-content/` exists, private files are copied into `src/content/blog/`
and `public/` before Astro starts. Missing private directories fall back to
`sample-content/` during local builds so the public sample site remains usable.

For real publishing, use strict sync:

```bash
npm run sync:content:strict
```

or:

```bash
PRIVATE_CONTENT_STRICT=1 npm run build
```

Strict sync fails when private blog posts are missing. Optional asset directories
are cleaned instead of falling back to sample assets.

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
  assets/
    images/
      blog/
      projects/
    files/

sample-content/
  blog/
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
2. checkout the private content repository from CI secrets
3. sync content into Astro's expected paths
4. run install and build
5. rsync `dist/` to the target server over SSH

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

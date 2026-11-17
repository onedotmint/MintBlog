# Docker Deployment

MintBlog is built as a static Astro site and published as a Docker image. GitHub Actions only validates the repository and publishes SHA-tagged images to the current repository's GitHub Container Registry package. An operator logs in to the VPS and runs `deploy.sh` to select the newest successful published version (or explicitly choose a SHA); Actions never connects to the VPS.

This describes the new workflow once committed and pushed, not a claim that GitHub or the VPS has already changed. Before switching, stop any old SSH-deployment workflow runs and verify the workflow revision in use.

## Runtime Layout

```text
GitHub Actions -> validate -> ghcr.io/owner/repository:sha-<full-commit>
                                  |
                   operator logs in to the VPS
                                  |
                   bash deploy.sh [optional-SHA-image]
                     -> docker compose pull
                     -> docker compose up -d --wait
                     -> MintBlog container on example_proxy_network
                     -> external Nginx container
```

The MintBlog container serves port `80` inside the Docker network. It does not publish a host port. The external Nginx container must join the same Docker network and proxy to `mintblog:80`.

## Repository Files

- `Dockerfile` builds with Node 24.22.1 and pnpm 10.34.7, then serves `dist/` with Nginx 1.30.6-alpine. Base images are digest-pinned; update both the version and digest during security maintenance.
- `docker-compose.yml` runs the public GHCR image on the external proxy network selected by the server-local `MINTBLOG_PROXY_NETWORK` setting.
- `.env.example` is a safe template for the server-side `.env`; the real `.env` remains local and ignored.
- `.github/workflows/deploy.yml` (display name **Build and publish MintBlog**) validates and publishes the image; it does not deploy or access the VPS.
- `scripts/deploy.sh` is copied to the server as `deploy.sh` for manual, locked image updates and internal-health recovery.
- `docker/nginx.conf` is the internal static-file server configuration. It is separate from the external reverse-proxy configuration.

## VPS Prerequisites

Install Docker Engine, a Docker Compose plugin supporting `up --wait`, Bash and `flock`. Automatic version selection additionally needs `curl`, `jq` and access to the public GitHub API (for example, install `curl` and `jq` once with your OS package manager). The deployment user must be able to run Docker without interactive `sudo`. Use your normal manual server login; do not give Actions an SSH private key.

All hostnames, users, paths and network names below are placeholders, not records of any actual server. Keep real SSH connection details, deployment paths, proxy configuration and `.env` values outside the repository. Select the existing proxy network privately; only create it if your proxy setup needs a new one. In these examples, replace `example_proxy_network` with your actual network:

```bash
docker network inspect example_proxy_network >/dev/null 2>&1 || docker network create example_proxy_network
```

Copy `docker-compose.yml`, `.env.example` and `scripts/deploy.sh` to the VPS once, with the script named `deploy.sh` in the deployment directory. The directory must exist **on the VPS**, not just on your local machine. The deployment user needs write permission to manage these files and the deployment lock, read permission for Compose, `.env` and the script, and execute (traverse) permission on the directory and its parents. If that user cannot create `/path/to/deployment`, have an administrator create it and grant the required ownership/permissions first; the commands below assume this access is already available:

```bash
ssh deploy@example.com 'mkdir -p /path/to/deployment'
scp docker-compose.yml .env.example deploy@example.com:/path/to/deployment/
scp scripts/deploy.sh deploy@example.com:/path/to/deployment/deploy.sh
ssh deploy@example.com 'cd /path/to/deployment && cp .env.example .env'
```

Configure `/path/to/deployment/.env` once: replace `owner/repository` in `BLOG_IMAGE` with the intended lowercase GHCR path, such as `ghcr.io/owner/repository:bootstrap`. The `bootstrap` tag is only a repository hint, not a published image: run the deployment script, not plain Compose, for the first update. An existing full-SHA `BLOG_IMAGE` also works. Keep `MINTBLOG_PROXY_NETWORK` aligned with the Nginx network. After each healthy deployment the script replaces only `BLOG_IMAGE` with the actual running full-SHA image, preserving other settings and file permissions. No `latest` tag is published.

The workflow does not upload or overwrite Compose, `.env` or the server script. Keep local and server-side changes deliberate; copy script updates to the VPS yourself.

The Nginx service must join this external network:

```yaml
networks:
  proxy:
    external: true
    name: example_proxy_network
```

The following is a generic proxy example for the Compose service alias, not a copy of any server configuration. Keep actual proxy configuration on the server:

```nginx
server {
    listen 80;
    server_name blog.example.com;

    location / {
        proxy_pass http://mintblog:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Configure HTTPS and the domain in the Nginx stack. They are outside this repository's Compose file. Public DNS must resolve to that entry point, and its certificate must cover the production hostname.

After every MintBlog container recreation, verify that the external proxy can reach the replacement container and that the public HTTPS site works. The container IP may change; a proxy holding a stale upstream address can return 502 even when MintBlog is healthy. If needed, refresh name resolution or reload the proxy according to its existing operating procedure, then repeat public acceptance. This does not require changing the runtime layout.

## GitHub Credentials and Migration

Publishing uses the workflow's `GITHUB_TOKEN` with package-write permission; no VPS SSH secrets are needed. Operators keep their manual login credentials outside Actions. If the GHCR package is private, configure read-only pull credentials on the VPS instead.

After the new workflow is pushed and all old SSH-deployment runs have stopped, delete the old repository `DEPLOY_*` secrets (`DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`) if configured and no longer used elsewhere. Remove the corresponding dedicated Actions public-key entry from the VPS user's `authorized_keys` only if it has no other use; preserve normal operator access. These are manual migration steps, not actions already performed by this documentation change.

## Forking

The workflow derives the image path from the full GitHub repository name, so a fork publishes to its own GHCR package instead of the original repository. No deployment secrets are required. Make the package public if the VPS pulls without registry credentials, and configure the server-side `.env` image repository once to match the fork. Automatic selection queries the public GitHub repository with that owner/name; for private source repositories use an explicit SHA image instead.

## First Deployment

A push to `main` or a manual `workflow_dispatch` run selecting `main` validates and publishes a SHA-tagged GHCR image when the checks succeed; neither touches the VPS. Pull requests and manual runs on other branches only validate. Image publishing is still a side effect requiring authorization, but is separate from server deployment approval. The workflow does not publish `latest`.

Workflow runs use separate concurrency groups per Git ref. A PR can replace its own obsolete validation run; new `main` runs wait rather than interrupt active publishing. Server deployment concurrency is handled separately by `deploy.sh` using `flock`.

The first publishing run creates the GHCR package at `ghcr.io/owner/repository`. GitHub may create the package as private initially, so publishing can succeed while a later server pull is denied. Make the package **Public** or configure read-only pull credentials on the VPS before deploying.

Complete the [release checklist](release-preparation.md), obtain deployment approval, then manually log in to the VPS. Run the following **from the deployment directory containing `docker-compose.yml` and the one-time repository configuration in `.env`**:

```bash
cd /path/to/deployment
bash deploy.sh
docker compose ps
docker compose logs --tail=100 web
```

The script accepts the standard Compose filenames (`compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`) and requires the `web` image to read `${BLOG_IMAGE}` rather than hardcode a version; it checks the resolved image before touching the service. The script locks deployments in this directory. Without arguments, it derives the repository from Compose's configured `web` image, selects the newest eligible successful `main` push/manual run of `deploy.yml` among the latest 100 successful runs, and confirms the `Build and publish image` job succeeded before using its full SHA. PRs, other repositories, failed/in-progress runs and skipped image publishing cannot become deployment targets. It prints the selected workflow URL and the resulting SHA image. A newer run still building does not block selection of the previous successful release: wait for your new run if you specifically want its content.

It pulls before updating, uses Compose `up --wait` for internal health, then atomically saves the running image in `.env`. API errors/rate limits, missing successful publication or pull failures leave the service and `.env` unchanged. Startup or save failures attempt recovery to the previous exact local image ID. The script never performs public acceptance.

For an explicit version (also usable without GitHub API access, `curl`, `jq`, or an existing `.env`), run `bash deploy.sh 'ghcr.io/owner/repository:sha-<40-lowercase-hex>'`. Short SHAs, `latest`, and other mutable explicit tags are rejected.

The Docker/Compose health check only requests `http://127.0.0.1/healthz` inside the container. A `healthy` result establishes internal liveness, not public reachability or correct content; it does not test the external proxy, DNS, TLS, public routes or search. After deployment, perform the [public acceptance checks](release-preparation.md#5-部署后公网验收与回滚收尾), including proxy access after container recreation, and record the deployed image and full commit SHA. Workflow or script success alone is not release acceptance.

No manual image-version edit is needed after a healthy deployment: `.env` already records the running version. This is a runtime default, not a record of public acceptance. Keep `MINTBLOG_PROXY_NETWORK` aligned with the actual external proxy network (set this privately for your deployment), and record public acceptance separately. The deployment directory and regular `.env` must be writable; symlink/non-regular `.env` files are refused instead of overwritten.

## Daily Publishing

Use the [release checklist](release-preparation.md) as the single place for source-snapshot review, toolchain versions, frozen installation, quality checks, production configuration, authorization and public acceptance. Publishing an image does not update the site. With deployment approval, wait for the desired GitHub run to finish, log in to the VPS and run `bash deploy.sh`, then open the public site to verify the update. The script selects and saves the published SHA automatically; no per-release SHA copying or `.env` edit is needed. Retain the previously accepted version for explicit rollback.

## Rollback

Before updating, record the running image reference, full commit SHA and exact local image ID, and retain that local image plus a pullable known-good commit image and matching server-side Compose/environment configuration. Do not prune the previous image before acceptance.

If startup or `up --wait` fails after the update begins, `deploy.sh` restores the previous container's **exact local image ID**, not a potentially changed tag, and waits for its health check. With no previous container it stops `web`. A pull failure leaves the existing service alone. Inspect any recovery error; automatic recovery does not prove public access or successful release acceptance.

For an operator-requested rollback (including public acceptance failure), run the script from the VPS deployment directory with the full SHA of a previously published, accepted commit:

```bash
bash deploy.sh 'ghcr.io/owner/repository:sha-<previous-40-lowercase-hex>'
```

After any rollback, inspect health and logs, verify proxy access to the recreated container, and repeat the [public acceptance checks](release-preparation.md#5-部署后公网验收与回滚收尾) over the production HTTPS domain. Record the image reference/full SHA actually running, the reason for rollback, the acceptance results and any unresolved issue. A successful explicit rollback also saves its running SHA in `.env`; no manual image-version edit is needed. If automatic recovery failed, reconcile the actual running container and defaults manually before further updates.

## Troubleshooting

- `network example_proxy_network not found`: create the external network or check `MINTBLOG_PROXY_NETWORK`.
- `BLOG_IMAGE must be set`: automatic selection needs the one-time `.env` repository hint (see `.env.example`), or use an explicit full-SHA image argument to bootstrap.
- Missing `curl`/`jq`, API rate limits, private-source API denial, or no successful publishing run: install the tools/check GitHub access or deploy an explicit known published SHA. The script does not guess `main`'s current SHA or fall back to a mutable tag.
- Nginx cannot resolve `mintblog`: confirm both containers are attached to the configured network with `docker network inspect example_proxy_network` (substitute the actual network name). After a container recreation, also check for a stale upstream IP in the proxy and recheck public HTTPS after any proxy reload.
- GHCR pull is denied: change the package visibility to Public or configure a read-only registry credential on the VPS.
- The site builds but canonical URLs still point to GitHub Pages: update `SITE.website` in `src/config.ts` when the production domain is ready, then redeploy.

## Automatic Post Dates

Blog/Shorts can omit frontmatter. Their dates come from Git, so both validation and image-publishing checkouts fetch full history. The publish job uses Node 24 to export `.post-dates.json` before entering the Git-free Docker build. No Git history or credentials are copied into the image.

Normal `pnpm build` prepares the snapshot automatically. Before a manual `docker build`, run `pnpm content:dates` in the full Git checkout. Keep this generated file in the Docker context but out of commits; it must match the exact article bytes. Without Git and a matching snapshot, automatic-date articles intentionally fail to build rather than acquire deployment-day timestamps. Changes are not published by saving a Typora file; existing release approval and push rules still apply.

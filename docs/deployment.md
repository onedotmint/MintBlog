# Docker Deployment

MintBlog is built as a static Astro site and published as a Docker image. GitHub Actions validates the repository, starts the image it will push, and reports the resulting GHCR manifest digest. An operator approves that exact digest and passes it to `deploy.sh` on the VPS. Actions never connects to the VPS.

This describes the new workflow once committed and pushed, not a claim that GitHub or the VPS has already changed. Before switching, stop any old SSH-deployment workflow runs and verify the workflow revision in use.

## Runtime Layout

```text
GitHub Actions -> validate -> build/load -> smoke-test -> push the same image
                                                            |
                                          review and approve manifest digest
                                                            |
                    bash deploy.sh ghcr.io/owner/repository@sha256:<digest>
                      -> docker compose pull -> docker compose up -d --wait
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

Install Docker Engine, a Docker Compose plugin supporting `up --wait --wait-timeout`, Bash and `flock`. The deployment script does not query GitHub, so it needs neither `curl` nor `jq` on the VPS. The deployment user must be able to run Docker without interactive `sudo`. Use your normal manual server login; do not give Actions an SSH private key.

All hostnames, users, paths and network names below are placeholders, not records of any actual server. Keep real SSH connection details, deployment paths, proxy configuration and `.env` values outside the repository. Select the existing proxy network privately; only create it if your proxy setup needs a new one. In these examples, replace `example_proxy_network` with your actual network:

```bash
docker network inspect example_proxy_network >/dev/null 2>&1 || docker network create example_proxy_network
```

Copy `docker-compose.yml`, `.env.example` and `scripts/deploy.sh` to the VPS once, with the script named `deploy.sh` in the deployment directory. The directory must exist **on the VPS**, not just on your local machine. The deployment user needs write permission to manage these files and the deployment lock, read permission for Compose, `.env` and the script, and execute (traverse) permission on the directory and its parents. If that user cannot create `/path/to/deployment`, have an administrator create it and grant the required ownership/permissions first; the commands below assume this access is already available:

```bash
ssh deploy@example.com 'mkdir -p /path/to/deployment'
scp docker-compose.yml .env.example deploy@example.com:/path/to/deployment/
scp scripts/deploy.sh deploy@example.com:/path/to/deployment/deploy.sh
ssh deploy@example.com 'cd /path/to/deployment && (test -e .env || cp .env.example .env)'
```

Set `MINTBLOG_PROXY_NETWORK` in `/path/to/deployment/.env` to match the Nginx network. On a fresh server, leave `BLOG_IMAGE` unset and use the script, not plain Compose, to bootstrap. On an existing server, update Compose and the script together and keep your existing `.env`; a successful digest deployment replaces the old `BLOG_IMAGE` entry. Record a pullable, known-good rollback digest before updating. Do not assume the current contents of an old SHA tag match the running container.

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

The workflow derives the image path from the full GitHub repository name, so a fork publishes to its own GHCR package instead of the original repository. No deployment secrets are required. Use the digest from the fork's successful workflow summary. Make the package public if the VPS pulls without registry credentials.

## First Deployment

A push to `main` or a manual `workflow_dispatch` run selecting `main` validates, then builds and loads one Docker image on the publishing runner. CI starts that image by its local ID, waits for Docker health, and checks `/`, `/blog/`, `/projects/`, `/shorts/`, `/rss.xml` and `/sitemap-index.xml` for nonempty HTTP 200 responses. A missing URL must return HTTP 404 with the generated `404.html` body. Only after those checks does CI push the loaded image; there is no second image build. Pull requests and manual runs on other branches only validate. Neither validation nor publishing touches the VPS. Publishing itself requires authorization separate from server deployment approval.

The `sha-<full-commit>` tag helps locate the image but can be overwritten (including by reruns); the workflow does not publish `latest`. The successful **Build and publish image** job summary includes the commit SHA, the `ghcr.io/owner/repository@sha256:…` reference using the manifest digest returned by the push, and a ready-to-copy command. Confirm the selected run and attempt succeeded before using its summary. The manifest digest pins the published image and is not the commit SHA or the local Docker image ID.

Workflow runs use separate concurrency groups per Git ref. A PR can replace its own obsolete validation run; new `main` runs wait rather than interrupt active publishing. Server deployment concurrency is handled separately by `deploy.sh` using `flock`.

The first publishing run creates the GHCR package at `ghcr.io/owner/repository`. GitHub may create the package as private initially, so publishing can succeed while a later server pull is denied. Make the package **Public** or configure read-only pull credentials on the VPS before deploying.

Complete the [release checklist](release-preparation.md) and obtain deployment approval for the exact manifest digest. Log in to the VPS and paste the summary command **from the directory containing `docker-compose.yml`**. For example (substitute the approved digest reference):

```bash
cd /path/to/deployment
bash deploy.sh 'ghcr.io/owner/repository@sha256:<approved-64-lowercase-hex>'
docker compose ps
docker compose logs --tail=100 web
```

Exactly one lowercase GHCR `owner/repository@sha256:<64 lowercase hex>` reference is required. A tag (including `sha-…` or `latest`) is not accepted. With no argument, the script prints usage and exits before Docker, network access or any file changes. The script checks the reference's syntax, not whether a human approved it or which workflow produced it; review and approval happen before running the command.

The script accepts the standard Compose filenames (`compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`), requires the `web` image to use `${BLOG_IMAGE}`, and locks updates in that directory. It pulls the digest before updating, records the pulled local image ID, and uses `up --wait --pull never`. Only after inspecting the running container and confirming that exact ID and a healthy state does it atomically save the digest in `.env`. Pull or image lookup failures do not change the service; startup, verification or save failures leave the old defaults in place and attempt recovery. A missing `.env` is created with mode `0600`; existing file permissions and other settings are preserved. Symlink and non-regular `.env` files are refused. No manual edit of `BLOG_IMAGE` is needed after a successful update.

Compose inherits the image's Docker health check. It requests `http://127.0.0.1/healthz`, which serves the generated `index.html` from a clean document root and returns 503 if it is missing. This is an internal check, not proof of correct public service. Perform the [public acceptance checks](release-preparation.md#5-部署后公网验收与回滚收尾), including proxy access after container recreation, and record the digest, full commit SHA and results. The saved default records the verified running version, not public acceptance.

## Daily Publishing

Use the [release checklist](release-preparation.md) for source-snapshot review, checks, configuration, authorization and public acceptance. Publishing does not update the site. For each release, take the command from the intended successful run's summary, approve its exact digest, paste it on the VPS and verify the public site. Retain the previously accepted digest for rollback.

## Rollback

Before updating, record the running digest, full commit SHA and exact local image ID. Retain the local image, a pullable previously accepted digest and matching server-side Compose/environment configuration. Do not prune the previous image before acceptance.

On a startup, verification or save failure, `deploy.sh` attempts to restore the previous container's **exact local image ID** without pulling, not a potentially changed tag. It reports recovery only after inspecting the running container and confirming that old ID and a healthy state; the deploy command still fails and leaves `.env` unchanged. With no previous container it attempts to stop `web`. A pull failure leaves the existing service alone.

For an operator-requested rollback (including public acceptance failure), use the same command with the previously accepted, approved digest:

```bash
bash deploy.sh 'ghcr.io/owner/repository@sha256:<previous-64-lowercase-hex>'
```

After any rollback, inspect health and logs, verify proxy access to the recreated container, and repeat the [public acceptance checks](release-preparation.md#5-部署后公网验收与回滚收尾) over the production HTTPS domain. Record the actual version (digest, commit SHA and local ID), reason, results and any unresolved issue. A successful explicit rollback saves its digest in `.env`. If automatic recovery failed, reconcile the actual running container and defaults manually before further updates.

## Troubleshooting

- `network example_proxy_network not found`: create the external network or check `MINTBLOG_PROXY_NETWORK`.
- `Set BLOG_IMAGE ...`: bootstrap with the approved digest via `deploy.sh`, not plain Compose.
- No successful run summary or approved rollback digest: stop. Do not resolve a mutable tag as a substitute for an approved digest.
- Nginx cannot resolve `mintblog`: confirm both containers are attached to the configured network with `docker network inspect example_proxy_network` (substitute the actual network name). After a container recreation, also check for a stale upstream IP in the proxy and recheck public HTTPS after any proxy reload.
- GHCR pull is denied: change the package visibility to Public or configure a read-only registry credential on the VPS.
- The site builds but canonical URLs still point to GitHub Pages: update `SITE.website` in `src/config.ts` when the production domain is ready, then redeploy.

## Automatic Post Dates

Blog/Shorts can omit frontmatter. Their dates come from Git, so both validation and image-publishing checkouts fetch full history. The publish job uses Node 24 to export `.post-dates.json` before entering the Git-free Docker build. No Git history or credentials are copied into the image.

Normal `pnpm build` prepares the snapshot automatically. Before a manual `docker build`, run `pnpm content:dates` in the full Git checkout. Keep this generated file in the Docker context but out of commits; it must match the exact article bytes. Without Git and a matching snapshot, automatic-date articles intentionally fail to build rather than acquire deployment-day timestamps. Changes are not published by saving a Typora file; existing release approval and push rules still apply.

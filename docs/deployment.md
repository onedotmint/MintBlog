# Docker Deployment

MintBlog is built as a static Astro site and published as a Docker image. GitHub Actions validates the repository, pushes the image to the current repository's GitHub Container Registry package, and updates the VPS over SSH. The VPS only needs Docker and Docker Compose.

## Runtime Layout

```text
GitHub Actions
    -> ghcr.io/OWNER/REPOSITORY
    -> SSH to the VPS
    -> docker compose pull
    -> docker compose up -d
    -> MintBlog container on npm_default
    -> external Nginx container
```

The MintBlog container serves port `80` inside the Docker network. It does not publish a host port. The external Nginx container must join the same Docker network and proxy to `mintblog:80`.

## Repository Files

- `Dockerfile` builds the site with Node 24 and pnpm, then serves `dist/` with Nginx.
- `docker-compose.yml` runs the public GHCR image on a configurable external network, defaulting to `npm_default`.
- `.env.example` is a safe template for the server-side `.env`; the real `.env` remains local and ignored.
- `.github/workflows/deploy.yml` validates, publishes, and deploys the image without overwriting the server-managed Compose file.
- `docker/nginx.conf` is the internal static-file server configuration. It is separate from the external reverse-proxy configuration.

## VPS Prerequisites

Install Docker Engine and the Docker Compose plugin. The deployment user must be able to run Docker without interactive `sudo`.

Create the shared network once:

```bash
docker network inspect npm_default >/dev/null 2>&1 || docker network create npm_default
```

Copy `docker-compose.yml` and `.env.example` to the VPS once and keep them in the deployment directory. The deployment user must own this directory or have permission to read it:

```bash
mkdir -p /opt/mintblog
scp docker-compose.yml .env.example deploy@example.com:/opt/mintblog/
ssh deploy@example.com 'cd /opt/mintblog && cp .env.example .env'
```

Edit `/opt/mintblog/.env` and replace `OWNER/REPOSITORY` with the GitHub owner and repository that will publish the image. Keep the `MINTBLOG_PROXY_NETWORK` value aligned with the Nginx network. The `.env.example` file contains no credentials and can be committed.

The workflow does not upload or overwrite this Compose file or `.env`. Keep local and server-side changes to the Compose contract deliberate.

The Nginx service must join this external network:

```yaml
networks:
  proxy:
    external: true
    name: npm_default
```

The external Nginx configuration can proxy the domain to the MintBlog network alias:

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

Configure HTTPS and the domain in the Nginx stack. They are outside this repository's Compose file.

## GitHub Secrets

Add these repository secrets under **Settings -> Secrets and variables -> Actions**:

- `DEPLOY_HOST` (required): VPS hostname or IP address.
- `DEPLOY_PORT` (optional): SSH port; defaults to `22`.
- `DEPLOY_USER` (required): deployment user with Docker access.
- `DEPLOY_PATH` (required): absolute path such as `/opt/mintblog`.
- `DEPLOY_SSH_KEY` (required): private Ed25519 key for the deployment user.
- `DEPLOY_KNOWN_HOSTS` (required): verified `ssh-keyscan -H` output for the VPS.

Generate a dedicated key locally and install only its public key for the deployment user:

```bash
ssh-keygen -t ed25519 -C github-actions-mintblog -f ~/.ssh/mintblog_deploy
ssh-keyscan -H your-domain.example >> ~/.ssh/mintblog_known_hosts
```

Paste the private key into `DEPLOY_SSH_KEY` and the verified known-host entry into `DEPLOY_KNOWN_HOSTS`. Do not commit either file or paste it into an issue or chat.

## Forking

The workflow derives the image path from the full GitHub repository name, so a fork publishes to its own GHCR package instead of the original repository. Configure the same deployment secrets in the fork, make the package public if the VPS pulls without registry credentials, and update the server-side `.env` image path to match the fork.

## First Deployment

The first push to `main` builds the image and creates the GHCR package at `ghcr.io/OWNER/REPOSITORY`. GitHub may create the package as private initially, so the publish job can succeed while the deploy job fails to pull the image. Open the package settings, change its visibility to **Public**, and rerun the workflow before relying on automatic deployment.

After replacing the placeholder, the server-side `.env` provides the default image for manual `docker compose up -d`. During an automated deployment, the workflow injects an immutable commit image into the remote `docker compose pull` and `docker compose up` commands without changing `.env`:

```text
BLOG_IMAGE=ghcr.io/OWNER/REPOSITORY:sha-<commit>
```

After the workflow succeeds, verify the service on the VPS:

```bash
cd /opt/mintblog
docker compose config
docker compose ps
docker compose logs --tail=100 web
```

The Compose file defaults to the `npm_default` network. Override it only when the Nginx network has a different name:

```bash
MINTBLOG_PROXY_NETWORK=another_network docker compose up -d
```

## Daily Publishing

1. Add or update content under `src/content/`.
2. Push the change to `main`.
3. GitHub Actions runs validation, builds the image, pushes it to GHCR, and recreates the server-managed Compose service.

Pull the image before a manual update when using the default `latest` tag. Replace `OWNER/REPOSITORY` with the current GitHub repository:

```bash
BLOG_IMAGE=ghcr.io/OWNER/REPOSITORY:latest docker compose pull
BLOG_IMAGE=ghcr.io/OWNER/REPOSITORY:latest docker compose up -d --remove-orphans
```

## Rollback

Use a previously published commit image to roll back, then pull and recreate the service:

```bash
BLOG_IMAGE=ghcr.io/OWNER/REPOSITORY:sha-<previous-commit> docker compose pull
BLOG_IMAGE=ghcr.io/OWNER/REPOSITORY:sha-<previous-commit> docker compose up -d --remove-orphans
```

## Troubleshooting

- `network npm_default not found`: create the external network or check `MINTBLOG_PROXY_NETWORK`.
- `BLOG_IMAGE must be set`: create the server-side `.env` or pass `BLOG_IMAGE` for the command.
- Nginx cannot resolve `mintblog`: confirm both containers are attached to `npm_default` with `docker network inspect npm_default`.
- GHCR pull is denied: change the package visibility to Public or configure a read-only registry credential on the VPS.
- The site builds but canonical URLs still point to GitHub Pages: update `SITE.website` in `src/config.ts` when the production domain is ready, then redeploy.

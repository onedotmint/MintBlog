#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "${1:-}" =~ ^ghcr\.io/[a-z0-9][a-z0-9._/-]*:sha-[0-9a-f]{40}$ ]]; then
  echo "Usage: bash deploy.sh ghcr.io/owner/repository:sha-<full-commit-SHA>" >&2
  exit 64
fi
if [[ ! -f docker-compose.yml ]]; then
  echo "Run this script from the VPS directory containing docker-compose.yml and .env." >&2
  exit 1
fi
command -v docker >/dev/null
command -v flock >/dev/null

# Keep manual updates and rollbacks from racing in the same deployment directory.
exec 9>.mintblog-deploy.lock
if ! flock -n 9; then
  echo "Another MintBlog deployment is already running." >&2
  exit 1
fi

export BLOG_IMAGE="$1"
previous_container="$(docker compose ps --all -q web)"
previous_image=""
if [[ -n "$previous_container" ]]; then
  # A local image ID still identifies the old bytes if a remote tag is overwritten.
  previous_image="$(docker inspect --format '{{.Image}}' "$previous_container")"
fi

# A failed pull must leave the running site untouched.
docker compose pull web

rollback() {
  trap - ERR INT TERM
  set +e
  docker compose logs --tail=100 web >&2
  if [[ -n "$previous_image" ]]; then
    echo "Restoring previous image: $previous_image" >&2
    if BLOG_IMAGE="$previous_image" docker compose up -d --wait --wait-timeout 120 --pull never web; then
      echo "Previous image is healthy; verify the public HTTPS site." >&2
    else
      echo "Rollback failed; inspect Docker logs and recover the site manually." >&2
    fi
  else
    echo "Stopping the failed first deployment; no previous container exists." >&2
    docker compose stop web
  fi
  exit 1
}
trap rollback ERR INT TERM

docker compose up -d --wait --wait-timeout 120 --pull never web
trap - ERR INT TERM

echo "Container is healthy: $BLOG_IMAGE"
echo "Verify the public HTTPS site, routes and search before accepting this release."
echo "After acceptance, set BLOG_IMAGE in .env to this version; this script does not edit .env."

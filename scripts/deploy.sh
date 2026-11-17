#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 1 || ( $# -eq 1 && ! "$1" =~ ^ghcr\.io/[a-z0-9][a-z0-9._/-]*:sha-[0-9a-f]{40}$ ) ]]; then
  echo "Usage: bash deploy.sh [ghcr.io/owner/repository:sha-<full-commit-SHA>]" >&2
  exit 64
fi
if [[ ! -f compose.yaml && ! -f compose.yml && ! -f docker-compose.yaml && ! -f docker-compose.yml ]]; then
  echo "Run this script from the VPS directory containing its Compose file." >&2
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

if [[ -L .env || ( -e .env && ! -f .env ) ]]; then
  echo "Refusing to replace a symlink or non-regular .env file." >&2
  exit 1
fi

image="${1:-}"
if [[ $# -eq 0 ]]; then
  for dependency in curl jq; do
    if ! command -v "$dependency" >/dev/null; then
      echo "Automatic deployment requires $dependency; install it once on the VPS." >&2
      exit 1
    fi
  done
  configured_image="$(docker compose config --images web)"
  repository="${configured_image#ghcr.io/}"
  repository="${repository%%:*}"
  if [[ "$configured_image" != ghcr.io/* || ! "$repository" =~ ^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$ ]]; then
    echo "Configure BLOG_IMAGE once with a lowercase ghcr.io/owner/repository image." >&2
    exit 1
  fi
  api="https://api.github.com/repos/$repository/actions"
  # shortcut: scans 100 successful runs; paginate if older publishing history must be searched.
  release="$(curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    "$api/workflows/deploy.yml/runs?branch=main&status=success&per_page=100" | \
    jq -er --arg repository "$repository" '
      [.workflow_runs[] | select(
        .head_branch == "main" and .status == "completed" and .conclusion == "success" and
        (.event == "push" or .event == "workflow_dispatch") and
        (.head_repository.full_name | ascii_downcase) == $repository
      )] | first | if . == null then error("No successful main publishing run found")
      else [.id, .head_sha] | @tsv end')"
  IFS=$'\t' read -r run_id sha <<< "$release"
  if [[ ! "$run_id" =~ ^[0-9]+$ || ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "GitHub returned an invalid run ID or commit SHA." >&2
    exit 1
  fi
  if ! curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    "$api/runs/$run_id/jobs?per_page=100" | \
    jq -e 'any(.jobs[]; .name == "Build and publish image" and .status == "completed" and .conclusion == "success")' >/dev/null; then
    echo "Could not confirm successful image publication; nothing was deployed." >&2
    exit 1
  fi
  image="ghcr.io/$repository:sha-$sha"
  echo "Selected successful release: https://github.com/$repository/actions/runs/$run_id"
fi
export BLOG_IMAGE="$image"
if [[ "$(docker compose config --images web)" != "$BLOG_IMAGE" ]]; then
  echo 'The Compose web image must use ${BLOG_IMAGE}; no service or defaults were changed.' >&2
  exit 1
fi

# Prepare the defaults before touching the service; only replace them after health succeeds.
env_tmp="$(mktemp .env.XXXXXX)"
trap 'rm -f -- "$env_tmp"' EXIT
if [[ -f .env ]]; then
  chmod --reference=.env "$env_tmp"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ ! "$line" =~ ^[[:space:]]*(export[[:space:]]+)?BLOG_IMAGE[[:space:]]*= ]]; then
      printf '%s\n' "$line"
    fi
  done < .env > "$env_tmp"
fi
printf 'BLOG_IMAGE=%s\n' "$BLOG_IMAGE" >> "$env_tmp"
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
mv -f -- "$env_tmp" .env
trap - ERR INT TERM

echo "Container is healthy: $BLOG_IMAGE"
echo "Verify the public HTTPS site, routes and search before accepting this release."
echo "Saved the running image in .env: $BLOG_IMAGE"

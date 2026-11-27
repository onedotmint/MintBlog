#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "${1:-}" =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*@sha256:[0-9a-f]{64}$ ]]; then
  echo 'Usage: bash deploy.sh ghcr.io/owner/repository@sha256:<64-lowercase-hex>' >&2
  echo 'Pass the approved image digest from the successful GitHub Actions run summary (or the previously accepted digest for rollback). Nothing was deployed.' >&2
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

export BLOG_IMAGE="$1"
compose_uses_image() {
  local resolved
  resolved="$(BLOG_IMAGE="$1" docker compose config --images web)" && [[ "$resolved" == "$1" ]]
}
if ! compose_uses_image "$BLOG_IMAGE"; then
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
image_id_pattern='^sha256:[0-9a-f]{64}$'
previous_container="$(docker compose ps --all -q web)"
previous_image=""
if [[ -n "$previous_container" ]]; then
  previous_image="$(docker inspect --type container --format '{{.Image}}' "$previous_container")"
  if [[ ! "$previous_image" =~ $image_id_pattern ]] || ! compose_uses_image "$previous_image"; then
    echo 'Cannot pin the previous container to its local image ID for rollback; nothing was deployed.' >&2
    exit 1
  fi
fi

# A failed pull must leave the running site untouched.
docker compose pull web
target_image="$(docker image inspect --format '{{.Id}}' "$BLOG_IMAGE")"
if [[ ! "$target_image" =~ $image_id_pattern ]]; then
  echo 'Could not identify the pulled image; nothing was deployed.' >&2
  exit 1
fi

verify_running_image() {
  local container actual
  if ! container="$(docker compose ps -q web)" || [[ -z "$container" ]] ||
     ! actual="$(docker inspect --type container --format '{{.Image}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container")" ||
     [[ "$actual" != "$1 healthy" ]]; then
    echo "Expected web to be healthy on image ID $1; found ${actual:-no running container}." >&2
    return 1
  fi
}

rollback() {
  trap - ERR INT TERM
  set +e
  docker compose logs --tail=100 web >&2
  if [[ -n "$previous_image" ]]; then
    echo "Restoring previous image: $previous_image" >&2
    if BLOG_IMAGE="$previous_image" docker compose up -d --wait --wait-timeout 120 --pull never web &&
       verify_running_image "$previous_image"; then
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
verify_running_image "$target_image"
# Do not roll back in response to a signal between the atomic save and clearing the trap.
trap '' INT TERM
mv -fT -- "$env_tmp" .env
trap - ERR INT TERM

echo "Container is healthy: $BLOG_IMAGE (image ID: $target_image)"
echo "Verify the public HTTPS site, routes and search before accepting this release."
echo "Saved the running image in .env: $BLOG_IMAGE"

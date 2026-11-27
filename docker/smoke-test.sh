#!/usr/bin/env bash
set -euo pipefail

image_id="$1"
workdir="$(mktemp -d)"
container=""
cleanup() {
  local status=$?
  if [[ -n $container ]]; then
    if (( status != 0 )); then docker logs "$container" >&2 || true; fi
    docker rm -f "$container" >/dev/null || true
  fi
  rm -rf -- "$workdir"
}
trap cleanup EXIT

container="$(docker run -d --pull never --health-interval 1s -p 127.0.0.1::80 "$image_id")"
for (( attempt = 0; attempt < 30; attempt++ )); do
  state="$(docker inspect --format '{{.State.Status}} {{.State.Health.Status}}' "$container")"
  [[ $state == 'running starting' ]] || break
  sleep 1
done
if [[ $state != 'running healthy' ]]; then
  echo "Image health check did not pass: $state" >&2
  exit 1
fi

base_url="http://$(docker port "$container" 80/tcp)"
check_route() {
  local route="$1" expected="$2" file="$3" status
  status="$(curl --silent --show-error --max-time 10 --output "$file" --write-out '%{http_code}' "$base_url$route")"
  if [[ $status != "$expected" || ! -s $file ]]; then
    echo "Expected HTTP $expected and a nonempty body for $route, got $status." >&2
    return 1
  fi
}

for route in / /blog/ /projects/ /shorts/ /rss.xml /sitemap-index.xml; do
  check_route "$route" 200 "$workdir/response"
done
check_route /404.html 200 "$workdir/404.html"
check_route /__mintblog_smoke_missing__ 404 "$workdir/response"
cmp "$workdir/404.html" "$workdir/response"

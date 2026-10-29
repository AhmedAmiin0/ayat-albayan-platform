#!/bin/sh
# Rolling deploy of the staging API (docs/09 «Two API copies + one worker»). Run in /opt/ayat-albayan-staging:
#   sh roll.sh             build the image once, roll ayat-worker → ayat-api-a → ayat-api-b (each healthy before
#                          the next; ayat-lb keeps serving from the other copy), reload ayat-lb if its config changed
#   sh roll.sh --env-only  no build: recreate the same way so every container reads the new .env
# Touches only this compose project (ayat-albayan-staging): never another container, image, the host Caddy or /opt/wacrm.
set -eu
cd "$(dirname "$0")"
PROJECT=ayat-albayan-staging
MODE="${1:-}"
RECREATE=""
[ "$MODE" = "--env-only" ] && RECREATE="--force-recreate"
dc() { docker compose -p "$PROJECT" "$@"; }
# The load balancer's image, as pinned in docker-compose.yml (compose.test.mjs keeps them equal).
LB_IMAGE=caddy:2.10.2-alpine

# This layout runs the jobs in ayat-worker only because the code reads APP_ROLE. Code from before the roles
# (a rollback to an older src) would run every job in every container: refuse it, build or --env-only alike.
[ -f src/apps/api/src/config/role/app-role.ts ] || {
  echo 'src predates APP_ROLE: restore docker-compose.yml.old (single container)'
  exit 1
}

# Waits for the service's Docker health check (up to ~3 minutes).
healthy() {
  i=0
  while [ "$i" -lt 90 ]; do
    id=$(dc ps -q "$1" || true)
    state=""
    [ -z "$id" ] || state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" || true)
    if [ "$state" = healthy ]; then echo "$1 healthy"; return 0; fi
    i=$((i + 1))
    sleep 2
  done
  echo "::error::$1 did not become healthy"
  dc logs --tail 80 "$1" || true
  return 1
}

roll() {
  # shellcheck disable=SC2086
  dc up -d --no-deps $RECREATE "$1"
  healthy "$1"
}

# Is lb/Caddyfile valid? Always in a throwaway container of the same image, never inside the running LB: a second
# Caddy in its 64 MB limit could get the LB itself OOM-killed (and restarted on the unchecked file).
lb_valid() {
  docker run --rm --network none -v "$PWD/lb:/etc/caddy:ro" "$LB_IMAGE" caddy validate --config /etc/caddy/Caddyfile
}

# A changed Caddyfile is validated first, then reloaded in place (no restart). Invalid, or refused by the
# reload: the roll fails (the rollback follows) and the running LB keeps its config and .lb.sha256 its sum.
# Never forced in by recreating the LB (3110 would go down on a config Caddy refused).
lb() {
  sum=$(sha256sum lb/Caddyfile | cut -d' ' -f1)
  if [ "$sum" != "$(cat .lb.sha256 2>/dev/null || true)" ]; then
    lb_valid || { echo '::error::lb/Caddyfile is invalid: ayat-lb keeps its config'; return 1; }
    if [ -n "$(dc ps -q ayat-lb)" ]; then
      # From here the running config may be the new one: no stored sum until the roll is done, so a rollback's
      # roll.sh always reloads the file it restores.
      rm -f .lb.sha256
      dc exec -T ayat-lb caddy reload --config /etc/caddy/Caddyfile || {
        echo '::error::caddy reload refused lb/Caddyfile: ayat-lb keeps its config'
        return 1
      }
    fi
  fi
  # Creates it when missing; recreates it only when its compose definition changed (image tag, port).
  dc up -d --no-deps ayat-lb
  echo "$sum" > .lb.sha256
  curl -fsS --retry 15 --retry-delay 2 --retry-all-errors http://127.0.0.1:3110/health
  echo
}

[ "$MODE" = "--env-only" ] || dc build ayat-worker
# The shared cache first (docs/09 «Shared cache»): every copy and the worker find it as they start.
dc up -d --no-deps ayat-redis

legacy=$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" --filter "label=com.docker.compose.service=ayat-api")
if [ -n "$legacy" ]; then
  # Once, from the single ayat-api container (every job + 3110): the LB image first (pulled while the old
  # container still serves), the copies (no host port, no jobs), then 3110 goes to the LB (a second or two:
  # only the port changes hands after the stop), then the worker, so the old process and the worker never
  # run jobs side by side.
  dc pull ayat-lb
  # Before anything stops: a Caddyfile Caddy refuses must never cost the old container its port.
  lb_valid || { echo '::error::lb/Caddyfile is invalid: the single container keeps 3110'; exit 1; }
  roll ayat-api-a
  roll ayat-api-b
  # shellcheck disable=SC2086
  docker stop -t 30 $legacy >/dev/null && docker rm $legacy >/dev/null
  lb
  roll ayat-worker
else
  roll ayat-worker
  roll ayat-api-a
  roll ayat-api-b
  lb
fi

# Anything left from an older layout of THIS project; old images of THIS project only.
dc up -d --no-recreate --remove-orphans
docker image prune -f --filter "label=com.docker.compose.project=$PROJECT" >/dev/null
echo "staging rolled: $(dc ps --format '{{.Service}}={{.Status}}' | tr '\n' ' ')"

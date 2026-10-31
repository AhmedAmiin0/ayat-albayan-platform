#!/bin/sh
# Deploy of the STAGING API (docs/09 «Staging»), run in /opt/ayat-albayan-stg by deploy-staging.yml under its deploy
# lock (flock .deploy.lock):
#   sh roll.sh             build the image, recreate ayat-api and ayat-pdf (one API process: a short downtime)
#   sh roll.sh --env-only  no build: recreate both so they read the new .env
# Touches only this compose project (ayat-albayan-stg): never production (ayat-albayan-staging), another image, the
# host Caddy, /opt/wacrm or the Docker build cache (shared with the CRM and production).
set -eu
cd "$(dirname "$0")"
PROJECT=ayat-albayan-stg
dc() { docker compose -p "$PROJECT" "$@"; }

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

if [ "${1:-}" = "--env-only" ]; then
  dc up -d --force-recreate --remove-orphans
else
  dc build ayat-api
  dc up -d --remove-orphans
fi
healthy ayat-api
# Previews never gate a deploy: without the sandbox they answer pdf_unavailable.
healthy ayat-pdf || echo '::warning::ayat-pdf not healthy: chat PDF previews answer pdf_unavailable'
curl -fsS --retry 15 --retry-delay 2 --retry-all-errors http://127.0.0.1:3120/health
echo
docker image prune -f --filter "label=com.docker.compose.project=$PROJECT" >/dev/null
echo "staging rolled: $(dc ps --format '{{.Service}}={{.Status}}' | tr '\n' ' ')"

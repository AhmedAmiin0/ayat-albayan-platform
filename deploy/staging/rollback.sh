#!/bin/sh
# Back to the previous version after a failed deploy (docs/09 «Two API copies + one worker» → «Roll back»). Run in
# /opt/ayat-albayan-staging, inside the deploy lock (the workflow: `sh roll.sh || { sh rollback.sh; exit 1; }`).
# Puts back src.old and the previous compose file, roll.sh and lb/Caddyfile (this file itself is never rewritten
# while it runs), then rolls the previous layout. Ends with 127.0.0.1:3110 answering /health, or fails loudly.
# Touches only this compose project (ayat-albayan-staging): never another container, image, the host Caddy or /opt/wacrm.
set -eu
cd "$(dirname "$0")"
PROJECT=ayat-albayan-staging
dc() { docker compose -p "$PROJECT" "$@"; }

[ -d src.old ] || { echo '::error::no src.old: nothing to roll back to'; exit 1; }
rm -rf src.bad && mv src src.bad && mv src.old src
for f in docker-compose.yml roll.sh lb/Caddyfile; do [ ! -f "$f.old" ] || cat "$f.old" > "$f"; done

# This project's containers of one service (any state).
ids() { docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" --filter "label=com.docker.compose.service=$1"; }

# SIGTERM and up to 30 s each (requests in flight, a PDF render), then remove.
stop() {
  for s in "$@"; do
    c=$(ids "$s")
    [ -n "$c" ] || continue
    # Explicit exit: set -e does not stop on a failure inside a list. A worker that will not stop must never
    # see the single container (which runs every job) start beside it.
    # shellcheck disable=SC2086
    docker stop -t 30 $c >/dev/null && docker rm $c >/dev/null || {
      echo "::error::could not stop $s: the previous container is NOT started (fix by hand, docs/09 «Roll back»)"
      exit 1
    }
  done
}

if grep -q '^  ayat-lb:' docker-compose.yml; then
  # The previous layout was this one: roll it again (roll.sh refuses code from before APP_ROLE).
  sh roll.sh
else
  # The previous layout was the single ayat-api container (every job + 3110). Build first (the new copies keep
  # serving meanwhile), then the worker (the one job runner) and the LB (it holds 3110) stop BEFORE the single
  # container starts, so jobs never run in two processes; the API copies stop after it (no jobs there).
  dc build
  stop ayat-worker ayat-lb
  dc up -d
  stop ayat-api-a ayat-api-b
  curl -fsS --retry 60 --retry-delay 2 --retry-all-errors http://127.0.0.1:3110/health
  echo
  docker image prune -f --filter "label=com.docker.compose.project=$PROJECT" >/dev/null
fi
echo "staging rolled back: $(dc ps --format '{{.Service}}={{.Status}}' | tr '\n' ' ')"

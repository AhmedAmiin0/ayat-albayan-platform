#!/usr/bin/env bash
# Redeploy staging (docs/09-deployment.md). Run from Git Bash at the repo root:  bash tools/scripts/deploy-staging.sh
# Needs: ssh alias "hostinger", the Supabase CLI login, and the git-ignored secrets in .claude/artifacts/staging/.
# Ships the committed HEAD only (git archive), never node_modules or .env files. Never touches /opt/wacrm.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ART="${ART:-$ROOT/.claude/artifacts/staging}"
SSH_HOST="${SSH_HOST:-hostinger}"
DEST=/opt/ayat-albayan-staging
REF=knxfwiimjcifwckhwbim
API_URL=https://api-staging.148-230-116-195.sslip.io

step() { printf '\n== %s\n' "$*"; }

step "1/5 database migrations -> $REF"
PW="$(sed -n 's/^db_password: //p' "$ART/supabase.md")"
(cd "$ROOT/packages/db" \
  && pnpm exec supabase link --project-ref "$REF" -p "$PW" >/dev/null \
  && pnpm exec supabase db push -p "$PW" --yes)

step "2/5 ship API source (HEAD $(git -C "$ROOT" rev-parse --short HEAD)) and rebuild the container"
ssh "$SSH_HOST" "test -f $DEST/.env || { echo 'missing $DEST/.env, see docs/09-deployment.md'; exit 1; }"
ssh "$SSH_HOST" "rm -rf $DEST/src.new && mkdir -p $DEST/src.new"
git -C "$ROOT" archive --format=tar HEAD | ssh "$SSH_HOST" "tar -x -C $DEST/src.new"
scp -q "$ROOT/deploy/staging/docker-compose.yml" "$SSH_HOST:$DEST/docker-compose.yml"
ssh "$SSH_HOST" "cd $DEST && rm -rf src.old && { [ ! -d src ] || mv src src.old; } && mv src.new src \
  && docker compose up -d --build && docker image prune -f >/dev/null"

step "3/5 web build against staging"
set -a; . "$ART/web.env"; set +a
pnpm --dir "$ROOT" --filter @ab/shared build >/dev/null
pnpm --dir "$ROOT" --filter web build

step "4/5 upload web (atomic swap)"
ssh "$SSH_HOST" "rm -rf $DEST/web.new && mkdir -p $DEST/web.new"
tar -C "$ROOT/apps/web/dist" -cf - . | ssh "$SSH_HOST" "tar -x -C $DEST/web.new \
  && rm -rf $DEST/web.old && { [ ! -d $DEST/web ] || mv $DEST/web $DEST/web.old; } && mv $DEST/web.new $DEST/web"

step "5/5 health check"
curl -fsS --retry 30 --retry-delay 5 --retry-all-errors "$API_URL/health" && echo && echo "staging is up"

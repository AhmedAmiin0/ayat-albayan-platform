#!/bin/sh
# Back to the previous STAGING version after a failed roll (docs/09 «Staging»), run by deploy-staging.yml inside the
# deploy lock (`sh roll.sh || { sh rollback.sh; exit 1; }`), or by hand: flock -n .deploy.lock sh rollback.sh.
# Puts back src.old and the previous docker-compose.yml and roll.sh (this file is never rewritten while it runs),
# then rolls them. Touches only this compose project (ayat-albayan-stg).
set -eu
cd "$(dirname "$0")"
[ -d src.old ] || { echo '::error::no src.old: nothing to roll back to'; exit 1; }
rm -rf src.bad && mv src src.bad && mv src.old src
for f in docker-compose.yml roll.sh; do [ ! -f "$f.old" ] || cat "$f.old" > "$f"; done
sh roll.sh

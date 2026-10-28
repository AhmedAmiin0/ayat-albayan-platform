#!/usr/bin/env bash
# Staging is deployed from GitHub only (docs/09-deployment.md «From GitHub»): Actions → deploy-staging → Run workflow
# (or a merge into develop). Since the two API copies + one worker layout, only that workflow swaps the code under
# the server's deploy lock (flock $DEST/.deploy.lock) and rolls back on a failed roll (deploy/staging/rollback.sh);
# a laptop deploy had neither, so this script refuses instead of racing it or leaving 127.0.0.1:3110 down.
# Touches nothing: no ssh, no database, no Docker.
set -euo pipefail

cat >&2 <<'MSG'
deploy-staging.sh no longer deploys. Use GitHub: Actions -> deploy-staging -> Run workflow (branch develop),
optionally with env_only (only the .env) or without migrate. See docs/09-deployment.md «From GitHub».
MSG
exit 1

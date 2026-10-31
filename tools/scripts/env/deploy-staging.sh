#!/usr/bin/env bash
# Production and staging are deployed from GitHub only (docs/09-deployment.md): Actions → deploy-production → Run
# workflow (production, by hand), and deploy-staging (staging, automatic after every green develop push, or by hand).
# Only those workflows swap the code under the server's deploy lock (flock $DEST/.deploy.lock) and roll back on a
# failed roll (deploy/staging/rollback.sh, deploy/stg/rollback.sh); a laptop deploy had neither, so this script
# refuses instead of racing them or leaving the API down.
# Touches nothing: no ssh, no database, no Docker.
set -euo pipefail

cat >&2 <<'MSG'
deploy-staging.sh no longer deploys. Use GitHub, branch develop: Actions -> deploy-production -> Run workflow
(production, optionally env_only or without migrate), or Actions -> deploy-staging (staging). See docs/09-deployment.md.
MSG
exit 1

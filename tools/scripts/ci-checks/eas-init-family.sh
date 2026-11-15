#!/usr/bin/env bash
# mobile.yml, app family (docs/50 §8): `eas init --force` in apps/family links the EAS project
# @holdmycup/ayat-albayan-family, or creates it on the first run. Its app.config.ts is dynamic, so
# eas init cannot write the id there: it prints it (and may exit non-zero). The one id it prints
# goes to FAMILY_EAS_PROJECT_ID for the next steps (app.config.ts reads it) and to the run summary
# (not a secret) for the owner to keep. Needs EXPO_TOKEN and EAS_CLI; run from apps/family.
set -euo pipefail
test -n "${EXPO_TOKEN:-}" || { echo "::error::add the secret EXPO_TOKEN to the environment mobile"; exit 1; }
log="$RUNNER_TEMP/eas-init.log"
rc=0
npx --yes "$EAS_CLI" init --non-interactive --force > "$log" 2>&1 || rc=$?
cat "$log"
uuid='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
ids=$(grep -oE "$uuid" "$log" | tr 'A-F' 'a-f' | sort -u || true)
if [ -z "$ids" ] || [ "$(wc -l <<< "$ids")" != 1 ]; then
  echo "::error::eas init (exit $rc) printed no single project id (${ids:-none}): see above"
  exit 1
fi
echo "FAMILY_EAS_PROJECT_ID=$ids" >> "$GITHUB_ENV"
{
  echo "### Family EAS project @holdmycup/ayat-albayan-family"
  echo "FAMILY_EAS_PROJECT_ID=\`$ids\` (eas init exit $rc). Keep it as docs/50 §8 says."
} >> "$GITHUB_STEP_SUMMARY"

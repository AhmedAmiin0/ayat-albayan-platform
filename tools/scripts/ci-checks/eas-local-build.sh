#!/usr/bin/env bash
# mobile.yml builder github: the Android build of eas.json profile PROFILE made on the GitHub runner
# (`eas build --local`) instead of Expo's servers. Credentials stay on EAS: the CLI downloads the
# remote keystore for the build, and remote versioning bumps versionCode as a cloud build does.
# The profile's EAS environment is pulled into a private file and loaded into this process only
# (never GITHUB_ENV, whose values the log shows); no value is printed. Run from the app folder.
# Needs EXPO_TOKEN, EAS_CLI, APP, PROFILE, RUN_NUMBER, RUNNER_TEMP, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY.
set -euo pipefail
test -n "${EXPO_TOKEN:-}" || { echo "::error::add the secret EXPO_TOKEN to the environment mobile"; exit 1; }
environment=$(jq -r --arg p "$PROFILE" '.build[$p].environment // empty' eas.json)
test -n "$environment" || { echo "::error::eas.json profile $PROFILE names no EAS environment"; exit 1; }
type=$(jq -r --arg p "$PROFILE" '.build[$p].android.buildType // "app-bundle"' eas.json)
ext=$([ "$type" = apk ] && echo apk || echo aab)

envdir="$RUNNER_TEMP/eas-env"
mkdir -p "$envdir" && chmod 700 "$envdir"
npx --yes "$EAS_CLI" env:pull --environment "$environment" --path "$envdir/.env" --non-interactive > /dev/null
names=()
# env:pull ends the file without a newline: `read` fails on that last line but still fills it.
while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
  name=${BASH_REMATCH[1]} value=${BASH_REMATCH[2]}
  value=${value#\"} value=${value%\"}
  # A file variable is pulled as a path to its contents: make it absolute for the build's own copy.
  [[ "$value" = /* || ! -f "$value" ]] || value="$PWD/$value"
  [ ${#value} -lt 6 ] || echo "::add-mask::$value"
  export "$name=$value"
  names+=("$name")
done < "$envdir/.env"
echo "EAS environment $environment loaded: ${names[*]:-no variable}"

# What the Google Play bundle must carry (docs/50 §8): the production API and the Firebase file.
if [ "$APP/$PROFILE" = family/production ]; then
  test "${EXPO_PUBLIC_API_URL:-}" = https://api.ayatalbayan.com \
    || { echo "::error::EXPO_PUBLIC_API_URL of EAS environment production is not the production API"; exit 1; }
  { test -s "${GOOGLE_SERVICES_JSON:-}" && jq -e .project_info.project_id "$GOOGLE_SERVICES_JSON" > /dev/null; } \
    || { echo "::error::GOOGLE_SERVICES_JSON was not pulled as a Firebase file: EAS environment production must hold it as a file variable with plain text or sensitive visibility"; exit 1; }
  echo "Checked: production API and the Firebase file from EAS environment production"
fi

out="$RUNNER_TEMP/$APP-$PROFILE.$ext"
npx --yes "$EAS_CLI" build --platform android --profile "$PROFILE" --local --non-interactive --output "$out"
test -s "$out" || { echo "::error::eas build --local wrote no $out"; exit 1; }
sum=$(sha256sum "$out" | cut -d' ' -f1)
{
  echo "file=$out"
  echo "sha256=$sum"
  echo "artifact=android-$APP-$PROFILE-$RUN_NUMBER"
} >> "$GITHUB_OUTPUT"
# The version the build took (remote versioning); a failed lookup must not stop the upload.
code=$({ npx --yes "$EAS_CLI" build:version:get --platform android --profile "$PROFILE" --json \
  --non-interactive | jq -r '.versionCode // empty'; } 2> /dev/null || true)
{
  echo "### Android $ext built on the GitHub runner ($APP, profile $PROFILE)"
  echo "- artifact \`android-$APP-$PROFILE-$RUN_NUMBER\` (kept 30 days), file \`$(basename "$out")\`"
  echo "- sha256 \`$sum\`"
  echo "- versionCode \`${code:-unknown}\` (EAS remote versioning)"
} >> "$GITHUB_STEP_SUMMARY"

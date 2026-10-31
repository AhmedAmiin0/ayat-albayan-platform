#!/bin/sh
# The host Caddy's two STAGING site blocks (docs/09 «Staging»), run as root by deploy-staging.yml (ssh target "sh -s").
# Idempotent: both hosts already in the Caddyfile = nothing to do; only one = stop (fix by hand). Otherwise: back up
# the Caddyfile, APPEND the two blocks (an existing block, the CRM's crm.ayatalbayan.com or production's, is never
# edited, moved or reordered), caddy validate, and only then reload. An invalid file or a refused reload puts the
# backup back and fails; Caddy keeps serving its loaded config throughout.
set -eu
F="${CADDYFILE:-/etc/caddy/Caddyfile}"
APP=staging-app.ayatalbayan.com
API=staging-api.ayatalbayan.com

app=0
api=0
if grep -qF "$APP" "$F"; then app=1; fi
if grep -qF "$API" "$F"; then api=1; fi
if [ "$app$api" = 11 ]; then echo "host Caddy: the staging blocks are there"; exit 0; fi
if [ "$app$api" != 00 ]; then echo "::error::$F names only one of $APP / $API: fix it by hand"; exit 1; fi

B="$F.bak-$(date +%F-%H%M%S)"
cp -p "$F" "$B"
cat >> "$F" <<BLOCKS

# Staging (appended by deploy/stg/caddy-sites.sh): the web build and the API on 127.0.0.1:3120.
$APP {
	root * /opt/ayat-albayan-stg/web
	encode zstd gzip
	try_files {path} /index.html
	file_server
}

$API {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3120
}
BLOCKS

restore() {
  cat "$B" > "$F"
  echo "::error::$1: $F restored from $B"
  exit 1
}
caddy validate --config "$F" --adapter caddyfile || restore 'caddy validate refused the staging blocks'
systemctl reload caddy || restore 'caddy refused the reload'
echo "host Caddy: staging blocks added (backup $B)"

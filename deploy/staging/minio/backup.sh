#!/bin/sh
# Daily copy of the API's MinIO buckets to a host folder (docs/45-minio-storage.md «Backups»). Host cron, as root:
#   30 2 * * * sh /opt/ayat-albayan-staging/src/deploy/staging/minio/backup.sh >> /var/log/ayat-minio-backup.log 2>&1
# A one-shot minio/mc container on this project's network, with the app's read/list keys from .env (never root).
# Adds and updates files, never deletes one: a file removed in MinIO stays here until pruned by hand.
# Touches only this compose project: never another container, the host Caddy or /opt/wacrm.
set -eu
DIR=/opt/ayat-albayan-staging
DEST="${1:-/var/backups/ayat-minio}"
NETWORK=ayat-albayan-staging_default
# The init container's image, as pinned in docker-compose.yml (compose-minio.test.mjs keeps them equal).
MC_IMAGE=minio/mc:RELEASE.2025-04-16T18-13-26Z
BUCKETS="reports report-attachments receipts invoices wa-media recordings avatars"

# One value of .env (the last line for that key), without sourcing the whole file.
val() { sed -n "s/^$1=//p" "$DIR/.env" | tail -n 1; }
MINIO_APP_ACCESS_KEY=$(val MINIO_APP_ACCESS_KEY)
MINIO_APP_SECRET_KEY=$(val MINIO_APP_SECRET_KEY)
PREFIX=$(val MINIO_BUCKET_PREFIX)
[ -n "$MINIO_APP_ACCESS_KEY" ] && [ -n "$MINIO_APP_SECRET_KEY" ] || {
  echo "no MINIO_APP_ACCESS_KEY / MINIO_APP_SECRET_KEY in $DIR/.env"
  exit 1
}
export MINIO_APP_ACCESS_KEY MINIO_APP_SECRET_KEY PREFIX BUCKETS
mkdir -p "$DEST"
chmod 700 "$DEST"

echo "$(date -u +%FT%TZ) backup to $DEST"
# The keys go in by name (-e KEY), so they never show in the host's process list.
docker run --rm --network "$NETWORK" --memory 128m \
  -e MINIO_APP_ACCESS_KEY -e MINIO_APP_SECRET_KEY -e PREFIX -e BUCKETS \
  -v "$DEST:/backup" --entrypoint /bin/sh "$MC_IMAGE" -c '
    set -eu
    mc alias set --api S3v4 ayat http://ayat-minio:9000 "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY" >/dev/null
    for b in $BUCKETS; do mc mirror --overwrite "ayat/$PREFIX$b" "/backup/$PREFIX$b"; done'
echo "$(date -u +%FT%TZ) done: $(du -sh "$DEST" | cut -f1)"

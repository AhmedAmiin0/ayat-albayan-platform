#!/bin/sh
# Moves the old Supabase files to MinIO so they are SERVED from MinIO (docs/45 §6). Run on the VPS
# in /opt/ayat-albayan-staging, only with STORAGE_DRIVER=minio and «اختبار الاتصال» passing.
#   sh src/tools/scripts/storage/move-to-minio.sh                           dry run (writes nothing)
#   sh src/tools/scripts/storage/move-to-minio.sh --apply --table payments  one table
#   flags: --limit N, --after <row id> (with --table), --batch N, --pause-ms N, --max-mb N
# Copies, verifies, then rewrites each row to «minio:<key>». Never deletes from Supabase.
set -eu
exec docker compose -p ayat-albayan-staging exec -T ayat-worker node dist/scripts/storage-move.js "$@"

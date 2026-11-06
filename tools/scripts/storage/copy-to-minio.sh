#!/bin/sh
# The later bulk copy of the old Supabase files into MinIO (docs/45 «Bulk copy»). Run on the VPS in
# /opt/ayat-albayan-staging once MinIO runs and «التكاملات» › «التخزين» passed «اختبار الاتصال».
#   sh src/tools/scripts/storage/copy-to-minio.sh           dry-run: counts per bucket, copies nothing
#   sh src/tools/scripts/storage/copy-to-minio.sh --apply   copies what MinIO lacks (re-runnable)
# Objects only: the stored paths keep pointing at Supabase (still read there) until a later change.
set -eu
case "${1:-}" in
  "" | --apply) ;;
  *) echo "usage: $0 [--apply]" >&2; exit 2 ;;
esac
exec docker compose -p ayat-albayan-staging exec -T ayat-worker node dist/scripts/storage-copy.js ${1:-}

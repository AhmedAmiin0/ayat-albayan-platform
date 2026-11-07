#!/bin/sh
# ayat-minio-init (docs/45-minio-storage.md): the API's private buckets, its own MinIO user and the policy that
# limits that user to them. Runs in a one-shot container of the pinned MinIO image (it ships mc) on every deploy: each step is idempotent.
# Credentials come from minio.env (the service's env_file, root only), never from this file or the app's .env.
set -eu
MINIO_ROOT_USER="${MINIO_ROOT_USER:-}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-}"
MINIO_APP_ACCESS_KEY="${MINIO_APP_ACCESS_KEY:-}"
MINIO_APP_SECRET_KEY="${MINIO_APP_SECRET_KEY:-}"

BUCKETS="reports report-attachments receipts invoices wa-media recordings avatars"
PREFIX="${MINIO_BUCKET_PREFIX:-}"
POLICY=ayat-app
ALIAS=ayat

fail() {
  echo "ayat-minio-init: $*" >&2
  exit 1
}

# Too short or missing = refuse: never a weak or default credential.
[ "${#MINIO_ROOT_USER}" -ge 3 ] || fail 'MINIO_ROOT_USER missing in minio.env'
[ "${#MINIO_ROOT_PASSWORD}" -ge 16 ] || fail 'MINIO_ROOT_PASSWORD missing or under 16 characters in minio.env'
[ "${#MINIO_APP_ACCESS_KEY}" -ge 3 ] || fail 'MINIO_APP_ACCESS_KEY missing in minio.env'
# MinIO caps a user's secret at 40 characters.
[ "${#MINIO_APP_SECRET_KEY}" -ge 16 ] && [ "${#MINIO_APP_SECRET_KEY}" -le 40 ] ||
  fail 'MINIO_APP_SECRET_KEY must be 16 to 40 characters'
[ "$MINIO_APP_ACCESS_KEY" != "$MINIO_ROOT_USER" ] || fail 'the app key must not be the root user'
# They go into a URL (MC_HOST_*): letters, digits and . _ ~ - only (openssl rand -hex makes such values).
for v in "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY"; do
  case "$v" in *[!A-Za-z0-9._~-]*) fail 'minio.env values may hold only A-Z a-z 0-9 . _ ~ -' ;; esac
done

# The root alias from the environment, never on mc's command line (no process listing shows the password).
# ayat-minio may still be starting: wait for it (up to 2 minutes).
export "MC_HOST_$ALIAS=http://$MINIO_ROOT_USER:$MINIO_ROOT_PASSWORD@ayat-minio:9000"
i=0
until mc admin info "$ALIAS" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -lt 60 ] || fail 'ayat-minio is not answering (docker compose logs ayat-minio)'
  sleep 2
done

# Private buckets: no anonymous access; every read and write is a signed request.
for b in $BUCKETS; do
  mc mb --ignore-existing "$ALIAS/$PREFIX$b"
  mc anonymous set none "$ALIAS/$PREFIX$b" >/dev/null
done

# The app's user may read, write, delete and list objects in these buckets only: no bucket, user or admin call.
buckets=""
objects=""
for b in $BUCKETS; do
  buckets="$buckets\"arn:aws:s3:::$PREFIX$b\","
  objects="$objects\"arn:aws:s3:::$PREFIX$b/*\","
done
cat > /tmp/ayat-app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": [${buckets%,}]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [${objects%,}]
    }
  ]
}
EOF
# create replaces a policy of the same name; user add sets the secret again (a rotated one included).
mc admin policy create "$ALIAS" "$POLICY" /tmp/ayat-app-policy.json >/dev/null
# The one secret on a command line: mc has no other way to set a user's secret (inside this one-shot only).
mc admin user add "$ALIAS" "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY" >/dev/null
out=$(mc admin policy attach "$ALIAS" "$POLICY" --user "$MINIO_APP_ACCESS_KEY" 2>&1) ||
  echo "$out" | grep -qi 'already in effect' || fail "$out"
echo "ayat-minio-init: buckets ($PREFIX*) private, app user on policy $POLICY"

# 45 — MinIO object storage

Owner 2026-11-06: MinIO keeps every **new** file. Old files stay in Supabase Storage and keep working. Nothing
moves at merge: the MinIO containers start only once the owner prepares `.env` (§4), and the API writes to MinIO
only once an admin switches `STORAGE_DRIVER` in «التكاملات» › «التخزين».

## 1. Design

- **One port, two adapters.** The API's storage port has a Supabase Storage adapter (as before) and a MinIO adapter
  (S3 API, path-style buckets). The API's buckets, all **private**: `reports`, `report-attachments`, `receipts`,
  `invoices`, `wa-media`, `recordings`, `avatars` (each with the optional `MINIO_BUCKET_PREFIX` in front).
- **Marker in the stored path** (`packages/shared/src/reports/stored-path.ts`): a path the database keeps as
  `minio:<key>` lives in MinIO; a path with no marker lives in Supabase (every row written before the switch).
- **Routing.** Writes go where `STORAGE_DRIVER` says (`supabase` default, `minio` = the cut-over) and store the
  matching path. Reads, signed URLs and deletes follow each path's marker, whatever the driver is now: switching the
  driver never breaks an old link, in either direction.
- **Two URLs.** The API talks to MinIO on the project network (`MINIO_ENDPOINT`, `http://ayat-minio:9000`).
  Anything that leaves the server (signed GET/PUT URLs for the web and mobile apps, report PDFs WhatsApp fetches)
  is signed for `MINIO_PUBLIC_URL` (`https://files.ayatalbayan.com`): host Caddy (TLS) → `127.0.0.1:3110` →
  `ayat-lb` → `ayat-minio:9000`. Both Caddies pass the `Host` header unchanged, which is what MinIO checks the
  SigV4 signature against; signing needs no network call. The web and mobile apps upload to the signed slot by its
  marker (`minio:` → a `PUT` to the signed URL, anything else → Supabase as before).
- **Limits.** MinIO has no per-bucket size or type limit: when the API checks a client-uploaded object (`exists`), the
  MinIO adapter applies the Supabase bucket's own size cap and MIME list (`store/bucket-rules.ts`), so an oversize
  or wrong-type upload is refused at registration as before. `ayat-lb` sets no body limit of its own.
- **Failure** is an error the caller sees, never a silent fallback to the other store.
- **Health.** `/health` stays 200 and reports `storage: { driver: supabase | minio, status: ok | down }` (a
  list under an unused prefix in the active store, cached 30 s).
  «اختبار الاتصال» in «التخزين» puts, reads and deletes a probe object under `_probe/` in the reports bucket.

## 2. Config keys («التكاملات» › «التخزين»; database + Vault, `.env` only bootstraps)

| Key | Value on production | Notes |
|---|---|---|
| `STORAGE_DRIVER` | `supabase` → `minio` | where new files go; switching it is the cut-over |
| `MINIO_ENDPOINT` | `http://ayat-minio:9000` | internal; the API's own reads and writes |
| `MINIO_PUBLIC_URL` | `https://files.ayatalbayan.com` | host of every signed URL (https only, except localhost) |
| `MINIO_REGION` | `us-east-1` | MinIO's default |
| `MINIO_BUCKET_PREFIX` | empty | if set, the same value in `.env` (§4, `ayat-minio-init` creates the buckets) |
| `MINIO_ACCESS_KEY` | `.env` `MINIO_APP_ACCESS_KEY` | the app user, never the root user |
| `MINIO_SECRET_KEY` | `.env` `MINIO_APP_SECRET_KEY` | Vault secret |

## 3. What runs (`deploy/staging/`)

- **`ayat-minio`** (`minio/minio:RELEASE.2025-04-22T22-12-26Z`, profile `minio`): `server /data` on the named
  volume `minio-data`, no published port, console off (`MINIO_BROWSER=off`), 512 MB, healthcheck `mc ready local`,
  rotated logs. No `env_file`: only `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, interpolated from `.env`. It refuses
  to start (exit 1, the reason in its log) when the user is under 3 or the password under 16 characters, so it
  never runs on MinIO's default credentials.
- **`ayat-minio-init`** (`minio/mc:RELEASE.2025-04-16T18-13-26Z`, profile `minio`, one shot, 64 MB): runs
  `deploy/staging/minio/init.sh` from the shipped checkout (`src/`). It waits up to 2 minutes for MinIO, creates
  each bucket (`mc mb --ignore-existing`), makes it private (`mc anonymous set none`), writes the policy `ayat-app`
  (`s3:GetObject`, `PutObject`, `DeleteObject` on objects, `ListBucket`, `GetBucketLocation` on the buckets, nothing
  else) and creates the app user `MINIO_APP_ACCESS_KEY` with it. Every step is idempotent: `roll.sh`'s last
  `up -d` starts it again on every deploy. It depends on `ayat-minio` *started*, not *healthy*, so a MinIO that
  will not start never fails the API's deploy (the init then fails on its own, in its log).
- **`ayat-lb`** (`lb/Caddyfile`): a site `http://files.ayatalbayan.com:8080` → `ayat-minio:9000`, after the API's
  `:8080` site (every other host still reaches the API). `/minio/*` except `/minio/health/*` answers 404 (MinIO's
  admin and metrics routes stay on the project network). Response headers: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; img-src 'self' data:; media-src
  'self'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'`. **No `sandbox`**: Chrome refuses to
  show a PDF in a sandboxed page and the report links open PDFs; `default-src 'none'` already blocks every script.
  Caddy resolves upstreams per request, so without the profile the LB starts and this host answers 502.
- **CORS:** MinIO answers preflights for any origin by default (the web's direct `PUT`); the signature is the gate.

## 4. Turning it on (owner, on the VPS)

1. **DNS:** nothing to add. The wildcard `*.ayatalbayan.com` → the VPS already covers `files.ayatalbayan.com`
   (check: `dig +short files.ayatalbayan.com` shows the VPS address).
2. **Deploy this change** (merge → `deploy-staging`). The compose file, `lb/Caddyfile` and
   `src/deploy/staging/minio/` reach the server; nothing new starts (the profile is off).
3. **Add the keys to `/opt/ayat-albayan-staging/.env`** (generated on the server, never pasted anywhere else):
   ```bash
   cd /opt/ayat-albayan-staging
   grep -E '^(COMPOSE_PROFILES|MINIO_)' .env    # must print nothing; else edit those lines instead
   cp .env .env.bak-$(date +%F-%H%M%S)
   umask 077
   {
     echo 'COMPOSE_PROFILES=minio'
     echo 'MINIO_ROOT_USER=ayat-root'
     echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)"
     echo 'MINIO_APP_ACCESS_KEY=ayat-app'
     echo "MINIO_APP_SECRET_KEY=$(openssl rand -hex 20)"
   } >> .env
   ```
   The app secret is 40 hex characters: MinIO caps a user's secret at 40, and `init.sh` refuses one outside 16–40.
   `.env` is also the app's `env_file`: the API containers see these lines after their next recreate (harmless; the
   API reads its MinIO settings from «التكاملات»). Keep `COMPOSE_PROFILES=minio` from now on: it is what makes
   `roll.sh` keep the two services.
4. **Start them:** `docker compose -p ayat-albayan-staging up -d ayat-minio ayat-minio-init`
5. **Check the logs:**
   ```bash
   docker compose -p ayat-albayan-staging ps -a ayat-minio ayat-minio-init  # ayat-minio healthy, init Exited (0)
   docker compose -p ayat-albayan-staging logs ayat-minio-init  # ends «ayat-minio-init: buckets (*) private, …»
   docker compose -p ayat-albayan-staging logs --tail 50 ayat-minio
   curl -sI -H 'Host: files.ayatalbayan.com' http://127.0.0.1:3110/minio/health/live   # HTTP/1.1 200
   ```
6. **Host Caddy:** back up, add the site, validate, reload (the host Caddy keeps the `Host` header by default):
   ```bash
   cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F-%H%M%S)
   printf '\nfiles.ayatalbayan.com {\n\treverse_proxy 127.0.0.1:3110\n}\n' >> /etc/caddy/Caddyfile
   caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
   ```
7. **Verify from outside:** `curl -I https://files.ayatalbayan.com/minio/health/live` → `200`, with
   `x-content-type-options: nosniff` (the certificate is issued on the first request).
8. **«التكاملات» › «التخزين»** in /admin: `MINIO_ENDPOINT=http://ayat-minio:9000`,
   `MINIO_PUBLIC_URL=https://files.ayatalbayan.com`, `MINIO_REGION=us-east-1`, `MINIO_ACCESS_KEY` = the
   `MINIO_APP_ACCESS_KEY` value, `MINIO_SECRET_KEY` = the `MINIO_APP_SECRET_KEY` value
   (`grep ^MINIO_APP_ .env`). Save, then press **«اختبار الاتصال»**: it must pass.
9. **Cut over:** set `STORAGE_DRIVER` to `minio` and save. Check: `/health` shows `storage.status: ok`; submit a lesson
   report and open its PDF link (it is a `https://files.ayatalbayan.com/…` URL and shows inline in Chrome); upload a
   receipt from the web and from the phone.
10. **Rollback:** set `STORAGE_DRIVER` back to `supabase`. New files go to Supabase again; files written to MinIO
    meanwhile keep their `minio:` paths and stay readable **as long as `ayat-minio` runs**, so never stop it while
    such rows exist.

## 5. Backups

Daily copy of every bucket to `/var/backups/ayat-minio` with `deploy/staging/minio/backup.sh`: a one-shot
`minio/mc` container (the init's pinned image) on the project network, with the app user's keys from `.env` (read
and list is all it needs; never root). Host crontab (`crontab -e` as root):

```cron
30 2 * * * sh /opt/ayat-albayan-staging/src/deploy/staging/minio/backup.sh >> /var/log/ayat-minio-backup.log 2>&1
```

`mc mirror --overwrite` adds new and changed files and never deletes: a file removed in MinIO stays in the backup,
so an accidental delete can be restored. Retention: nothing is pruned automatically; the reports and receipts are
write-once and small. When the folder grows, delete old per-bucket files by hand or empty the folder and let the
next run copy everything again. The backup sits on the same disk: copy it off the server too (e.g. `rsync` of the
folder to another machine) for a disk failure. Restore: the same container with the root keys,
`mc mirror /backup/<bucket> ayat/<bucket>`.

Alternative, sparingly (a raw copy of MinIO's own format, only consistent with `ayat-minio` stopped):

```bash
docker run --rm -v ayat-albayan-staging_minio-data:/data:ro -v /var/backups:/backup busybox:1.37 \
  tar czf /backup/minio-data-$(date +%F).tgz -C /data .
```

## 6. Later: copy the old files

`tools/scripts/storage/copy-to-minio.sh` wraps
`docker compose -p ayat-albayan-staging exec ayat-worker node dist/scripts/storage-copy.js`: a dry run by default
(what would be copied), `--apply` to copy. Idempotent: safe to run again. It copies objects
only: the stored paths keep pointing at Supabase until a later change rewrites them, so it can run at any time,
and again.

## 7. Disk, memory, operations

- **Memory:** 512 MB for MinIO (`GOMEMLIMIT=400MiB` keeps Go's heap under it; idle use is far less) + 64 MB for
  the one-shot init: the compose sum goes from 2336 to 2912 MB, inside the ~4.6 GB the VPS has free.
- **Disk:** the volume `ayat-albayan-staging_minio-data` (under `/var/lib/docker/volumes/`) has no quota; ~62 GB
  are free. Each file is capped by the API, and the backup doubles the use. Watch it:
  `du -sh /var/lib/docker/volumes/ayat-albayan-staging_minio-data /var/backups/ayat-minio`.
- **Upgrade:** change both tags in `docker-compose.yml` (and `MC_IMAGE` in `backup.sh`; `compose-minio.test.mjs`
  keeps them equal) to real `RELEASE.*` tags, deploy, then
  `docker compose -p ayat-albayan-staging up -d ayat-minio ayat-minio-init` by hand: `roll.sh` ends with
  `up -d --no-recreate`, which never recreates a running MinIO.
- **New app secret:** a new `MINIO_APP_SECRET_KEY` in `.env`,
  `docker compose -p ayat-albayan-staging up -d ayat-minio-init`, then the new value in «التكاملات» right away
  (the old one stops working when the init runs). Do not change the root credentials casually.
- **A failed first deploy:** the rollback restores a compose file without these services and removes `ayat-minio`
  as an orphan (the volume stays); after the fix, run step 4 again.

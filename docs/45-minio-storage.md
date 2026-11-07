# 45 — MinIO object storage

Owner 2026-11-06: MinIO keeps every **new** file. Old files stay in Supabase Storage and keep working. Nothing
moves at merge: the MinIO containers start only once the owner prepares `.env` and `minio.env` (§4), and the API writes to MinIO
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
  or wrong-type upload is refused at registration as before. `ayat-lb` adds an outer wall of 64 MB per request
  (the largest bucket cap is 25 MiB; LiveKit's recording uploads go up in multipart parts well under it).
- **Client upload slots** (MinIO) are signed `PUT` URLs valid for **15 minutes**, with `If-None-Match: *`: one
  upload per key, so an object the API has already checked can never be overwritten through the same slot. The
  slot also signs the file the app declared at `…/upload-url` (each route's zod schema caps it): `Content-Length`
  = its size and `Content-Type` = its mime, both checked by MinIO, so a slot can never take a bigger or other file
  (the disk is shared with the CRM). A slot outside the bucket's own cap or type list (`store/bucket-rules.ts`) is
  never signed. The Supabase path is unchanged (its buckets enforce their own limits).
- **Old clients.** The API signs a MinIO slot only for a client that sends `X-AB-Upload: slot-v2` (client-core's
  API client, from this change on); any other caller (an older OTA bundle on APK 0.4.x, a web tab opened before the
  deploy) still gets a Supabase slot it knows how to fill, and the stored path says where the file is.
- **Failure** is an error the caller sees, never a silent fallback to the other store.
- **Health.** `/health` stays 200 and reports `storage: { driver: supabase | minio, status: ok | down }` (a
  list under an unused prefix in the active store, cached 30 s). It answers within ~1.5 s even when the storage
  hangs (the probe is time-boxed; a hung store reads `down`).
- **Recordings** have their **own switch**, `MINIO_RECORDINGS` (default off): `STORAGE_DRIVER=minio` alone never
  starts recording onto the shared disk. With both on, LiveKit egress uploads every lesson and meeting recording to
  `MINIO_PUBLIC_URL` with the app user's key in the egress request; recordings are **not capped** (§7). Off: they
  go to `RECORDING_S3_*` (Supabase) as before, or nothing is recorded when that is not set. A dedicated put-only
  user for recordings is a later hardening.
- **Deletes.** A delete follows the path's marker; for a Supabase path it also removes the same key in MinIO when
  MinIO is configured (best effort, never failing the delete), so a file the bulk copy (§6) duplicated never
  outlives its row.
- **Old reports re-rendered** after the cut-over get a new MinIO copy; their old Supabase copy stays in place
  (cleaning those up is a later step).
- «اختبار الاتصال» in «التخزين» puts, reads and deletes a probe object under `_probe/` in the reports bucket
  through `MINIO_ENDPOINT`, then does what the apps do through `MINIO_PUBLIC_URL`: a `PUT` to a signed slot
  (`If-None-Match: *`) and a signed `GET` of it, then deletes it. A wrong public address or Caddy site fails it
  with «storage_public_failed». `/health` only asks the internal endpoint (every 30 s; it never writes).

## 2. Config keys («التكاملات» › «التخزين»; database + Vault, `.env` only bootstraps)

| Key | Value on production | Notes |
|---|---|---|
| `STORAGE_DRIVER` | `supabase` → `minio` | where new files go; switching it is the cut-over |
| `MINIO_ENDPOINT` | `http://ayat-minio:9000` | internal; the API's own reads and writes |
| `MINIO_PUBLIC_URL` | `https://files.ayatalbayan.com` | host of every signed URL (https only, except localhost) |
| `MINIO_REGION` | `us-east-1` | MinIO's default |
| `MINIO_BUCKET_PREFIX` | empty | if set, the same value in `.env` (§4, `ayat-minio-init` creates the buckets) |
| `MINIO_ACCESS_KEY` | `minio.env` `MINIO_APP_ACCESS_KEY` | the app user, never the root user |
| `MINIO_SECRET_KEY` | `minio.env` `MINIO_APP_SECRET_KEY` | Vault secret |
| `MINIO_RECORDINGS` | `false` | recordings into MinIO (with the driver on `minio`); uncapped, §7 |

`MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` refuse an IP literal (the Evolution base's SSRF rules): `http://` only
to `localhost` or the listed docker service `ayat-minio`, `https://` only to a public host name.

**Never change these once `minio:` rows exist.** A stored path records neither the bucket prefix, the endpoint
nor the server: changing `MINIO_BUCKET_PREFIX`, or pointing `MINIO_ENDPOINT` / the keys at another MinIO, orphans
every `minio:` file already stored, and clearing the MinIO config while such rows exist makes them unreadable.
Never save `STORAGE_DRIVER=minio` before «اختبار الاتصال» passes: every write would fail with
`storage_not_configured`.

## 3. What runs (`deploy/staging/`)

- **Image (owner 2026-11-07):** MinIO stopped publishing images (Docker Hub `minio/minio` and `minio/mc` deleted
  in 2026-09, the community edition is source-only). Every MinIO container uses Chainguard's rebuild from source,
  `cgr.dev/chainguard/minio@sha256:…`, pinned by digest (its free tier tags only `:latest`). It ships `mc` and a
  shell, runs as uid 65532, so the server, the init and the backup all use this one image.
- **`ayat-minio`** (the pinned Chainguard image, profile `minio`): `server /data` on the named
  volume `minio-data`, no published port, console off (`MINIO_BROWSER=off`), 512 MB, healthcheck `mc ready local`,
  rotated logs. Its keys come from `/opt/ayat-albayan-staging/minio.env` (`env_file`, `required: false` so the compose
  file parses without it), **never** from `.env`, the app's `env_file`: no API container sees MinIO's root password
  (`compose-minio.test.mjs` guards it). It refuses
  to start (exit 1, the reason in its log) when the user is under 3 or the password under 16 characters, so it
  never runs on MinIO's default credentials.
- **`ayat-minio-init`** (the same pinned image, profile `minio`, one shot, 64 MB): runs
  `deploy/staging/minio/init.sh` from the shipped checkout (`src/`). It waits up to 2 minutes for MinIO, creates
  each bucket (`mc mb --ignore-existing`), makes it private (`mc anonymous set none`), writes the policy `ayat-app`
  (`s3:GetObject`, `PutObject`, `DeleteObject` on objects, `ListBucket`, `GetBucketLocation` on the buckets, nothing
  else) and creates the app user `MINIO_APP_ACCESS_KEY` with it. The root credentials reach `mc` through the
  `MC_HOST_ayat` environment variable, not its command line; `mc admin user add` has no such alternative, so the
  app secret is a command-line argument inside that one-shot container only. All four values must be URL-safe
  (`A-Z a-z 0-9 . _ ~ -`, hence `openssl rand -hex`); `init.sh` refuses others. Every step is idempotent: `roll.sh`'s last
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
3. **Write `/opt/ayat-albayan-staging/minio.env`** (the keys, generated on the server, never pasted anywhere else).
   `.env` is **not** touched yet:
   ```bash
   cd /opt/ayat-albayan-staging
   test ! -e minio.env && ! grep -q '^COMPOSE_PROFILES=' .env && echo ok   # must print ok
   umask 077
   {
     echo 'MINIO_ROOT_USER=ayat-root'
     echo "MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)"
     echo 'MINIO_APP_ACCESS_KEY=ayat-app'
     echo "MINIO_APP_SECRET_KEY=$(openssl rand -hex 20)"
   } > minio.env
   chmod 600 minio.env
   ```
   Hex, not base64: the values go into a URL (`MC_HOST_*`), and MinIO caps a user's secret at 40 characters
   (`init.sh` refuses one outside 16–40). `minio.env` is read only by `ayat-minio` and `ayat-minio-init`; the
   deploy never writes it.
4. **Start them with the profile on the command line only:**
   `docker compose -p ayat-albayan-staging --profile minio up -d ayat-minio ayat-minio-init`
   (`env_file` with `required: false` needs Docker Compose 2.24 or newer: `docker compose version`). This pulls
   both images and starts them; every deploy still runs without the profile.
5. **Check the logs, then switch the profile on:**
   ```bash
   P='docker compose -p ayat-albayan-staging --profile minio'
   $P ps -a ayat-minio ayat-minio-init  # ayat-minio healthy, init Exited (0)
   $P logs ayat-minio-init  # ends «ayat-minio-init: buckets (*) private, …»
   $P logs --tail 50 ayat-minio
   curl -sI -H 'Host: files.ayatalbayan.com' http://127.0.0.1:3110/minio/health/live   # HTTP/1.1 200
   ```
   **Only once every check above passes**, keep the profile for the deploys:
   ```bash
   cp .env .env.bak-$(date +%F-%H%M%S)
   echo 'COMPOSE_PROFILES=minio' >> .env
   ```
   Keep `COMPOSE_PROFILES=minio` in `.env` from now on: it is what makes `roll.sh` keep the two services. Never
   add it before: with the profile in `.env`, every deploy and its rollback start MinIO, so a MinIO that cannot be
   pulled or started would fail them all. If a check fails, stop here (`$P stop ayat-minio`), fix, and run 4 again.
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
   (`cat minio.env`). Save, then press **«اختبار الاتصال»**: it must pass before the next step.
9. **Cut over.** Preconditions, every one checked first:
   - **Backups:** the cron line of §5 is installed (`crontab -l`), one `backup.sh` run succeeded (run it by hand
     once; `/var/log/ayat-minio-backup.log` ends without an error and `/var/backups/ayat-minio` has the buckets),
     and the off-host copy of that folder is scheduled.
   - **Phones:** every staff phone runs **APK 0.5.0** with the OTA of this change (the phones restarted onto it),
     and open web tabs are reloaded. An older client still gets Supabase slots (`X-AB-Upload`, §1) so it keeps
     working, but only the new ones write to MinIO.
   - «اختبار الاتصال» passes (step 8), internal and public.

   Then set `STORAGE_DRIVER` to `minio` and save; leave `MINIO_RECORDINGS` off unless recordings are wanted on
   this disk (§1, §7). Check: `/health` shows `storage.status: ok`; submit a lesson report and open its PDF link (it
   is a `https://files.ayatalbayan.com/…` URL and shows inline in Chrome); upload a receipt from the web and from
   the phone.
10. **Rollback: only through `STORAGE_DRIVER`.** Set it back to `supabase`: new files go to Supabase again; files
    written to MinIO meanwhile keep their `minio:` paths and stay readable **as long as `ayat-minio` runs**, so
    never stop it while such rows exist. Once any `minio:` row exists, **never** revert the code of this feature
    (PR #666 and its follow-ups), its compose services or its Caddy sites (`lb/Caddyfile`, the host Caddy's
    `files.ayatalbayan.com`), and never remove `COMPOSE_PROFILES=minio`: each of them makes every `minio:` file
    unreadable (reports, receipts, photos). A code rollback of a later release is fine: it keeps this layer.

## 5. Backups

Daily copy of every bucket to `/var/backups/ayat-minio` with `deploy/staging/minio/backup.sh`: a one-shot
container of the pinned MinIO image (it ships `mc`; run as uid 0 only to write the root-only folder) on the project network, with the app user's keys from `minio.env` (read
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

## 6. Moving the old files (served from MinIO)

Owner 2026-11-07: «move all the old files in minio to be served». `tools/scripts/storage/move-to-minio.sh` wraps
`docker compose -p ayat-albayan-staging exec -T ayat-worker node dist/scripts/storage-move.js` (code:
`apps/api/src/scripts/storage-move/`). For every row whose path has no marker, one at a time, by id:

1. the object is read from Supabase (a missing one is **reported**, never invented; one over `--max-mb`, default 64,
   is left alone and reported as `too_large`);
2. it is put into MinIO under the **same key** with its Content-Type, `If-None-Match: *` (the storage-copy code: an
   object MinIO already holds is never overwritten);
3. it is **verified**: size and Content-Type as both stores report them, and a SHA-256 of the bytes read back from
   MinIO against the bytes read from Supabase. Any difference = `mismatch`, the row is not touched;
4. the row is rewritten to `minio:<key>` with a **compare-and-set** on the old path (`… where id = $id and col =
   $old`): a row that changed meanwhile (a re-render, an edit, a delete) is left as it is (`changed`);
5. one `audit_log` row per batch (`entity = storage_move`, `before.rows` = each rewritten row id and its old path).

Rows already `minio:` are skipped; a second run does nothing new. **Nothing is ever deleted from Supabase**: links
already sent (WhatsApp report PDFs, 7 days) keep working, and so do queued sends that carry an old path.

**The columns** (`storage-move/columns.ts`; `columns.test.ts` fails when a migration adds a `*_path` column that is
in neither list): `lesson_reports.pdf_path` (reports), `report_attachments.storage_path` (report-attachments),
`payments.receipt_path`, `payment_attachments.path`, `expenses.receipt_path`, `teacher_payments.receipt_path`,
`teacher_payouts.receipt_path`, `assistant_statements.receipt_path` (receipts), `invoices.storage_path` (invoices),
`saved_replies.attachment_path`, `messages.media_path` (wa-media), `profiles.avatar_path`, `teachers.avatar_path`
(avatars), and `lesson_recordings.file_path` (recordings) **only when named** with `--table lesson_recordings`
(big files on the shared disk, §7). Not moved: `import_items.target_path` (the import tool's bookkeeping),
`messages.template_params.document.path` (a queued send's PDF, still served from Supabase), the audit history,
and the chat PDF page previews (no column; rendered again on demand).

**Procedure** (owner, on the VPS, after the cut-over of §4 step 9 and a backup run of §5):

1. **Dry run** (the default; writes nothing): `sh src/tools/scripts/storage/move-to-minio.sh`. It refuses to run
   unless `STORAGE_DRIVER` is `minio` and «اختبار الاتصال» passes; it prints, per column, `inMinio` (already moved),
   `toMove`, and a sample of rows checked in both stores (`inSupabase: false` = a missing object).
2. **One table:** `sh src/tools/scripts/storage/move-to-minio.sh --apply --table teachers` (small: a few photos).
   The JSON summary gives `copied`, `rewritten`, `skipped`, `missing`, `mismatch`, `too_large`, `changed`, `failed`
   and the `cursor` (last row id reached).
3. **Check in the app:** open a few teachers' photos in /admin and on a phone; they load from
   `https://files.ayatalbayan.com/…`.
4. **The rest**, table by table, in a quiet hour (one row at a time with a pause between batches; `messages` fires
   the inbox's live updates, so run it outside working hours): `lesson_reports`, `report_attachments`, `payments`,
   `payment_attachments`, `expenses`, `teacher_payments`, `teacher_payouts`, `assistant_statements`, `invoices`,
   `saved_replies`, `profiles`, `messages`. `--limit N` stops after N rows; `--table <t> --after <cursor>` resumes
   after a cursor (a plain re-run also works: moved rows drop out). Recordings last, if at all, after checking
   the disk (§7), with `--max-mb` raised.
5. Re-run the dry run: `toMove` left over = the `missing` / `mismatch` / `failed` rows (still served from
   Supabase). A `payments` row of a cancelled package is `failed`: the database freezes that row (its receipt
   stays served from Supabase). Updating a `payments` row re-runs its assistant commission check, as any edit does.

**Rollback** of a moved row: set its column back to the unmarked path (`before.rows` of its `storage_move` audit
row has it) while the Supabase object still exists; reads follow the path again. Never needed for the files:
both copies exist.

**Later (not in this change): clean up Supabase.** Once every table is moved and checked, a separate flag in a
future change (`--delete-supabase`, owner's decision) removes the Supabase objects whose rows are all `minio:`;
until then both copies stay (deleting a moved row's file removes its MinIO object only; its old Supabase copy
waits for that clean-up).

`tools/scripts/storage/copy-to-minio.sh` (`storage-copy.js`, objects only, rows untouched) stays for a bulk copy
of every bucket; the move above is what makes MinIO serve the old files.

## 7. Disk, memory, operations

- **Memory:** 512 MB for MinIO (`GOMEMLIMIT=400MiB` keeps Go's heap under it; idle use is far less) + 64 MB for
  the one-shot init: the compose sum goes from 2336 to 2912 MB, inside the ~4.6 GB the VPS has free.
- **Disk:** the volume `ayat-albayan-staging_minio-data` (under `/var/lib/docker/volumes/`) has no quota; ~62 GB
  are free and shared with the CRM. Each client upload is capped by its signed slot (size and type, §1); lesson and
  meeting recordings are **not** capped, which is why they stay off until `MINIO_RECORDINGS` is switched on
  deliberately. The backup doubles the use. Watch it:
  `du -sh /var/lib/docker/volumes/ayat-albayan-staging_minio-data /var/backups/ayat-minio`.
- **Upgrade:** take the current digest (`docker buildx imagetools inspect cgr.dev/chainguard/minio:latest`), put it
  in both services of `docker-compose.yml` and in `MC_IMAGE` of `backup.sh` (`compose-minio.test.mjs` keeps the three
  equal and refuses a tag), deploy, then
  `docker compose -p ayat-albayan-staging up -d ayat-minio ayat-minio-init` by hand: `roll.sh` ends with
  `up -d --no-recreate`, which never recreates a running MinIO.
- **New app secret:** in a quiet window (no lesson reports being sent, nobody uploading): a new
  `MINIO_APP_SECRET_KEY` (`openssl rand -hex 20`) in `minio.env`, then
  `docker compose -p ayat-albayan-staging up -d --no-deps ayat-minio-init` (re-runs the init only; MinIO keeps
  running), then save the new value in «التكاملات» **at once**: the old key stops working when the init runs, and
  every signed URL handed out before (open report links, upload slots in progress) stops working with it. Do not
  change the root credentials casually.
- **A failed first deploy:** the rollback restores a compose file without these services and removes `ayat-minio`
  as an orphan (the volume stays); after the fix, run step 4 again.

# Database copy outside Supabase

**Production runs on the Supabase Free plan: Supabase keeps no backups of it** (no daily backups, no point-in-time recovery). This nightly copy is the only one, and it does not depend on Supabase: a nightly GitHub Actions run (`.github/workflows/db-backup.yml`) dumps the production database, encrypts the dump with **your** age public key, and keeps the encrypted file as a workflow artifact for 90 days (the longest a public repository allows).

- **What is copied:** the `public` schema (every table of the platform) and the `auth` schema (the logins), in `pg_dump` custom format, schema and data. Not copied: files in storage (MinIO has its own Drive backup, docs/45), and Supabase Vault secrets (re-enter them after a restore: «Vault secrets a restore needs» below).
- **Safety:** the plain dump only flows through a pipe into `age`; only the encrypted file is written and uploaded. The repository is public, so anyone signed in to GitHub can download the artifact, and without your private key it is noise. The log shows the file name and its size, never the URL, the host or a row. A failing `pg_dump` shows only how many error lines it wrote.
- **Off until you switch it on:** without the secret and the variable below, every run ends green with a notice and does nothing.
- **Required once it is on:** the repository variable `BACKUP_REQUIRED` = `true` turns that green notice into a failed run, so a deleted or renamed secret fails the next night and GitHub emails you about the failed scheduled run. Unset (or anything but `true`), a missing secret stays a notice.
- **Size watch:** every run logs `pg_database_size` in MB and warns above **400 MB**. The Free plan caps the database at **500 MB** and turns it read-only past that: on the warning, clean up old data or move to a paid plan before the cap.
- **Guarded by** `tools/scripts/ci-checks/db-backup.test.mjs` and `db-backup-required.test.mjs` (run the workflow's own steps with a fake `pg_dump`, `psql` and `age`).

## Switch it on (owner, once)

1. On a trusted computer install age (`brew install age`, `apt install age`, or the release from github.com/FiloSottile/age), then:
   ```sh
   age-keygen -o ayat-backup.key
   ```
   It prints `Public key: age1…`. **Keep `ayat-backup.key` offline**: in your password manager and on paper or a USB stick in a safe place. Without it no copy can ever be read; nobody else has it.
2. GitHub → Settings → Environments → `db-backup` (it appears after the first run; or create it): Deployment branches = `develop`.
   - The DB URL: the repository secret `STAGING_DATABASE_URL` (the session-pooler URI the migrations use) is read by default; an environment secret `SUPABASE_DB_URL` on `db-backup` overrides it (Supabase → production project → Connect → **Session pooler** URI, with the database password filled in).
   - Environment variable `BACKUP_AGE_RECIPIENT`: the `age1…` public key.
   - Optional variable `BACKUP_PG_MAJOR`: the server's Postgres major version if it is not 17.
3. Actions → `db-backup` → Run workflow. It should end green with an artifact `db-backup-<run id>` holding `ayat-db-<time>.dump.age` and its `.sha256`.
4. Once that run is green: Settings → Secrets and variables → Actions → **Variables** → repository variable `BACKUP_REQUIRED` = `true`. From then on a missing secret is a failed run and an email, not a quiet notice.

**Switch off:** delete the `BACKUP_REQUIRED` variable, then the `SUPABASE_DB_URL` secret (the next runs end green with a notice), or disable the workflow in the Actions tab. Rolling back the code is deleting the workflow file.

## Restore

Do this on a trusted computer, never on a shared machine, and delete the decrypted files afterwards.

1. **Download** the newest artifact: Actions → `db-backup` → the run → Artifacts, or `gh run download <run id> -n db-backup-<run id>`.
2. **Check and decrypt:**
   ```sh
   sha256sum -c ayat-db-*.dump.age.sha256
   age -d -i ayat-backup.key -o ayat.dump ayat-db-*.dump.age
   pg_restore --list ayat.dump | head        # the table of contents: proves the file is whole
   ```
3. **Target:** a new, empty Supabase project (same region), or a scratch Postgres 17 for a test. Take its Session pooler URI as `TARGET_URL`. Never restore over the live project unless the live project is lost.
4. **Schema and data of the platform:**
   ```sh
   pg_restore --no-owner --no-privileges --schema=public --dbname "$TARGET_URL" ayat.dump
   ```
5. **Logins** (a Supabase target only; its `auth` tables already exist, so data only):
   ```sh
   PGOPTIONS='-c session_replication_role=replica' \
     pg_restore --data-only --no-owner --no-privileges --schema=auth --dbname "$TARGET_URL" ayat.dump
   ```
6. **Bring the project in line with the code:** link the repo to the new project and push the migrations (`db-migrate`, docs/09): any migration newer than the dump is applied, the ones already in it are recorded. Re-enter the Vault secrets listed below (Vault is not in the dump).
7. **Point the platform at it:** set the new `SUPABASE_URL`, keys and database URLs in the GitHub `develop` environment and the server `.env` (docs/09 «Redeploy»), deploy with `env_only`, then check `https://api.ayatalbayan.com/ready` answers `"status":"ok"`.
8. **Delete** `ayat.dump` and any other decrypted copy.

### Vault secrets a restore needs

The dump holds no Vault entry. Keep the values in your password manager (never in this repository) and enter them again in the new project; each name below is the Vault name the platform reads.

- **Integration keys** (`integration:<KEY>`, entered in «التكاملات»): `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `WA_CHAT_ACCESS_TOKEN`, `WA_CHAT_APP_SECRET`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `EXPO_ACCESS_TOKEN`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET`, `GOOGLE_CLIENT_SECRET`, `WACRM_API_KEY`, `WACRM_WEBHOOK_SECRET`, `CALLS_TURN_SECRET`, `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `GIPHY_API_KEY`, `EVOLUTION_API_KEY`, `MINIO_SECRET_KEY` (the allow-list `integration_secret_key_ok`, migration `20261106001500`).
- **Per WhatsApp number** (`wa_number:<number id>:<name>`, entered on each number in «التكاملات»): `access_token`, `app_secret`, `evolution_token`, `evolution_cloud_token`, `evolution_proxy_password`. The number ids come back with the dump.
- **Google sync** (`google:refresh_token`): not copied by hand; connect the academy Google account again (docs/24).
- **Stripe test build** (`stripe:api_key`, `stripe:webhook_secret`): only if the test build was in use (admin settings).

## Monthly restore test (owner, about 20 minutes)

A backup that was never restored is a hope, not a backup. Once a month:

- [ ] Actions → `db-backup`: every night of the last month is green, and the newest artifact is less than 2 days old.
- [ ] The newest run logs the database size; note it, and plan the cleanup or a paid plan if it warns (above 400 MB of the Free plan's 500 MB).
- [ ] The password manager still holds every Vault secret named under «Vault secrets a restore needs».
- [ ] Download the newest artifact; `sha256sum -c` passes.
- [ ] `age -d` with the key from your offline copy works (this also proves you still have the key).
- [ ] `pg_restore --list ayat.dump` lists the platform tables (students, lessons, payments, messages, …).
- [ ] Restore into a scratch Postgres 17 (`docker run --rm -d -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:17`, then steps 4 with `postgresql://postgres:x@localhost:55432/postgres`; `pg_restore` may report missing Supabase roles and extensions there: those lines are expected).
- [ ] Spot-check: `select count(*) from students;` and `select max(created_at) from lessons;` look like production (the newest row is from the night of the dump).
- [ ] Stop the scratch database and delete every decrypted file.
- [ ] Note the date and the result (for example in the private operations report).

If any box fails, the nightly copy is not trustworthy: fix it before anything else.

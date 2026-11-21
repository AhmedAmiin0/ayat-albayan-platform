# Database copy outside Supabase

Supabase keeps its own backups of the project. This is a second copy that does not depend on Supabase: a nightly GitHub Actions run (`.github/workflows/db-backup.yml`) dumps the production database, encrypts the dump with **your** age public key, and keeps the encrypted file as a workflow artifact for 90 days (the longest a public repository allows).

- **What is copied:** the `public` schema (every table of the platform) and the `auth` schema (the logins), in `pg_dump` custom format, schema and data. Not copied: files in storage (MinIO has its own Drive backup, docs/45), and Supabase Vault secrets (the integration keys: re-enter them in «التكاملات» after a restore).
- **Safety:** the plain dump only flows through a pipe into `age`; only the encrypted file is written and uploaded. The repository is public, so anyone signed in to GitHub can download the artifact, and without your private key it is noise. The log shows the file name and its size, never the URL, the host or a row. A failing `pg_dump` shows only how many error lines it wrote.
- **Off until you switch it on:** without the secret and the variable below, every run ends green with a notice and does nothing.
- **Guarded by** `tools/scripts/ci-checks/db-backup.test.mjs` (runs the workflow's own steps with a fake `pg_dump` and `age`).

## Switch it on (owner, once)

1. On a trusted computer install age (`brew install age`, `apt install age`, or the release from github.com/FiloSottile/age), then:
   ```sh
   age-keygen -o ayat-backup.key
   ```
   It prints `Public key: age1…`. **Keep `ayat-backup.key` offline**: in your password manager and on paper or a USB stick in a safe place. Without it no copy can ever be read; nobody else has it.
2. GitHub → Settings → Environments → `db-backup` (it appears after the first run; or create it): Deployment branches = `develop`.
   - Environment secret `SUPABASE_DB_URL`: Supabase → production project → Connect → **Session pooler** URI, with the database password filled in.
   - Environment variable `BACKUP_AGE_RECIPIENT`: the `age1…` public key.
   - Optional variable `BACKUP_PG_MAJOR`: the server's Postgres major version if it is not 17.
3. Actions → `db-backup` → Run workflow. It should end green with an artifact `db-backup-<run id>` holding `ayat-db-<time>.dump.age` and its `.sha256`.

**Switch off:** delete the `SUPABASE_DB_URL` secret (the next runs end green with a notice), or disable the workflow in the Actions tab. Rolling back the code is deleting the workflow file.

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
6. **Bring the project in line with the code:** link the repo to the new project and push the migrations (`db-migrate`, docs/09): any migration newer than the dump is applied, the ones already in it are recorded. Re-enter the integration keys in «التكاملات» (Vault is not in the dump).
7. **Point the platform at it:** set the new `SUPABASE_URL`, keys and database URLs in the GitHub `develop` environment and the server `.env` (docs/09 «Redeploy»), deploy with `env_only`, then check `https://api.ayatalbayan.com/ready` answers `"status":"ok"`.
8. **Delete** `ayat.dump` and any other decrypted copy.

## Monthly restore test (owner, about 20 minutes)

A backup that was never restored is a hope, not a backup. Once a month:

- [ ] Actions → `db-backup`: every night of the last month is green, and the newest artifact is less than 2 days old.
- [ ] Download the newest artifact; `sha256sum -c` passes.
- [ ] `age -d` with the key from your offline copy works (this also proves you still have the key).
- [ ] `pg_restore --list ayat.dump` lists the platform tables (students, lessons, payments, messages, …).
- [ ] Restore into a scratch Postgres 17 (`docker run --rm -d -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:17`, then steps 4 with `postgresql://postgres:x@localhost:55432/postgres`; `pg_restore` may report missing Supabase roles and extensions there: those lines are expected).
- [ ] Spot-check: `select count(*) from students;` and `select max(created_at) from lessons;` look like production (the newest row is from the night of the dump).
- [ ] Stop the scratch database and delete every decrypted file.
- [ ] Note the date and the result (for example in the private operations report).

If any box fails, the nightly copy is not trustworthy: fix it before anything else.

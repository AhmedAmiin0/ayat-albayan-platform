# 26 — Settings redesign: one key/value/description store («القيم») + custom module pages

Owner requests, 2026-10-23: «separate the settings module into config that have all values that could be key value
and give it also a description field and for more complex settings like notifications make a new module», then
«redisgn as archrchtirue and ui ux», then the **decision**: «i want a dynamic key value description config to be used
and seeded with most of the modules and as for the modules that will require a heavey config like notifications make a
custom desgin for it».

**Design.** 26-P0 and 26-P1 are built (§6 «Built»); the rest is not yet. No migration number is reserved: use the next free numbers at build time
(docs/23 phase 3 holds `20261023000620–629`). Once built, this supersedes docs/25 §1 (the five concepts), §5
(recipes) and §6 (Google rows); until then docs/25 describes the code. Companion files:

- `docs/26a-config-survey.md` — survey: every key, SQL reader, API route, client (file:line).
- `docs/26b-config-ui.md` — UI/UX: IA, the old → new map of all 127 controls, states, mobile, design review.
- `docs/design/26-config/` — static mockups, one short screen each (owner: «i dont like long pages», «stick with
  table»): `hub.html`, `values.html`, `values-390.html`, `notifications.html`, `mobile.html`, plus `states.html` (every
  dialog and state) and `tokens.css`.

## 0. Summary

Keep `public.settings` and **evolve it in place** into the one store. The table keeps its name, key and `value jsonb`,
and gains `module`, `scope`, description columns, type/default mirrors, `version` and `retired_at`. Each module
**seeds its own keys** from its code registry file. A startup seeder writes metadata and seeded descriptions, and
**never writes a value**. Types, defaults, validation and ownership stay in code. Admins edit values and descriptions
at runtime on one page, «القيم».

Heavy modules keep their own data model and page:
- **التواصل** (docs/23): numbers, notifications, templates, safety and the send gate.
- **التكاملات** (Vault secrets).
- **مزامنة Google** (docs/24).
- **المظهر** (per device).

What does not change: no permission for «القيم» (it uses `settings.read` / `settings.write`), no table rename, no
change to the 7 SQL readers. A small **guard-rail PR comes first** (26-P0): it closes today's back door, where the
send gate and other owned keys can be written through `PATCH /settings`. The send-gate read switches **last**, and
fails closed.

## 1. What is CONFIG and what is a MODULE

A value is **CONFIG** (a row of «القيم») when all five hold:
1. **Scalar.** A number, yes/no, a choice, text, a time zone, a phone, a currency, a short list of numbers, or a
   small fixed shape of ≤ 3 scalar fields.
2. **Independent.** Its meaning does not depend on another row or table being set first.
3. **No relations.** It has no foreign keys, and there is no per-person or per-record override table it alone governs.
4. **Not a secret.** Secrets live in Vault only.
5. **No confirmation flow.** It may have one per-value confirmation that the registry declares (`confirm: 'simple' |
   'typed'`). A flow that shows counts, previews or dry runs, or a staged switch, makes it a module.

Otherwise it belongs to a named **MODULE**. Every key is classified below; refs are in 26a Part A §1, §3, §5.

| Store / owner | Keys | Count |
|---|---|---|
| **CONFIG → «القيم»** | `booking_horizon_weeks`, `late_cancel_hours`, `makeup_window_days`, `teachers_always_available`, `join_opens_before_min`, `join_closes_after_min`, `default_meeting_title`, `meeting_link_auto`, `report_teacher_edit_hours`, `reporting_currency`, `renewal_alert_remaining`, `subscription_expiry_days`, `flag_future_lessons_when_unpaid`, `payout_count_late`, `payout_count_no_show`, `payout_count_trials`, `fx_fresh_hours`, `upload_max_mb`, `academy_whatsapp_e164`, `academy_timezone`, `feedback_rate_window_min`, `academy_contact`, `recording_consent_notice`, `recording_retention_days`, `activity_retention_days`, `sales_auto_assign`, `quick_reply_window_hours`, `reminder_lookahead_hours` | 28 of 39 |
| **MODULE التواصل → الإشعارات** (docs/23 phase 4, `notification_rules`) | `reminder_minutes_before`, `reminder_24h_enabled`, `teacher_whatsapp_new_student`, `teacher_whatsapp_lesson_reminder`, `follow_up_hours`, `follow_up_slots_from_hours`, `follow_up_slots_to_days`, `feedback_mode` | 8 |
| **MODULE التواصل → السلامة** (the send gate: staged switches with counts and warnings) | `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done`; `comms_source` (docs/23 phase 3; kept **outside** the generic registry, §5) | 3 (+1) |
| **MODULE مزامنة Google** (docs/24) | `google_sync_enabled`, `google_sync_mode`, `google_calendar_window_days` (rows in this table with `scope = module`) | 3 rows |
| **MODULE التواصل → الأرقام / الحماية** (docs/23 phase 3) | the 15 `WA_*` / `KAPSO_*` integration keys, the allow-list and template sync | 17 |
| **MODULE التكاملات** (`integration_config` + Vault, unchanged) | LiveKit, Expo, Web Push, FX, the Google OAuth client | 15 |
| **Free values → «قيم مخصصة»** (today `custom_config`; no code reads them) | admin-made keys | 0 seeded |
| **Not config** | the theme (browser storage); env bootstrap keys (26a Part A §6); per-teacher meeting mode, pay rates, expense categories, roles (records with relations) | — |

Two CONFIG keys stay in «القيم» but are also shown elsewhere:
- **`renewal_alert_remaining`** is listed by docs/23 as the `renewal_due` timing. It stays CONFIG because the SQL view
  `v_student_list` reads it (26a Part B §2). The notification row shows it **by reference** («من القيم» + link), and
  **23-P4 must not copy it**. Two thresholds would flap the alert task and fail a queued renewal as `stale` under a
  dedup key that can never be re-queued (`alerts.queries.ts:66-112`).
- **`academy_whatsapp_e164`** is shown read-only on «التواصل → نظرة عامة» as «الرقم المعلن للأسر».

Module-owned rows (the 8 + 3 + 3 above) are **visible** in «القيم» under «تُدار من صفحة أخرى». There they are
read-only and link to their page; the Google rows appear only for base admins. So there is one store, and one place
that shows every value.

## 2. Architecture (recommended: evolve `public.settings` in place)

### 2a. Table

The changes go in one expand migration. The checks are added `NOT VALID` and are validated in a **later** migration,
after the pre-check query is empty on staging.

| Column | Notes |
|---|---|
| `key text pk`, `value jsonb not null`, `updated_at`, `updated_by` | **Unchanged**: the 7 SQL readers, ~10 e2e writers, `resetDb` and the generated types keep working. `updated_at` is now set only when `value` or `description` changes, so a boot no longer looks like «changed by …» |
| `module text`, `scope text` (`config` / `module` / `custom`) | **Display mirrors**. Ownership is decided by the **code registry**, never by these columns (a row inserted by raw SQL gets defaults) |
| `value_type`, `default_value jsonb`, `is_public bool` | Mirrors of the registry, rewritten by the seeder. Authoritative only for `custom` rows |
| `description_seed`, `description`, `description_edited` | §3 |
| `version bigint` | Taken from a sequence, so it never restarts after a delete and re-insert. Bumped **only when `value` changes** (a description edit cannot make a value save fail) |
| `retired_at timestamptz` | Set only by an explicit `retired: true` registry entry. The row stays readable |

**Checks:**
- Key format: `^[a-z][a-z0-9_]{1,63}$`, or `^custom\.[a-z][a-z0-9_.-]{1,63}$` for custom rows. The custom form keeps
  every key that today's `CUSTOM_KEY_RE` allows, up to 64 characters.
- Value size ≤ 8 KB.
- `value_type is null or value = 'null' or settings_kind_ok(value_type, value)`. This compares `jsonb_typeof` only;
  bounds stay in zod.

**Null semantics.** JSON `null` means unset, which means the default. This replaces today's "delete the row on null"
(PostgREST cannot store a JSON null, so writes go through an RPC). All 7 SQL readers and `readSettings` already read
JSON null as a missing row (26a Part B §2). An invariant test requires every nullable key's default to be `null`, so
`late_cancel_hours` null still means OFF.

**RPCs** (security definer, `service_role` only):
- **`config_seed(entries jsonb, registry_version int)`**:
  - Runs under `pg_try_advisory_xact_lock`, with one savepoint per key.
  - Does `insert … on conflict (key) do update` of metadata columns, only where they differ. `value` is never in the
    update list, and new rows get JSON null.
  - **Does nothing if the stored `registry_version` is newer**, so an older build or a rollback cannot rewrite the
    metadata.
  - A failure is logged and never blocks boot.
- **`config_set(changes jsonb, actor uuid)`**:
  - One transaction per save, with a per-key `expected_version`.
  - Upserts a missing row; an absent row accepts version 0.
  - Stores JSON null.
- **Freshness**: a one-row table `settings_revision(rev bigint)`, bumped by a statement trigger **inside the writer's
  transaction**, so it is commit-visible. It is read in the same query as the rows, and compared with `<>`.

**RLS unchanged:** admins read (`is_admin()`), anon reads nothing, and only the service role writes. `is_public`
never opens anon access: public values are still served by the API (`GET /settings/public`).

**Vault unchanged:** `integration:<KEY>` stays, and docs/23 adds `wa_number:<id>:*`. A test rejects registry keys whose
name looks like a secret (`*_token`, `*_secret`, `*_key`).

### 2b. Seeding: each module seeds its own keys (owner decision)

**The module's file is its seed.** A module declares its keys once, in
`packages/shared/src/settings/domains/<module>.ts`. Each entry has:
- key, type, default, bounds, `labelKey`, `hintKey`, `public`;
- and new fields: `module`, `group` (the page group), `confirm`, `reachesFamilies`, `ownedBy` (the module page that
  edits it) and, when needed, `retired`.

**`SEED_ENTRIES`** is the registry ∪ `GOOGLE_SETTING_KEYS` ∪ module keys kept outside the registry (`comms_source`).
A test checks that every key any SQL function or reader names is in it.

**When the seeder runs.** The `ConfigSeeder` sends these entries at API boot, from `pnpm migrate:apply`, and from e2e
`seedSettings` after `resetDb`. On each run:
- missing keys get a row (JSON null = default);
- metadata and `description_seed` are refreshed.

**Guarantees:**
- **It never overwrites an edited value.** A unit test asserts the SQL; an e2e boots twice on rows holding `false`,
  JSON null and nothing, and checks that no value, `version` or `updated_at` changed.
- **No per-key seed migration any more.** docs/25 §5 step 3 drifted: 5 keys were never seeded (26a Part A §8). A key
  read by SQL keeps its `coalesce` default, and `sql-defaults.migration.test.ts` pins `coalesce default = registry
  default`.
- **A migration that copies values** (docs/23 phase 4) applies the registry default to a missing or JSON-null row,
  under the same pinned test.

### 2c. Reads: fast and fresh

- **Cache.** `ConfigStore` keeps today's single cached promise of all rows (`SETTINGS_CACHE_MS`, 30 s; 0 in e2e).
- **Revision check.** When the cache is older than 2 s, one query reads the revision. If it differs, the store reads
  the rows and the revision together.
- **Writes.** Own writes invalidate the cache at once. Raw SQL writes (e2e, psql) are seen within 2 s on every
  instance. Today there is one instance and no Postgres driver, so LISTEN/NOTIFY is not available (26a Part C §4).
- **Failures** are never cached: `all()` rejects instead.
- **The send gate does not use this cache at all** (§5).

### 2d. Validation

- **Code keys.** The code registry (zod) is the only authority, on write and on read: a malformed stored value reads
  as the default and is logged once. The DB columns are a mirror, and a test compares them with the registry.
- **Custom rows** (phase 5) are checked against their `value_type`: نص، رقم، نعم/لا، قائمة، JSON ≤ 8 KB. Admins
  cannot define bounds or schemas. When code starts to need a value, it becomes a code key.

### 2e. NestJS

```
common/config-store/        ConfigStoreModule (@Global)
  config-store.service.ts   rows + cache + revision          config-store.queries.ts  select / rpc
  config-seeder.ts          SEED_ENTRIES → config_seed        config-entries.controller.ts / .mapper.ts / .audit.ts
  config-ownership.ts       code-defined owner of each key    config-parity.ts  old vs new effective values
common/settings/            SettingsService kept as the SAME token: a typed facade over ConfigStore. The 28
                            modules/<m>/<m>.settings.ts readers, fakes and 7 overrideProvider harnesses do not change.
                            settings.controller.ts = the PATCH /settings alias with the rules of §2f
common/custom-config/       alias controller; in phase 5 a facade over ConfigStore (scope custom, prefix mapped)
common/public-config/       unchanged payload
modules/whatsapp/send-gate  §5        modules/notification-rules  docs/23 P4        modules/academy-numbers  docs/23 P3
modules/google-sync/        google-settings.ts goes through ConfigStore (fresh read), not raw table calls
```

**Boundary tests:**
- `config-store` imports no consumer. `common/settings` and `common/custom-config` import only `config-store`.
- ESLint keeps `modules/**` away from `config-store.service` and `settings.service`; readers are the exception.
- A grep test forbids `from('settings')` and `from('custom_config')` outside `common/config-store`.
- Every reader's `KEYS` must be ⊆ its module's keys ∪ a declared `CROSS_READS` list.
- A grep test forbids a bare `'/admin/settings'` link outside the hub (deep links name their page).

### 2f. API routes and permissions

| Route | Permission | Notes |
|---|---|---|
| `GET /config/entries` | `settings.read` | Every row merged with the registry: key, module, group, type, bounds, value, default, description, seed, edited, public, version, updated at/by (name), `ownedBy`, `confirm`. Google rows only for base admins |
| `PATCH /config/entries/:key` `{value, expectedVersion, confirmText?}` | `settings.write` | Possible answers: 409 `conflict` (current value + who changed it), 409 `owned_by_module` (decided by code), 422 `invalid`, 428 `confirmation_required` (the server checks the typed text) |
| `PUT /config/entries/:key/description` `{text \| null}` | `settings.write`; on a module-owned key, that module's permission | null = restore the seeded text; audited `describe:<key>` |
| Phase 5: `POST /config/entries`, `DELETE /config/entries/:key` | `settings.write`; **marking a value public needs the base admin role** | `custom` rows only |
| 26-P0: `PUT /messages/gate/sending`, `PUT /messages/gate/auto` `{on, confirmText?}` | `settings.write` (as today) | The only writers of the two switches. ON needs the confirmation text checked by the server. **OFF is always accepted: no version, no 409** |
| **Aliases kept**: `GET /settings`, `GET /settings/public`, `GET /config/meta`, `GET`/`PUT`/`DELETE /config/custom[/:key]` | as today | Their shapes are **frozen by a schema test** (the 0.2.0 shape of `GET /settings`; non-nullable keys always resolve to their default, never null) |
| **`PATCH /settings` alias** | `settings.write` | Applied **per key**. It answers `{saved, moved}` and never rejects the whole request. From 26-P0, owned keys are `moved`. From 26-P3 it accepts only the 7 fields the 0.2.0 phone edits (`bookingHorizonWeeks`, `lateCancelHours`, `followUpHours`, `renewalAlertRemaining`, `subscriptionExpiryDays`, `reportTeacherEditHours`, `reportingCurrency`); every other key is `moved`. After 23-P4, `followUpHours` writes the rule when the caller holds `notifications.manage`, and is `moved` otherwise |
| `/settings/integrations…`, `/admin/google/*`, `/admin/notifications`, `/messages/gate` | as today | Module routes. `/admin/notifications` keeps a **frozen v1 shape** for clients without the `X-AB-Client` header (new rows and timing kinds crash `catalogue-words.ts` on 0.2.0) |

**Permissions:**
- **No new permission for «القيم»**: it uses `settings.read` / `settings.write` (docs/25 §2).
- **Where `settings.write` is limited:**
  - public custom values and the Google rows stay base-admin only;
  - module-owned keys need their module's permission.
- **docs/23's own permissions.** docs/23 brings `numbers.manage` and `notifications.manage`. Its seeding migration
  should **grant them to every role that holds `settings.write` today**, so custom roles keep what they can do. It
  also needs an `ADMIN_PAGES` entry for `/admin/communications` (without one, `pagePermission` returns null).
- **The web now checks `settings.write` before showing editors.** Today it does not (26a Part D §5).

**Retiring an alias (measurable).** Do this **now**, before anything bumps the app version:
1. Ship an OTA to runtime 0.2.0 and a web build. Both send `X-AB-Client: <platform>/<build>`.
2. The API counts hits per route × client × build.
3. An alias is removed only after **30 days with zero hits from untagged or older builds**, and after every mobile
   admin seen in that time has been seen on a tagged build.

## 3. Descriptions (owner: a description column, seeded by the module, editable by admins)

**Where the text comes from:**
- **The canonical text stays in `ar.json` / `en.json`** (CLAUDE.md rule 10: clear MSA). The seeder copies the Arabic
  hint (`hintKey`) into `description_seed`.
- **An admin edit writes two things in one transaction**: `description` (`description_edited = true`) and the
  `translation_overrides` row (`hintKey`, `ar`). Old phones and old web tabs show hints through `t()` plus overrides,
  so the edit reaches them too.
- **«استعادة الوصف الأصلي»** clears both.

**Display order:** in Arabic, `description ?? override ?? description_seed ?? t(hintKey)`; in English, `t(hintKey)`
with the en override.

**translation_overrides are not orphaned:**
- No i18n key is renamed. Labels keep `settings.*`, `config.*`, `templates.settings.*`, `sales.assign.*`.
- **A data migration** (it runs once, never in the seeder) copies existing **ar** overrides on registry hint keys into
  `description`.
- On «الترجمات», the Arabic rows of those hint keys become read-only, with a link to «القيم». **en** rows stay
  editable there.
- Keys that stop rendering (old page chrome, section titles) keep their override rows, and nothing is deleted.
  `mobileAdmin.*` overrides still change old phones. New groups get new keys.

**Trade-off (owner question 1):** English descriptions are not edited on «القيم»; they keep their path through
«الترجمات».

## 4. Migration: expand → copy → parity → switch reads → contract (docs/23 §2e)

| Step | What | Proof before the next step |
|---|---|---|
| **Expand** | Columns, sequences, the revision table and trigger, the RPCs and checks (`NOT VALID`). Types are regenerated **only here**. Nothing reads them yet | All tests green |
| **Copy** | The seeder fills metadata and `description_seed` (no value is written). Writes store JSON null instead of deleting. The override copy (§3) runs | e2e: a missing row, JSON null and a seeded null give the same `GET /settings`, the same SQL-function results and a closed gate. Two boots change nothing |
| **Validate** | A separate migration runs `VALIDATE` once the pre-check query is empty on staging | — |
| **Parity** | `GET /admin/config/parity` (admin; also run in CI on the e2e DB) compares, for every key, the **legacy** effective value (today's `readSettings` over the rows) with `ConfigStore`'s | Empty for ≥ 1 week on staging |
| **Switch reads** | Readers move to the facade over `ConfigStore` (no reader file changes). «القيم» ships | Parity stays empty |
| **Contract** | After ≥ 2 clean weeks, the legacy read code goes. Phase 5 absorbs `custom_config` (copied as `custom.<key>` after a count-equality pre-check; the old table stays read-only for one release, then is dropped). Aliases go only under the §2f rule | — |

**Parity rules** (unit fixtures + e2e):
1. **JSON null and a missing row differ as data but mean the same.** Both read as the default: `late_cancel_hours`
   null = OFF; `recording_retention_days` null = keep forever; `recording_consent_notice` null = no notice.
2. Every key's effective typed value is equal in both paths. A malformed value reads as the default in both.
3. `messaging_enabled` and `auto_messages_enabled` are on **only** for a stored JSON boolean `true`. `"true"`, `1`,
   JSON null, a missing row and an unreadable row all mean off.
4. `comms_source` is `module` only for the exact stored string `"module"`. Missing, null or unknown means `legacy`.
5. `/settings` and `/settings/public` payloads are snapshot-equal before and after (old phones).
6. Google rows are equal. Custom rows (phase 5) are byte-equal in value, description and `is_public`.

**Compat paths.** Nothing is renamed: no key, table, column, route, React Query key or i18n key. SQL readers keep
`select value from public.settings where key = …`. If a later PR renames anything, it ships an alias first (a view or
SQL function, a route, a fallback i18n key), and removes it only under the §2f rule.

## 5. Send-gate and messaging-safety keys: last, fail-closed

**Ownership.** `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done` and `comms_source` are owned by
`communications` **in code**. Neither `PATCH /config/entries` nor the `PATCH /settings` alias writes them. Their
descriptions too can only be edited with the module's permission.

**26-P0** (first, small):
- the two gate routes of §2f; the web switches move to them;
- the alias drops the owned keys;
- `comms_source` stays **out of** the generic registry. It gets its own route, which refuses `module` while docs/23's
  parity list is non-empty. This is an acceptance item for 23-P3; if 23-P3 merges first, 26-P0 removes the key from
  the alias.
- a CI check fails any migration newer than a cutoff that writes `messaging_enabled`, `auto_messages_enabled`,
  `crm_cutover_done`, `comms_source`, `google_sync_enabled` or `google_sync_mode`. The old seeding migrations (142,
  162, 610) sit below the cutoff.

**26-P4** (last): `SendGate` reads `messaging_enabled` and `auto_messages_enabled` with an **uncached primary-key read
on every sender pass**, and the PR changes nothing else. Tests:
- **off** when the row is missing, JSON null, a string, a number or malformed, and when the read fails;
- **on** only for a stored `true`;
- a value in any cache is never used.

**e2e:** on staging-shaped data with fake families, the API boots twice; the gate must stay closed and no `messages`
row may be created.

Staging has `messaging_enabled = false` and real families. Nothing in this plan turns sending on.

## 6. Build phases (each a shippable PR with rollback) and their place among docs/23 phases 3–7

Order: **26-P0 → 23-P3 → 26-P1 → 23-P4 → 26-P2 → 26-P3 → 23-P5 → 23-P6 → 26-P4 → 23-P7 + 26-P5**.

| # | PR | Scope | Rollback |
|---|---|---|---|
| **26-P0** | Guard rails | Gate routes; the alias drops owned keys (per key, with a `moved` list); `comms_source` outside the registry; migration CI check; the `X-AB-Client` header (web + OTA to 0.2.0) and per-route counting; the web form sends only changed keys | Revert. Until then an old web tab's switches (PATCH) are answered `moved` and change nothing: reload the tab |
| 23-P3 | Numbers as records (in progress) | — | Its own |
| **26-P1** | Expand | §2a columns, sequences, revision table, RPCs, `NOT VALID` checks, generated types; registry gains `module`/`group`/`confirm`/`ownedBy`/`reachesFamilies`; `SEED_ENTRIES`. Inert | Revert the code; the unused columns stay |
| 23-P4 | Notification rules (**amended**) | Copies 7 of the 8 notification keys (not `renewal_alert_remaining`, §1). Moves the messaging section's writes of the 8 keys to the rules API. Ownership of the 8 keys changes **in the registry** (`ownedBy: 'notifications'`), never through SQL metadata. Legacy rows are frozen while `comms_source = module`; switching back to `legacy` first copies rules → legacy, or needs an empty reverse parity | Its own |
| **26-P2** | Seeder + atomic writes + parity | `ConfigSeeder` (`registry_version`, per-key savepoint), `config_set` (JSON null, versions), revision freshness, the description override copy, `/admin/config/parity`, null-parity and two-boot e2e; the `VALIDATE` migration after the pre-check | Revert the code. Rows keep their values (only metadata was written) |
| **26-P3** | «القيم» + hub | `/config/entries` routes; web hub (a five-row table) + «القيم» (a compact table, one group per view; docs/26b §2) + description dialog; mobile list + «القيم» (a two-column table with a bottom-sheet editor); the alias narrows to the 7 phone fields. The messaging section moves to a «التواصل» page with **its own form and save** (the gate routes, the rules API) until 23-P6. Redirects: `#integrations` → `/admin/settings/google` **with its query string, forever** (the web deploys before the API callback changes); the template-approval links go to the templates view. Push `google_sync_alert` opens the Google screen in the new bundle. **e2e updated in the same PR**: `settings-academy`, `templates`, `template-numbers`, `wa-lines-check`, `settings-switches`, `restricted-templates`, `responsive` (selectors, per-row «حفظ»; the skeleton uses `aria-busy`, not `role=status`) | Revert web/mobile. The aliases were never removed |
| 23-P5, 23-P6 | Routing per number; `/admin/communications` | P6 uses the docs/26b design for «الإشعارات» and the 26-P0 gate routes | Their own |
| **26-P4** | Send gate last | §5: uncached gate read, fail-closed tests | Revert one file |
| 23-P7 + **26-P5** | Contract | Legacy keys and read code go after ≥ 2 clean weeks; `custom_config` absorbed as «قيم مخصصة»; aliases removed only under the §2f rule | A down-migration copies `custom.*` back |

**Why this order.**
- **26-P0 first:** today any `settings.write` holder, and any old tab's page-wide «حفظ», can write the send gate
  through `PATCH /settings` (`schema.ts:41-47` has no `form` filter). docs/23 phases 3–6 add more such keys.
- **26-P1 is inert**, so it can land any time after 23-P3.
- **23-P4 before 26-P2:** 23-P4 changes who owns the 8 notification keys. With 23-P4 first, the seeder's first run
  already carries that ownership, and the alias and «القيم» never show those keys as editable. Neither order changes
  the other's data: none of the 8 keys is nullable, and the seeder never writes values. So if 23-P4 slips, 26-P2 may
  go first.
- **26-P4 last:** the safety path changes alone, after everything else has settled.

**Built (2026-10-23, branch `cloud/config-p0-p1`):**
- **26-P0 — built.** Gate routes `PUT /messages/gate/sending|auto` (ON needs `GATE_CONFIRM_TEXT`, checked by the
  server, 428 `confirmation_required`; OFF always accepted) and `PUT /messages/gate/cutover`:
  `apps/api/src/modules/whatsapp/gate.controller.ts`, `gate.settings.ts`, `gate.errors.ts`; contract
  `packages/shared/src/settings/gate.ts`. Per-key `PATCH /settings` answering `{...settings, saved, moved, invalid}`:
  `packages/shared/src/settings/patch.ts`, `apps/api/src/common/settings/settings.controller.ts`, `settings-patch.ts`;
  ownership in code: `packages/shared/src/settings/ownership.ts` (`OWNED_SETTING_KEYS`). `comms_source` is written only
  by `POST /admin/communications/source` (`modules/numbers/numbers.settings.ts`). Migration guard:
  `tools/scripts/owned-keys-check.mjs` + `.github/workflows/owned-keys-guard.yml` (cutoff `20261023000621`).
  `X-AB-Client`: web `apps/web/src/lib/client-tag.ts` (`web/<VITE_BUILD_ID|dev>`), mobile
  `apps/mobile/src/lib/client-tag.ts` (JS only), API counting `apps/api/src/common/client-usage/` (in memory, one log
  line per 15 min). Web switches: `apps/web/src/features/messaging/gate-api.ts`. Not done here (left to 26-P3 /
  `cloud/config-ui`): «the web form sends only changed keys».
  `PATCH /settings` answers 400 (today's body) only when nothing could be saved and a field was invalid, so the
  0.2.0 phone keeps its field errors; owned keys alone are 200 with `saved: []`. Gate routes: only the write can fail
  the request (a failed read before it or audit after it is logged). Usage counts: past the cap only the build
  collapses to `other`, `untagged` is always kept; any `other` count on a route means «not zero».
- **26-P1 — built, inert.** Migration `packages/db/supabase/migrations/20261023000630_config_expand.sql` (columns,
  `settings_version_seq`, `settings_revision` bumped by a deferred row constraint trigger at commit, `config_seed`,
  `config_set`, `NOT VALID` checks); types `packages/db/src/types.ts`; registry metadata in
  `packages/shared/src/settings/domains/*.ts` + `groups.ts`; `SEED_ENTRIES` / `REGISTRY_VERSION` in
  `packages/shared/src/settings/seed-entries.ts` (+ `google-defs.ts`); tests `seed-entries*.test.ts`,
  `sql-defaults.migration.test.ts`, `apps/api/src/common/settings/config-expand.migration.test.ts`,
  `e2e/tests/config-expand.sql.spec.ts`.

## 7. Assumptions (the owner's message ended with «but …»; any of these may be what it meant)

1. «Most of the modules» means the 28 scalar keys above. The heavy modules are notifications, numbers, the send gate,
   integrations and Google. Appearance stays per device.
2. «Dynamic» means values and descriptions change at runtime without a deploy, and admins can add their own keys
   (phase 5). But a new key that **code** reads still needs a code change, because its type and default live in code.
3. Keys keep their names (no `module.key` renames). So old phones, SQL, audit history and translations stay valid.
4. One description per key: Arabic is editable on «القيم», English comes from `en.json` (question 1).
5. Module-owned values are visible read-only in «القيم» and edited only on their module page.
6. One save model: each value saves on its own. The page-wide «حفظ» goes, because it silently overwrote other admins'
   edits.
7. No new permission for «القيم». docs/23 brings `numbers.manage` / `notifications.manage`.

## 8. Questions for the owner (each with a recommended default)

> **Answered: defaults (owner «finishh every thing», 2026-10-23).** All five questions take the recommended (a)
> answer: one editable Arabic description per key, English through «الترجمات»; custom values folded in the last phase;
> a typed confirmation for `recording_retention_days` and `activity_retention_days`, a plain one for
> `teachers_always_available`, `meeting_link_auto` and `sales_auto_assign`; scalar values editable on the phone;
> proceed as written. Colours: the app's live «Emerald Mint» tokens only (owner «keep the colors»).

1. **Description language.**
   - (a) **Recommended:** one editable Arabic description per key; English stays editable through «الترجمات». The
     academy works in Arabic, and this needs no extra column.
   - (b) Editable Arabic and English on «القيم» (a second column).
2. **«قيم مخصصة».**
   - (a) **Recommended:** fold them into the same store as «قيم مخصصة», with simple types (نص، رقم، نعم/لا، قائمة،
     JSON), in the last phase. Making one public needs the base admin role.
   - (b) Keep them separate, as today.
   - (c) Let admins define bounds and choices per key: a schema builder, about twice the work, and no code reads these
     values today.
3. **Confirmations on values that delete data or change every booking** (`recording_retention_days`,
   `activity_retention_days`, `teachers_always_available`, `meeting_link_auto`).
   - (a) **Recommended:** a typed confirmation for the two that delete data, and a plain one for the two booking-wide
     switches. The `meeting_link_auto` dialog says how many lessons in the next reminder window were already reminded
     with the old link.
   - (b) Typed for all four.
   - (c) None, as today.
4. **Editing on the phone.**
   - (a) **Recommended:** scalar values editable on the mobile admin, with the same confirmations; lists and small
     forms read-only («عدّلها من الموقع»).
   - (b) Read-only on the phone.
5. **Your message ended with «but …».** Which assumption in §7 did you mean to qualify? Default: proceed as written.

## 9. Adversarial review: findings and how the plan absorbs them

Two reviewers tried to break the first draft against the code. Every finding is folded into the sections above.

| # | Sev | Finding | Fix (where) |
|---|---|---|---|
| 1 | high | `PATCH /settings` accepts the send-gate keys, the notification keys and the typed-confirmation keys; an old tab's page-wide save overwrites everything | 26-P0 gate routes; the alias is per key, narrowed, with `moved` (§2f, §5, §6) |
| 2 | high | `comms_source` in the registry would become an unguarded switch | Outside the registry, with its own parity-guarded route (§5) |
| 3 | high | A registry-driven seeder would retire the Google rows, and an older build would rewrite the metadata | `SEED_ENTRIES`, explicit `retired`, `registry_version` (§2a, §2b) |
| 4 | high | A sequence revision is bumped before commit, so a stale `true` could be cached for 30 s | Transactional revision table; the gate reads uncached (§2a, §5) |
| 5 | high | Old clients write the 8 notification keys into dead rows, and a flip back to legacy revives them | The alias narrows; legacy rows frozen; reverse parity before a flip back (§6 23-P4) |
| 6 | high | Ownership by a column that defaults to `config` lets raw-inserted rows pass | Ownership decided in code (§2a, §5) |
| 7 | high | Old phones crash on new catalogue rows and on a null `follow_up_hours` | Frozen v1 / 0.2.0 shapes, defaults never null (§2f) |
| 8 | high | No way to know when old phones are gone | `X-AB-Client`, counting, a 30-day zero-hit rule (§2f) |
| 9 | high | The moved messaging section could not save between 26-P3 and 23-P6 | Its own form, gate routes, the rules API (§6) |
| 10 | med | `renewal_alert_remaining` copied and referenced would flap and drop renewal messages | 23-P4 does not copy it (§1, §6) |
| 11 | med | The seeder bumps `updated_at` and the revision on every boot | Update only on difference; `updated_at` only on value or description (§2a) |
| 12 | med | The kind check would abort the seeder on a type change and block the plan's own tests | Lenient check, per-key savepoint, later `VALIDATE` (§2a, §4) |
| 13 | med | Descriptions and overrides would become two sources of truth; old phones would not see edits | An edit writes the override too; one-time copy in a migration (§3) |
| 14 | med | `settings.write` as a super-permission; custom roles would lose notification editing | Base admin for public values and Google; docs/23 grants to the holders of `settings.write` (§2f) |
| 15 | med | The CI migration check came too late and missed Google `live` | Moved to 26-P0, Google keys included (§5) |
| 16 | med | `#integrations` is about Google and is stored in delivered pushes; the OAuth toast would be lost | Permanent redirect to the Google page with the query string (§6 26-P3) |
| 17 | med | 8 e2e UI files depend on the single «حفظ» and on exactly one `role=status` | Updated in 26-P3, and the skeleton uses `aria-busy` (§6) |
| 18 | med | Flipping `meeting_link_auto` inside the reminder window sends a family two links | The confirmation states the number of lessons affected (question 3) |
| 19 | low | The custom key limit was off by one; the ABA problem after delete and re-insert; overrides copied at every boot | `{1,63}` after `custom.` + a first letter; versions from a sequence; copy in a migration (§2a, §3) |

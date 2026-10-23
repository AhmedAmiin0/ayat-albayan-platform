# 26 — Settings redesign: one key/value/description store («القيم») + custom module pages

Owner requests, 2026-10-23: «separate the settings module into config that have all values that could be key value
and give it also a description field and for more complex settings like notifications make a new module», then
«redisgn as archrchtirue and ui ux», then the **decision**: «i want a dynamic key value description config to be used
and seeded with most of the modules and as for the modules that will require a heavey config like notifications make a
custom desgin for it».

**Design only.** Nothing here is built; no migration number is reserved (use the next free numbers at build time;
docs/23 phase 3 holds `20261023000620–629`). Supersedes docs/25 §1 (the five concepts), §5 (recipes) and §6 (Google
rows) once built; docs/25 stays the description of today. Companion files:

- `docs/26a-config-survey.md` — the survey: every key, SQL reader, API route, client (file:line).
- `docs/26b-config-ui.md` — UI/UX: IA, the old → new control map (all 127 controls), states, mobile, design review.
- `docs/design/26-config/` — static mockups: `hub.html`, `values.html`, `values-390.html`, `notifications.html`, `mobile.html`.

## 0. Summary

**Recommendation:** evolve `public.settings` **in place** into the one store (the table keeps its name, key and
`value jsonb`; it gains `module`, `scope`, `description`, type/default mirrors, `version`, `retired_at`). Each module
seeds its keys from its code registry file through a **startup seeder that writes metadata only, never a value**.
Types, defaults and validation stay in code. Admins edit values and descriptions at runtime on one page, «القيم».
Heavy modules keep their own data model and page: **التواصل** (docs/23: numbers, notifications, templates, safety
and the send gate), **التكاملات** (Vault secrets), **مزامنة Google** (docs/24), **المظهر** (per device).
No new permission, no table rename, no change to the 7 SQL readers. The send-gate keys switch last, fail-closed.

## 1. What is CONFIG and what is a MODULE

A value is **CONFIG** (a row of «القيم») when it is all of:
1. **scalar** (number, yes/no, choice, text, time zone, phone, currency, a short list of numbers, or a small fixed
   shape of ≤ 3 scalar fields);
2. **independent** — its meaning does not depend on another row or table being set first;
3. **without relations** — no foreign keys, no per-person or per-record override table it governs alone;
4. **not a secret** (secrets live in Vault only);
5. **without a confirmation flow** — at most one per-value confirmation the registry can declare (`confirm:
   'simple' | 'typed'`); a flow that shows counts, previews, dry runs or a staged switch is a module.

Otherwise it belongs to a named **MODULE**. Classification of every key (details and refs: 26a Part A §1, §3, §5):

| Store / owner | Keys | Count |
|---|---|---|
| **CONFIG → «القيم»** | `booking_horizon_weeks`, `late_cancel_hours`, `makeup_window_days`, `teachers_always_available`, `join_opens_before_min`, `join_closes_after_min`, `default_meeting_title`, `meeting_link_auto`, `report_teacher_edit_hours`, `reporting_currency`, `renewal_alert_remaining`, `subscription_expiry_days`, `flag_future_lessons_when_unpaid`, `payout_count_late`, `payout_count_no_show`, `payout_count_trials`, `fx_fresh_hours`, `upload_max_mb`, `academy_whatsapp_e164`, `academy_timezone`, `feedback_rate_window_min`, `academy_contact`, `recording_consent_notice`, `recording_retention_days`, `activity_retention_days`, `sales_auto_assign`, `quick_reply_window_hours`, `reminder_lookahead_hours` | 28 of 39 |
| **MODULE التواصل → الإشعارات** (docs/23 phase 4, `notification_rules`) | `reminder_minutes_before`, `reminder_24h_enabled`, `teacher_whatsapp_new_student`, `teacher_whatsapp_lesson_reminder`, `follow_up_hours`, `follow_up_slots_from_hours`, `follow_up_slots_to_days`, `feedback_mode` | 8 |
| **MODULE التواصل → السلامة** (send gate; staged switches with counts and warnings) | `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done`, and `comms_source` (added by docs/23 phase 3) | 3 (+1) |
| **MODULE مزامنة Google** (docs/24) | `google_sync_enabled`, `google_sync_mode`, `google_calendar_window_days` (rows in the same table, `scope = module`) | 3 rows |
| **MODULE التواصل → الأرقام / الحماية** (docs/23 phase 3) | the 15 `WA_*`/`KAPSO_*` integration keys, the allow-list and template sync | 17 |
| **MODULE التكاملات** (`integration_config` + Vault, unchanged) | LiveKit, Expo, Web Push, FX, Google OAuth client | 15 |
| **Free values → «قيم مضافة»** (today `custom_config`; no code reads them) | admin-made keys | 0 seeded |
| **Not config** | theme (browser storage); env bootstrap keys (26a Part A §6); per-teacher meeting mode, pay rates, expense categories, roles (records with relations) | — |

Notes. `renewal_alert_remaining` stays CONFIG although docs/23 lists it as the `renewal_due` timing: the SQL view
`v_student_list` reads it (26a Part B §2), so the notification row shows it **by reference** («من القيم» + link)
instead of copying it. `academy_whatsapp_e164` stays CONFIG and is shown read-only on «التواصل → نظرة عامة» as
«الرقم المعلن للأسر». Module-owned rows that live in this table (the 8 + 3 + 3 above) are **visible** in «القيم» under
the filter «تُدار من صفحة أخرى», read-only, each with a link to its page — one store, one place to see every value.

## 2. Architecture (recommended: evolve `public.settings` in place)

### 2a. Table (one expand migration; constraints `NOT VALID`, a pre-check query, then `VALIDATE`)

| Column | Notes |
|---|---|
| `key text pk`, `value jsonb not null`, `updated_at`, `updated_by` | **unchanged**: the 7 SQL readers, ~10 e2e writers, `resetDb` and the generated types keep working |
| `module text not null default 'legacy'` | owning module id (`scheduling`, `classroom`, `payouts`, `notifications`, `communications`, `google-sync`, `custom`…) |
| `scope text not null default 'config'` check in (`config`, `module`, `custom`) | `module` = edited only on its module page; `custom` = admin-made (phase 5) |
| `value_type`, `default_value jsonb`, `is_public bool` | **mirrors** of the code registry, rewritten by the seeder; informational for SQL and humans. Authoritative only for `custom` rows |
| `description_seed text`, `description text`, `description_edited bool` | §3 |
| `version bigint not null default 1` | bumped by trigger when `value` or `description` changes; optimistic concurrency (409) |
| `retired_at timestamptz` | key removed from code: hidden, never deleted |

- Checks: key `^[a-z][a-z0-9_]{1,63}$` (and `^custom\.[a-z0-9_.-]{1,63}$` for `scope = custom`, so an admin key can
  never shadow a code key or a Google row); value ≤ 8 KB; `settings_kind_ok(value_type, value)` (`jsonb_typeof` only,
  JSON null allowed). Bounds stay in zod.
- **Null semantics:** JSON `null` = unset = default, replacing today's "delete the row on null" (PostgREST cannot
  store a JSON null, so writes go through an RPC). All 7 SQL readers and `readSettings` already read a JSON null as a
  missing row (26a Part B §2); an invariant test requires every nullable key's default to be `null`
  (`late_cancel_hours` null = OFF stays OFF).
- RPCs (security definer, `service_role` only): `config_seed(entries jsonb)` (under `pg_try_advisory_xact_lock`;
  `insert … on conflict (key) do update` of metadata columns only — `value` is never in the update list, new rows get
  JSON null); `config_set(changes jsonb, actor uuid)` (one transaction per save; per key `expected_version`;
  refuses `scope = module` keys unless called with that module's id); `settings_revision()` (reads `settings_rev_seq`,
  bumped by a statement trigger; a sequence survives `TRUNCATE`).
- **RLS unchanged:** admin read (`is_admin()`), anon nothing, writes by the service role only. `is_public` never opens
  anon access; public values are still served by the API (`GET /settings/public`).
- **Vault:** unchanged. Integration secrets stay `integration:<KEY>`; docs/23 phase 3 adds `wa_number:<id>:*`. No
  secret ever enters `public.settings` (a test rejects registry keys whose name ends in `_token`, `_secret`, `_key`).

### 2b. Seeding: each module seeds its own keys (owner decision)

A module's keys are declared once, in its registry file `packages/shared/src/settings/domains/<module>.ts`: key, type,
default, bounds, `labelKey`, `hintKey`, `public`, and the new `module`, `group` (page group), `confirm`,
`reachesFamilies`, `ownedBy` (a module page that edits it). **That file is the module's seed.** At API boot the
`ConfigSeeder` sends every entry to `config_seed`: missing keys get a row (value JSON null = default), metadata and
`description_seed` are refreshed, keys gone from code get `retired_at`. It also runs from `pnpm migrate:apply` for
environments without a booted API, and from e2e `seedSettings` after `resetDb`.

- **Never overwrites an edited value** (it never writes `value`; a unit test asserts the SQL; an e2e boots the API
  twice on rows holding `false`, JSON null and nothing, and asserts nothing changed).
- **No per-key seed migration any more** (docs/25 §5 step 3 drifted: 5 keys were never seeded, 26a Part A §8). A key
  read by SQL keeps its `coalesce` default, and `sql-defaults.migration.test.ts` pins `coalesce default = registry
  default` by parsing the latest function bodies.
- A migration that **copies** values (docs/23 phase 4) must apply the registry default to a missing or JSON-null row,
  under the same pinned test, or run in the API like the phase 3 import.

### 2c. Reads: fast and fresh

`ConfigStore` keeps today's one cached promise of all rows (`SETTINGS_CACHE_MS`, default 30 s; e2e 0) and adds a
revision check: when the cache is older than 2 s, one `settings_revision()` call decides whether to reload. Own writes
invalidate at once; raw SQL writes (e2e, Google, psql) are seen within 2 s on **every** instance (today the API runs
one instance and has no Postgres driver, so LISTEN/NOTIFY is not available — 26a Part C §4). A failed read or revision
call is never cached and makes `all()` reject, so a reader fails rather than using stale data.

### 2d. Validation

The code registry (zod) is the only authority for code keys, on write and on read (a malformed stored value reads as
the default, logged once). The DB columns are a mirror, compared to the registry by a test. `custom` rows (phase 5) are
checked against their `value_type` (نص، رقم، نعم/لا، قائمة، JSON ≤ 8 KB); admins cannot define bounds or schemas
(deferred until a custom value has a code consumer, at which point it becomes a code key).

### 2e. NestJS

```
common/config-store/        ConfigStoreModule (@Global)
  config-store.service.ts   rows + cache + revision          config-store.queries.ts  select / rpc
  config-seeder.ts          registry → config_seed           config-entries.controller.ts / .mapper.ts / .audit.ts
  config-parity.ts          old vs new effective values (phase 2–4)
common/settings/            SettingsService kept as the SAME token: a typed facade over ConfigStore; the 28
                            modules/<m>/<m>.settings.ts readers, fakes and the 7 overrideProvider harnesses are unchanged
common/custom-config/       alias controller; in phase 5 a facade over ConfigStore (scope custom, prefix mapped)
common/public-config/       unchanged payload
modules/notification-rules/ docs/23 phase 4 (NotificationPolicy)      modules/academy-numbers/  docs/23 phase 3
modules/google-sync/        google-settings.ts reads/writes through ConfigStore (fresh) instead of raw table calls
```

Boundary rules (tests): `config-store` imports no consumer; `common/settings` and `common/custom-config` import only
`config-store`; ESLint keeps `modules/**` away from `config-store.service` and `settings.service` (readers excepted);
a grep test forbids `from('settings')` / `from('custom_config')` outside `common/config-store`; a test requires every
reader's `KEYS` ⊆ its module's keys ∪ a declared `CROSS_READS` list; `settings/` in shared keeps its boundaries.test.

### 2f. API routes and permissions

| Route | Permission | Notes |
|---|---|---|
| `GET /config/entries` | `settings.read` | every row merged with the registry: key, module, group, type, bounds, value, default, description, seed, edited, public, version, updated at/by (name), `ownedBy`, `confirm` |
| `PATCH /config/entries/:key` `{value, expectedVersion, confirmText?}` | `settings.write` | 409 `conflict` (with the current value and who changed it), 409 `owned_by_module`, 422 `invalid`, 428 `confirmation_required` for `confirm: 'typed'` keys (the server checks the typed text) |
| `PUT /config/entries/:key/description` `{text \| null}` | `settings.write` | null = restore the seeded text |
| phase 5: `POST /config/entries`, `DELETE /config/entries/:key` | `settings.write` | `custom` rows only |
| **Aliases kept, same payloads**: `GET`/`PATCH /settings`, `GET /settings/public`, `GET /config/meta`, `GET`/`PUT`/`DELETE /config/custom[/:key]` | as today | for phones on APK 0.2.0 + OTA bundles (`/settings`, `/settings/public`) and older web tabs; removed only when docs/26b §6 says no phone calls them |
| `/settings/integrations…`, `/admin/google/*`, `/admin/notifications`, `/messages/gate` | as today | module routes, unchanged here |

**No new permission** for «القيم»: `settings.read` / `settings.write` (docs/25 §2) — so no permission seed, no
custom-role data migration, and `access-before.json` only gains the new handlers. docs/23 adds `numbers.manage` and
`notifications.manage` with its own seeding migration and the permissions parity test. The web now checks
`settings.write` before rendering editors (today it does not: 26a Part D §5).

Audit: entity `settings` for code keys (now per key: before/after of one value), `custom_config` for custom keys
(unchanged action names), `describe:<key>` for description edits.

## 3. Descriptions (owner: a description column, seeded by the module, editable by admins)

- **Canonical text stays in `ar.json` / `en.json`** (CLAUDE.md rule 10: clear MSA). The seeder copies the key's
  Arabic hint (`hintKey`) into `description_seed`.
- **Admin edits** go to `description` (`description_edited = true`); «استعادة الوصف الأصلي» clears it. A later
  ar.json wording change reaches `description_seed` on the next boot and shows wherever the admin has not edited.
- **Shown:** Arabic UI `description ?? description_seed ?? t(hintKey)`; English UI `t(hintKey)` (en.json), so the
  page also works right after an e2e truncate or on an older API.
- **translation_overrides are not orphaned:** no i18n key is renamed (labels keep `settings.*`, `config.*`,
  `templates.settings.*`, `sales.assign.*`). Once (phase 3), an existing **ar** override row on a registry `hintKey`
  is copied into `description` (`edited = true`); the translations page then hides those hint keys and links to
  «القيم». The override rows are kept, not deleted.
- **Trade-off (owner question 1):** with one editable description per key, English descriptions are not editable
  in the app (they stay in `en.json`). The alternative is a second column `description_en`.

## 4. Migration: expand → copy → parity → switch reads → contract (docs/23 §2e)

| Step | What | Proof before the next step |
|---|---|---|
| **Expand** | columns, `NOT VALID` checks + pre-check + `VALIDATE`, sequence + trigger, RPCs; types regenerated. Nothing reads them | pre-check query empty on staging; all tests green |
| **Copy** | the seeder fills metadata and `description_seed` (no value is written); JSON null replaces row deletion on writes | e2e: missing row, JSON null and a seeded null give the same `GET /settings`, the same SQL-function results, a closed gate |
| **Parity** | `GET /admin/config/parity` (admin; also run in CI on the e2e DB) compares, for every key, the **legacy** effective value (today's `readSettings` over the rows) with `ConfigStore`'s | empty for ≥ 1 week on staging |
| **Switch reads** | readers move to the facade over `ConfigStore` (no reader file changes); the page «القيم» ships | parity stays empty |
| **Contract** | after ≥ 2 clean weeks: legacy read code removed; phase 5 absorbs `custom_config` (copy as `custom.<key>`, keep the table read-only one release, then drop) | — |

Parity rules (unit fixtures + e2e):
1. **JSON null ≠ missing row as data, equal as meaning**: both read as the default; `late_cancel_hours` null =
   OFF; `recording_retention_days` null = keep forever; `recording_consent_notice` null = no notice.
2. Every key's effective typed value equals in both paths; malformed reads as the default in both.
3. `messaging_enabled` and `auto_messages_enabled` are on **only** for a stored JSON boolean `true` (`"true"`, `1`,
   JSON null, missing, unreadable → off).
4. `comms_source` is `module` only for the exact stored string `"module"`; missing, null or unknown = `legacy`.
5. `/settings` and `/settings/public` payloads are snapshot-equal before and after (old phones).
6. Google rows equal; custom rows (phase 5) byte-equal in value, description, `is_public`.

**Compat paths.** No key, table, column, route, React Query key or i18n key is renamed. SQL readers keep
`select value from public.settings where key = …`. If a later PR renames anything, it ships an alias first (a view or
SQL function for SQL, a route for HTTP, a fallback key for i18n) and removes it only at contract.

## 5. Send-gate and messaging-safety keys: last, fail-closed

`messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done`, `comms_source` keep their rows and their own
controls (`scope = module`, `module = communications`). `PATCH /config/entries` refuses them (409 `owned_by_module`).
Until phase 4 of this plan, `SendGate` keeps today's exact read (`=== true`, a read error rejects). Phase 4 switches it
to `ConfigStore` with a fresh revision check, alone in its PR, with tests: **off** when the row is missing, JSON null,
a string, a number, malformed, only present in a stale cache, or when the read or revision call fails; **on** only for
a stored `true`. No migration writes these keys (a CI check fails on any new migration that names them); the seeder
never writes a value; an e2e on a copy of staging-shaped data (fake families) boots twice and asserts the gate stays
closed and no `messages` row is created. Staging has `messaging_enabled = false` and real families: nothing in this
plan turns sending on.

## 6. Build phases (each a shippable PR with rollback) and their place among docs/23 phases 3–7

Order: **23-P3 → 26-P1 → 23-P4 → 26-P2 → 26-P3 → 23-P5 → 23-P6 → 26-P4 → 23-P7 + 26-P5**.

| # | PR | Scope | Rollback |
|---|---|---|---|
| 23-P3 | numbers as records (in progress) | adds `comms_source` as a registry key | its own |
| **26-P1** | Expand | §2a columns, checks, sequence, RPCs, generated types; registry gains `module`/`group`/`confirm`/`ownedBy`. Inert | revert; columns are unused (drop in a later migration only if wanted) |
| 23-P4 | notification rules | copies the 8 notification keys from `settings` into `notification_rules` with **today's** semantics (missing = registry default, pinned test); the 8 rows get `scope = module, module = notifications` | its own |
| **26-P2** | Seeder + atomic writes + parity | `ConfigSeeder`, `config_set` (JSON null), revision freshness, `/admin/config/parity`, null-parity e2e | revert the code; rows keep their values (only metadata was written) |
| **26-P3** | «القيم» + hub | `/config/entries` routes, web hub + «القيم» + description dialog, mobile «القيم», today's messaging section moved unchanged to a «التواصل» page until 23-P6, old anchors redirect, translation-override copy | revert web/mobile; aliases never left |
| 23-P5, 23-P6 | routing per number; `/admin/communications` | P6 uses the docs/26b design for «الإشعارات» | their own |
| **26-P4** | Send gate last | `SendGate`/`auto_messages` read through `ConfigStore` (fresh), fail-closed tests, migration check | revert to the legacy read (one file) |
| 23-P7 + **26-P5** | Contract | legacy keys and read code removed after ≥ 2 clean weeks; `custom_config` absorbed as «قيم مضافة» | down-migration copies `custom.*` back |

**Why 23-P4 before 26-P2:** 23-P4's copy is a one-shot SQL read of `public.settings`, designed and tested on today's
semantics (no JSON-null rows except the `late_cancel_hours` seed). Running 26-P2 first would change its source (JSON
null instead of missing rows) after its tests were written. 26-P1 is inert, so it can land any time after 23-P3. If
23-P4 slips, 26-P2 may go first, and then 23-P4's copy must treat JSON null as missing (`nullif(value, 'null')`,
covered by the same pinned test).

## 7. Assumptions (the owner's message ended with «but …»; any of these may be what it meant)

1. «Most of the modules» = the 28 scalar keys above; notifications, numbers, the send gate, integrations and Google
   are the heavy modules; appearance stays per device.
2. «Dynamic» = values and descriptions change at runtime without a deploy, and admins can add their own keys
   (phase 5) — but a new key that **code** reads still needs a code change (its type and default live in code).
3. Keys keep their names (no `module.key` renames), so old phones, SQL, audit history and translations stay valid.
4. One description per key, Arabic editable; English from `en.json` (question 1).
5. Module-owned values are visible read-only in «القيم» and edited only on their module page.
6. One save model: each value saves on its own (the page-wide «حفظ» goes; it silently overwrote other admins' edits).
7. No new permission for «القيم»; docs/23 brings `numbers.manage` / `notifications.manage`.

## 8. Questions for the owner (each with a recommended default)

1. **Description language.** (a) one editable Arabic description per key, English from the translation files —
   **recommended** (the academy works in Arabic; no extra column); (b) editable Arabic and English (a second column).
2. **«قيم مخصصة».** (a) fold into the same store as «قيم مضافة» with simple types (نص، رقم، نعم/لا، قائمة، JSON), in
   the last phase — **recommended**; (b) keep it separate as today; (c) let admins define bounds and choices per key
   (a schema builder: about twice the work, and no code reads these values today).
3. **Confirmations on values that delete data or change every booking** (`recording_retention_days`,
   `activity_retention_days`, `teachers_always_available`, `meeting_link_auto`). (a) typed confirmation for the two
   that delete data, a plain confirmation for the two booking-wide switches — **recommended**; (b) typed for all
   four; (c) none (as today).
4. **Editing on the phone.** (a) scalar values editable on the mobile admin with the same confirmations; lists and
   small forms read-only («عدّلها من الموقع») — **recommended**; (b) read-only on the phone.
5. **Your message ended with «but …».** Which assumption in §7 did you mean to qualify? Default: proceed as written.

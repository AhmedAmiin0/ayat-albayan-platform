# 25 — Settings and config: who owns what

> **Superseded by the design in `docs/26-config-redesign.md`** (one key/value/description store «القيم» + module pages) once it is built; until then this document describes the code as it is.

The platform has five kinds of configuration. They used to share one folder name («config») and one
page, which made it hard to tell which store a value lives in, who may change it and how a change
reaches the code. Since the settings segregation refactor (October 2026, behaviour unchanged) each
kind has its own name, its own folders and its own route, listed below. The rest of this document
keeps to these five words.

## 1. Vocabulary

| Concept | What it is | Store | shared (`packages/shared/src`) | API (`apps/api/src`) | Web (`apps/web/src`) / mobile | Routes | Permission | i18n prefix |
|---|---|---|---|---|---|---|---|---|
| **settings** | The academy's typed policy values (registry entries with a type, a default and a label): booking horizon, reminder minutes, payout rules, upload limit… | `public.settings` (`key`, `value jsonb`) | `settings/`: `defs.ts`, one registry file per owner in `domains/*.ts`, `registry.ts`, `layout.ts` (page order), `schema.ts` (write side), `validate.ts` (read side), `public.ts`, `meta.ts` | `common/settings/` (`SettingsModule`, global: `SettingsService` storage + cache, `SettingsController`, `SettingsMetaController`), plus one reader per module: `modules/<m>/<m>.settings.ts` | `features/settings/` (owns `/admin/settings`), `components/settings/` (page kit), `lib/settings-api.ts`, `lib/query-keys.ts`, `lib/use-setting-switch.ts`; mobile `src/ops/` (`/more/ops/settings`) | `GET`/`PATCH /settings`, `GET /config/meta` (legacy name) | `settings.read` / `settings.write` | `settings.*` (plus the legacy `templates.settings.*`, `config.*`, `sales.assign.*` labels) |
| **custom-config** | Free-form key → JSON values an admin adds by hand («قيم مخصصة»), optionally public | `public.custom_config` (`key`, `value jsonb`, `description`, `is_public`) | `custom-config/` (`CUSTOM_KEY_RE`, `customKeySchema`, `customConfigUpsertSchema`, `CustomConfigView`, `publicCustom`) | `common/custom-config/` (`CustomConfigModule`, exports `CustomConfigService`) | `features/custom-config/` (a plug-in of the settings page) | `GET`/`PUT`/`DELETE /config/custom[/:key]` (legacy name) | `settings.read` / `settings.write` | `config.custom.*` |
| **public-config** | The read model anyone may load before login: the public settings plus the public custom values. No store of its own | — (joins the two above) | `public-config.ts` (`PublicConfig`, `PUBLIC_CONFIG_PATH`, `PUBLIC_CONFIG_QUERY_KEY` `['settings','public']`, `PUBLIC_CONFIG_STALE_MS` 300000, `withPublicDefaults`) | `common/public-config/` (`PublicConfigModule`, `PublicConfigController`, `Cache-Control: public, max-age=60`) | web `lib/public-config.ts`, mobile `src/lib/public-config.ts` (`publicConfigQuery`, `usePublicConfig`, `useJoinWindow`, `useUploadMaxBytes`, `usePlatformClassroom`) | `GET /settings/public` | none (`@Public`) | — |
| **integrations** | Credentials and endpoints of outside services (WhatsApp lines, Kapso, LiveKit, Expo, web push, FX, the Google OAuth client) that an admin may store in the database instead of the server `.env` | plain: `public.integration_config`; secret: Supabase Vault `integration:<KEY>` | `integrations/` (`keys.ts`, `checks.ts`, `views.ts`) | `common/integrations/` (`IntegrationConfigModule`, global; `integration-overlay.ts`, `integration-refresh.ts`); laid over `process.env` by `loadEnv()` | `features/integrations/` (a plug-in of the settings page, «التكاملات») | `GET`/`PUT /settings/integrations`, `PUT`/`DELETE /settings/integrations/secrets/:key` | `settings.read` / `settings.write` | `integrations.*` |
| **env** (bootstrap) | What the API needs before it can reach the database, plus infrastructure knobs | the server `.env` / process environment only | — | `env.ts` (the zod schema, `loadEnv()`), `env.blank.ts` (blank = unset), `env.<topic>.ts` shapes | — | none | none (server access) | — |

**One rule per store.** A value has exactly one home: a policy the academy tunes is a *setting*; a
value without code behind it is a *custom value*; a credential or endpoint of another service is an
*integration key*; anything needed to boot or to reach Postgres is *env*. *public-config* is never
written; it only reads.

## 2. Legacy names kept on purpose

These names say «config» or «settings» for historical reasons. They stay, because renaming them
changes a contract that other code or data depends on:

| Name | Now belongs to | Why it stays |
|---|---|---|
| `GET /config/meta` (Swagger tag `config`) | settings (`SettingsMetaController`, `common/settings/settings-meta.*`) | the web page and e2e call it; React Query key `['config','meta']` |
| `/config/custom[/:key]` (tag `config`) | custom-config | web `custom-api.ts`, e2e; key `['config','custom']`; audit entity `custom_config` |
| `/settings/integrations` | integrations | web `integrations-api.ts`, e2e; React Query key `['settings','integrations']`; audit entity `integration_config` |
| the `#integrations` hash on `/admin/settings` (the section's DOM id is `settings-integrations`) | integrations | the Google OAuth callback redirects to it and the web reads it back (`use-oauth-return.ts`); fixing the mismatch is a separate behaviour change |
| i18n `config.*` (page chrome: sections, search, reset, dirty, danger, changed; `config.custom.*`) and `templates.settings.*`, `sales.assign.*` (registry labels and switches) | settings / custom-config | `translation_overrides` rows reference i18n keys by name, so a rename would orphan the admin's translations, and fixing them needs a migration |
| `settings.read` / `settings.write` for all four admin concepts | — | per-concept permissions need seeding migrations; the refactor creates none |
| `SETTINGS_CACHE_MS` as the default integration refresh | integrations | unchanged behaviour; `INTEGRATION_REFRESH_MS` only overrides it when set |

The refactor created and edited no migration, so no DB key, check, default or Vault name changed.

## 3. Dependency graph and its boundary tests

```
shared   settings/ ◄── custom-config/ ◄── public-config.ts
            ▲  ▲  ▲
            │  │  └── classroom/join-window.ts, notifications/catalogue-settings.ts
            │  └───── google/settings-keys.ts (disjoint from the registry, test only)
            └──────── (integrations/ is independent of settings)

api      SettingsModule (@Global: SettingsService)
            ▲ injected by
            ├── PublicConfigModule ──► CustomConfigModule
            └── modules/<m>/<m>.settings.ts readers ◄── the module's services
         IntegrationConfigModule (@Global) ──► integration-overlay ◄── env.ts loadEnv()

web      routes/admin/settings.tsx ──► features/settings ──► features/{messaging, custom-config, integrations, templates}
                                              │                       │ (plug-ins)
                                              └──────► components/settings, lib/{settings-api, query-keys, use-setting-switch} ◄──┘
```

Arrows point at what is imported. Nothing points back:

- `packages/shared/src/settings/boundaries.test.ts`: `settings/` imports nothing from `custom-config`, `integrations`, `google`, `public-config`, `notifications` or `classroom`. `settings/exports.test.ts` pins the root export names and `settings/layout.test.ts` pins the page order.
- `apps/api/src/common/config-boundaries.test.ts`: `common/settings` never imports `custom-config` or `public-config`; `common/custom-config` never imports `settings`; `common/config/` no longer exists.
- ESLint (`apps/api/eslint.config.mjs`, `no-restricted-imports`): under `src/modules/**` only readers (`*.settings.ts`), tests, fakes and test apps may import `common/settings/settings.service`.
- `apps/web/src/features/settings/boundaries.test.ts`: no file outside `features/settings` imports it; `components/settings` and `lib` import no feature folder.
- `apps/api/src/common/auth/parity/permissions.parity.test.ts` with `access-before.json`: the same permissions on the same handlers.

## 4. The per-module reader rule (API)

A module that reads academy settings does it through one reader, `modules/<m>/<m>.settings.ts`:

```ts
const KEYS = ['report_teacher_edit_hours', 'late_cancel_hours'] as const satisfies readonly SettingKey[];
export type ReportsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;
@Injectable()
export class ReportsSettings {
  constructor(private readonly store: SettingsService) {}
  read(): Promise<ReportsSettingsValues> { return readSlice(this.store, KEYS); }
}
```

- The keys a module depends on are listed in one place, and the type only exposes those keys.
- Readers call only `store.all()` (one cached read). `SettingsService` keeps its token and cache, so `overrideProvider(SettingsService)` harnesses keep working.
- Every reader has a `.settings.test.ts`: `read()` returns exactly `KEYS`, defaults filled. Other tests use `readerOf(Reader, over)` or `fakeSettings(over)` from `common/settings/settings.fakes.ts` and never pass partial blobs.
- Register the reader in the module that provides the consuming class, and in every module that does. Today each consumer is provided once: `TeacherMeQueries` by lessons (inbox gets it through the lessons export), `SendGate` by the global whatsapp module (notification-rules uses it from there). A missed registration fails Nest boot loudly.
- The notification catalogue reads only `CATALOGUE_SETTING_KEYS` (`CatalogueSettings`, shared).

## 5. Recipes

### Add a setting
1. Add the entry to its owner's file in `packages/shared/src/settings/domains/<domain>.ts` (type, default, bounds, `labelKey`, optional `hintKey`, `public: true` only if anyone may read it, `form: false` if it gets its own control). If SQL reads the row, say so in the file's comment.
2. Place the key in `SETTINGS_LAYOUT` (`settings/layout.ts`), in its section and page order. `layout.test.ts` requires every key exactly once.
3. Write a seeding migration (`insert into public.settings … on conflict (key) do nothing`). Any SQL reader's `coalesce` default must equal the registry default.
4. Add the `labelKey`/`hintKey` texts to `packages/shared/i18n/ar.json` (clear Modern Standard Arabic) and `en.json` (parity is tested).
5. Add the key to the consuming module's reader `KEYS` (section 4). PATCH `/settings` accepts its camelCase field without further work; the web field appears from the registry. The mobile form (`apps/mobile/src/ops/settings-form.ts`) is maintained by hand, so add the field there too if it belongs on the phone.

### Add a custom value
No code. An admin adds it in «قيم مخصصة» (`PUT /config/custom/:key`): the key matches `CUSTOM_KEY_RE` and must not be a registry key (`reserved_key`); the value is JSON of at most 8 KB. When marked public it appears under `custom` in `GET /settings/public`. Once code depends on a value, make it a setting.

### Add an integration key
1. `packages/shared/src/integrations/keys.ts`: add it to `INTEGRATION_PLAIN_KEYS` or `INTEGRATION_SECRET_KEYS` and to `GROUP_OF`; add its form check in `checks.ts`.
2. The env schema (`apps/api/src/env.ts` or its `env.<topic>.ts` shape) must define it, using `env.blank.ts`'s helpers: `validOverlay` checks each database value against that key's schema and drops a bad one.
3. A **secret** key needs a new migration that re-creates `public.integration_secret_key_ok` with the full list (never edit an old migration). `apps/api/src/common/integrations/secret-keys.migration.test.ts` reads the latest definition and fails until it matches `INTEGRATION_SECRET_KEYS`. A plain key needs no migration.
4. Add `integrations.keys.<KEY>.label` / `.hint` to `ar.json` and `en.json`; update the key table in docs/09 «Integration config in the database».
5. Read it from `loadEnv()` per call, never once at boot, so a saved value applies without a restart. `pnpm --filter api config:import-env` copies it from env automatically.

### Add a bootstrap env key
Add it to the schema in `apps/api/src/env.ts` (blank = unset through `env.blank.ts`), then a line in `apps/api/.env.example` and the «Stays in env» row in docs/09. It must not be an integration key. `env.ts` is close to the 150-line cap, so a group of related keys gets its own `env.<topic>.ts` shape spread into the schema (as `env.kapso.ts`, `env.google.ts` and `env.web-push.ts` are). The meta-callers whitelist names env files by path.

## 6. Rows google-sync owns

`google_sync_enabled`, `google_sync_mode` and `google_calendar_window_days` are `public.settings` rows outside the registry (`GOOGLE_SETTING_KEYS`, `packages/shared/src/google/settings-keys.ts`, seeded by migration `20261022000610`). `GET`/`PATCH /settings` never list them; only `PUT /admin/google/settings` (admin, `settings.write`) writes them. `settings-keys.test.ts` keeps them disjoint from the registry. Folding them into the registry would change the `/settings` payloads and audit rows, so it is left out on purpose.

## 6a. A registry row with its own guarded writer

`comms_source` (docs/23 phase 3, `settings/domains/messaging.ts`) is a registry entry with `form: false` and
`patch: false`: `GET /settings` lists it, but `settingsUpdateSchema` leaves it out, so `PATCH /settings`
drops it. Its only writer is `POST /admin/communications/source` (`numbers.manage`), through
`NumbersSettings.writeSource` (`modules/numbers/numbers.settings.ts`), which refuses `module` while
`GET /admin/communications/parity` lists a difference. It never reads or writes `messaging_enabled`.

## 7. Refresh periods

- Settings: `SettingsService` caches every row for `SETTINGS_CACHE_MS` (default 30 s; e2e 0) and clears the cache on its own writes.
- Integrations: `IntegrationConfigService` reloads at boot, after each admin save and every `integrationRefreshMs(env)`: `INTEGRATION_REFRESH_MS` when set, else `SETTINGS_CACHE_MS` (at least 1 s); never when `INTEGRATION_CONFIG_FROM_DB=false`.
- Numbers (docs/23 phase 3): `NumbersConfig` reloads `comms_source` and, in module mode only, the default numbers and their Vault secrets at boot, on the integration refresh period and after every numbers write; never when `INTEGRATION_CONFIG_FROM_DB=false`.
- Public config: the clients keep `['settings','public']` for 5 minutes; the API answers with `max-age=60`.

## 8. Where the e2e settings writers live

- `e2e/support/settings.ts`: `snapshotSettings`, `restoreSettings`, `settingText`.
- `e2e/support/template-registry.ts`: template snapshot/restore, `setTemplateStatus`, `templateRow`, `stubTemplates`.
- `e2e/support/message-queue.ts`: `queuedCount`, `clearQueue`, `queueText`, `queueRenewal`, `messageState`, `sentToDigits`.
- Older writers kept where they are, to avoid touching about 25 specs: `setSetting` (`support/messages.ts`), `setMessaging` (`support/wa-stub.ts`), `setSettingTx` (`support/pay-rule.ts`), `setLateCancelHours` (`support/schedule-extra.ts`), `seedSettings` (`support/db.ts`), `resetGoogle` (`support/google.ts`), `autoMessages` (`tests/edit-session-time.helpers.ts`). The e2e API runs with `SETTINGS_CACHE_MS=0`, so their SQL writes apply at once.

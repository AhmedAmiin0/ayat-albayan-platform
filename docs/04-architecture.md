# 04 — Technical Architecture

## 1. Stack (fixed)

| Layer | Choice | Notes |
|-------|--------|-------|
| Monorepo | **Turborepo** + pnpm workspaces | `turbo run build test lint typecheck e2e` with remote cache |
| Database / Auth / Storage | **Supabase** (Postgres 15, Auth, Storage, Realtime, pg_cron, Vault) | Migrations as SQL in `packages/db/supabase/migrations`; types generated to `packages/db/src/types.ts` |
| API | **NestJS 10** (TypeScript, Fastify adapter) | Owns all business logic & WhatsApp webhooks. Talks to Postgres via `postgres.js`/Kysely + Supabase service client for Storage/Auth admin |
| Web (admin + teacher + guardian portal) | **React 18 + Vite + TanStack** (Router, Query, Table, Form) + Tailwind + shadcn/ui (RTL) | Single app, role-based routes |
| Mobile (admin) | **Expo SDK 51+ / React Native**, expo-router, TanStack Query, expo-notifications | EAS Build; same `packages/api-client` |
| Shared | `packages/shared` (zod schemas, enums, i18n ar), `packages/api-client` (typed fetch from OpenAPI), `packages/ui` (web only), `packages/config` (eslint/tsconfig/prettier) | |
| Messaging | Meta WhatsApp Cloud API v20+ | Webhook → Nest; outbound via Nest `MessagingModule` |
| PDF | `@react-pdf/renderer` or Playwright-Chromium HTML→PDF in Nest worker | Arabic fonts (Amiri / Noto Naskh), RTL |
| Jobs | BullMQ (Redis on Upstash) **or** pg-boss on Supabase Postgres (preferred: no extra infra) | Reminders, PDF generation, calendar mirror |
| Testing | Vitest (web, packages), Jest (Nest), Supertest (API e2e), **Playwright** (web e2e), jest-expo + RNTL (mobile) | |
| CI | GitHub Actions: turbo lint/typecheck/test/e2e; Supabase CLI local stack in CI | |
| Hosting | API: Fly.io / Railway (Docker); Web: Vercel; Mobile: EAS | |

## 2. Repository layout

```
ayat-albayan/
├─ apps/
│  ├─ api/                 # NestJS
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ common/        # guards, interceptors, filters, pipes, dto helpers
│  │     └─ modules/
│  │        ├─ auth/        ├─ leads/        ├─ students/     ├─ teachers/
│  │        ├─ scheduling/  ├─ lessons/      ├─ reports/      ├─ subscriptions/
│  │        ├─ payments/    ├─ messaging/    ├─ calendar-mirror/ ├─ dashboard/
│  │        └─ jobs/        # queue processors
│  ├─ web/                 # React + TanStack
│  │  └─ src/
│  │     ├─ routes/        # file-based TanStack Router (admin/, teacher/, portal/)
│  │     ├─ features/<feature>/{components,hooks,api,schemas}
│  │     ├─ components/ui/ # shadcn
│  │     └─ lib/
│  └─ mobile/              # Expo
│     └─ app/              # expo-router: (auth)/, (tabs)/inbox, today, students, payments
├─ packages/
│  ├─ db/                  # supabase/ (config, migrations, seed), generated types, Kysely schema
│  ├─ shared/              # enums, zod schemas, constants, i18n/ar.json, utils (phone, arabic-normalize, tz)
│  ├─ api-client/          # OpenAPI-generated typed client + TanStack Query hooks factory
│  ├─ ui/                  # web design system (RTL), tokens
│  └─ config/              # eslint-config, tsconfig, prettier, vitest preset
├─ tools/
│  ├─ migrate/             # Google Sheets → Supabase import (dry-run + apply)
│  └─ scripts/
├─ e2e/                    # Playwright project (web), fixtures, seeds
├─ turbo.json  pnpm-workspace.yaml  package.json  .github/workflows/ci.yml
└─ CLAUDE.md  docs/
```

## 3. Database schema (Supabase / Postgres)

All tables: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`, `created_by`. RLS enabled. `auth.users` ↔ `profiles(role)`.

```sql
-- identity
profiles(id uuid pk refs auth.users, role text check (role in ('admin','teacher','guardian')), full_name, phone_e164 unique, locale default 'ar', tz default 'Asia/Riyadh')

teachers(id, profile_id refs profiles, display_name_ar, display_name_en, gender, programs text[], phone_e164, meeting_link, meeting_mode text null check in ('static','platform') -- null = follow settings.meeting_link_auto (the academy default), migration 20261019000490; trigger teachers_relink_lessons copies a changed meeting_link onto future open lessons that had the old link or none (a platform teacher's families need lesson_join_link approved), rate_30 int, rate_45 int, rate_60 int, rate_90 int, max_students int, status, google_calendar_id, mirror_enabled bool)
teacher_availability(id, teacher_id, weekday smallint 0-6, start_time time, end_time time, tz)
teacher_time_off(id, teacher_id, starts_at timestamptz, ends_at timestamptz, reason)

guardians(id, profile_id nullable, name, phone_e164 unique, country, tz, source lead_source, notes)
students(id, code text generated unique 'AB-' || lpad(seq), guardian_id, name, name_normalized, age, gender, program, level, memorized, goal, riwaya, tz, status, teacher_id nullable, meeting_link_override, notes)
student_merges(id, kept_id, merged_id, merged_by, at)

-- sales
leads(id, phone_e164 unique, name, source, status lead_status, tz, qualification jsonb, assigned_to, last_inbound_at, last_outbound_at, next_follow_up_at, converted_guardian_id)
job_applicants(id, phone_e164, name, status, cv_url, recitation_url, notes)

-- scheduling
schedule_rules(id, teacher_id, duration_min, start_time_local time, tz, byday smallint[], starts_on date, ends_on date nullable, status, meeting_link, created_from_lead_id)
schedule_rule_students(rule_id, student_id)              -- group lessons
lessons(id, rule_id nullable, teacher_id, starts_at timestamptz, ends_at timestamptz, status lesson_status, meeting_link, cancel_reason, confirmed_at, confirmed_by, google_event_id, unique(rule_id, starts_at))
lesson_students(lesson_id, student_id, attendance attendance nullable, chargeable bool default true, primary key(lesson_id, student_id))

-- reports
lesson_reports(id, lesson_id, student_id, teacher_id, attendance, recited, new_memorization, revision, theory, grade_recitation grade, grade_memorization grade, grade_revision grade, grade_tajweed grade, grade_engagement grade, grade_commitment grade, grade_overall grade, notes, homework, next_plan, version int, submitted_at, pdf_path, sent_at, unique(lesson_id, student_id))
report_attachments(id, report_id, storage_path, mime)

-- money
subscriptions(id, student_id, package package_size, price numeric, currency default 'SAR', lessons_total int, starts_on, status subscription_status, renews_on, notes)
payments(id, subscription_id, amount, currency, method, paid_at, receipt_path, recorded_by, note)
expenses(id, month date, category text, amount, currency, note)       -- ads/content/tools
teacher_payouts(id, teacher_id, month date, lessons_count, amount, status, paid_at)

-- messaging
message_templates(id, key text unique, meta_name, language, body_ar, variables text[], category, status, last_checked_at)
messages(id, direction, channel default 'whatsapp', phone_e164, lead_id nullable, guardian_id nullable, lesson_id nullable, template_key nullable, body, wa_message_id, status, error_code, error_text, dedup_key unique nullable, scheduled_for, sent_at, delivered_at, read_at)

chat_lists(id, name 1–30 trimmed, name_key unique (normalizeArabic), created_by, created_at, updated_at)   -- «القوائم», ≤ 30 (docs/22)
chat_list_threads(list_id refs chat_lists on delete cascade, phone_e164 E.164, added_by, added_at, primary key(list_id, phone_e164))

-- system
audit_log(id, actor_id, entity, entity_id, action, before jsonb, after jsonb, at)
settings(key pk, value jsonb, updated_at, updated_by)   -- the academy settings (registry: packages/shared/src/settings/domains/*.ts), plus the 3 google_* rows google-sync owns
custom_config(key pk check '^[a-z][a-z0-9_.-]{1,63}$', value jsonb ≤ 8 KB, description, is_public, updated_at, updated_by)   -- «قيم مخصصة»; is_public rows join GET /settings/public
integration_config(key pk check '^[A-Z][A-Z0-9_]{2,63}$', value text ≤ 4 KB, updated_at, updated_by)   -- plain integration keys; secrets in Vault `integration:<KEY>` (allow-list integration_secret_key_ok)
```

Settings, custom values, the public config, integrations and bootstrap env are five separate concepts, each with its own store, folders and routes: docs/25-settings-and-config.md.

Derived views: `v_subscription_balance` (lessons_used = count completed chargeable), `v_lesson_sequence` (row_number per student), `v_funnel`, `v_teacher_load`.

RLS sketch: admin → all; teacher → `teacher_id = auth.uid()`-joined rows; guardian → own students. API uses service role and enforces the same rules in guards (defence in depth).

## 4. NestJS module responsibilities

| Module | Key services (each file ≤150 lines, ≤3 params → use DTO/option objects) |
|--------|--------------------------------------------------------------------------|
| `auth` | Supabase JWT guard, `RolesGuard`, magic-link issue for guardians |
| `leads` | `LeadsService` upsert-by-phone, status transitions, `FollowUpScheduler` |
| `students` | CRUD, `DuplicateDetector` (phone + `normalizeArabic`), `MergeService` |
| `teachers` | CRUD, availability, `AvailabilityQuery.freeSlots({teacherId, from, to})` |
| `scheduling` | `RuleService`, `OccurrenceGenerator` (idempotent upsert, horizon), `ConflictChecker`, `BookingWizardService` (single transaction) |
| `lessons` | status machine (`LessonStateMachine.transition(lesson, event)`), attendance, reschedule |
| `reports` | `ReportService` (draft/submit/version), `ReportPdfJob`, `ReportDeliveryJob` |
| `subscriptions` | balance view, alerts job |
| `payments` | record payment, payouts calculator |
| `messaging` | `WhatsappClient` (Cloud API), `TemplateRegistry` (health check), `ReminderScheduler` (cron */5), `WebhookController` (signature verify) |
| `chat-lists` | «القوائم» (docs/22): `ChatListsService` (shared academy lists, 409 `list_name_taken` / `list_limit`), `ChatListsQueries`; GET /threads?list= and the thread's `lists` via `inbox/chat-list-filter.ts` |
| `calendar-mirror` | optional Google Calendar upsert by `lesson_id` extended property |
| `dashboard` | funnel, load, finance aggregates |
| `jobs` | pg-boss workers; all jobs idempotent with dedup keys |

OpenAPI generated from Nest decorators → `packages/api-client`.

## 5. Web app (React + TanStack)

- Router: file-based, three layout groups `/admin`, `/teacher`, `/portal/:token`.
- Query: one `queryKey` factory per feature in `packages/api-client`; mutations invalidate by key; `persistQueryClient` on mobile only.
- Table: TanStack Table for inbox, students, lessons, payments (server pagination/sort/filter).
- Table sort + filter (every list column; `components/DataTable.tsx`):
  - **Server tables** (paginated, R-NFR-08): column `meta.sortKey` (the API key) and `meta.filter` (`{ kind: 'text' }` or `{ kind: 'select', options }`, key `meta.filterKey ?? column id`). The route keeps `sort`, `dir` (only `desc`; asc is the default) and `f_<key>` in its search params (`lib/list-search.ts`: `parseSortSearch`, `parseFilterSearch`, `toSortSearch`, `toFilterSearch`; defaults stay out of the URL) and passes `sort={{ key, dir, onChange }}` / `filters={{ values, onChange, onClear }}` (`onClear(keys)` drops several filters in one navigation, for «مسح الكل»); `api.ts` appends `sortFilterParams(...)`. The API spreads `listSortShape([...keys])` (`@ab/shared`) into its list query schema and orders with `applySort(query, sort, { columns, fallback })` (`apps/api/src/common/list-sort.ts`): an allowlist key → column map, with the default order as tiebreaker so paging is stable. Text filters use `ilikeContains()` with `.ilike()`.
  - **Client tables** (small, fully loaded lists): `clientSort` (every accessor column; Arabic collation, numbers numerically) and `clientFilter` (`meta.filter`: text contains, Arabic-normalised; select exact). Example: `features/pricing/PlansTable.tsx`.
  - Header clicks cycle asc → desc → none (`aria-sort` on the `<th>`). Filters (owner, 2026-10-05: "the filters UI are too complicated") live in one toolbar above every table (`components/table-toolbar/`, rendered by DataTable): a single search box (the page's own via `toolbar.search`, else the column text filter marked `meta.search`, else the first one), one «تصفية» button with the count of set filters that opens every other filter in the Dialog panel (aside from 640px, full-screen sheet on phones; «عرض النتائج» closes, «مسح الكل»), and the set filters as removable chips («المعلم: أبرار ×») under the row. Filters apply as they change (URL state unchanged). A page's own filters (students status/teacher/program…, payments student/range/kind, invoices range, subscriptions status) join the same panel and chips through `toolbar.extra` (`ExtraFilters`: fields, chips, `onClearAll(columnKeys)`; helpers in `table-toolbar/fields.tsx`). Segmented controls that switch the page's primary view (leads status tabs, inbox «الكل / غير مقروءة», earnings sessions status) stay where they are.
- Form: TanStack Form + zod schemas from `packages/shared` (same schemas validate API DTOs).
- Key screens: Inbox (thread + templates), Booking wizard (student → teacher → slot grid → package), Schedule (week view per teacher, drag to reschedule), Student profile (timeline), Report form (prefilled), Subscriptions & payments, Dashboard, Settings (templates health, reminder offsets).
- RTL: `dir="rtl"` root, logical CSS props only, Arabic font stack.

## 6. Mobile app (Expo, admin)

- expo-router tabs: Inbox · Today · Students · Payments · More.
- **Who signs in** (R-AUTH-01, owner 2026-10-12): four roles, each its own tree behind `Stack.Protected` in `app/_layout.tsx` (gate: `src/auth/verify-role.ts`, `/auth/me` then the token's `user_role` claim offline): `admin` → `app/(tabs)`, `teacher` → `app/teacher`, `sales` → `app/sales` (المحادثات، الطلاب، جدول الحلقات، المزيد), `assistant` → `app/assistant` (حلقاتي، المزيد). `guardian`/`student` get «wrongApp». The sales and assistant trees reuse the shared screens (inbox, thread in sales mode, sales pages, classroom join, meetings); `src/nav/tree-base.tsx` moves their links under `/sales` or `/assistant`. They register for push only when `/auth/me` lists `notifications.push` (`usePushRegistration('sales' | 'assistant')`), and show the bell only then (`src/notifications/HeldBell.tsx`, docs/16 M7); a 403 from `PUT /me/push-tokens` is swallowed.
- Push via expo-notifications; server stores Expo push tokens in `profiles.push_tokens`.
- **Push devices: who may receive** (owner 2026-10-25, migrations `20261025000700` and `20261025000720`): each app token (`push_device_sessions`) and browser (`web_push_subscriptions.session_id`) is bound to the auth session that registered it; only a live session's devices get a push, and a session's end, a disabled profile or a role change unbinds them. **No takeover:** a token or endpoint bound to ANOTHER profile's live session is never re-bound on the token alone. It moves only when (a) that session has ended, or (b) the request proves it comes from that same device: for the app, the device key the API minted at the device's last `PUT /me/push-tokens` (answered `{ deviceKey }`, kept in AsyncStorage `push.deviceKey` across sign-outs, stored server-side as its sha256 only); for a browser, the subscription's own `p256dh` and `auth` keys (readable by their holder only). Otherwise `PUT` answers 409 `push_device_in_use`, the binding stays but is marked **contested** (`contested_at`: no push to it until its own profile registers it again, since the phone may be in someone else's hands now), and the app silences the OS push on a 409 (`apps/mobile/src/core/push/device-key.ts`) (`common/push/push-claim.ts`, `common/push/web-push.claim.ts`; the app-token check, decision and write are one locked statement, migration `20261025000730`'s `claim_push_device`, called from `modules/me/push-device.claim.ts`). Known limits, **accepted by the owner (2026-10-25)**, all fail closed (nobody receives another person's alerts; at worst the rightful person misses their own until the app registers again): a phone with no device key yet (bound before 720) whose previous user's sign-out never reached the server cannot register for its new user until that session ends, and GoTrue sessions here have no `timebox` / `inactivity_timeout`; a token harvested before 720 can still be claimed while it has no live binding (real proof of possession would need a nonce push through Expo); a holder can be kept contested by repeated key-less claims of a known token (no push until it registers again); `push_live_sessions` still counts a session whose refresh tokens GoTrue revoked. The legit hand-over (a teacher signs in on the admin's old phone) passes by (a) after a sign-out that reached the server, and by (b) when it did not. Clients cannot read `profiles.push_tokens` at all (column SELECT revoked from `anon` and `authenticated`; every other column is a column grant, so **a column added to `profiles` later needs its own `grant select (col) on public.profiles to anon, authenticated`** before a client-side read, policy or security-invoker view can use it). The app also silences the OS push on every sign-out, including GoTrue's own (a reused refresh token: `src/auth/use-auth-gate.ts`). Staff WhatsApp alerts (`teacher_new_student`, `teacher_lesson_reminder[_meet]`) are checked again at send time (`whatsapp/staff-at-send.ts`, `staffStale`): an inactive, disabled, removed or renumbered teacher's queued row is failed «stale».
- Camera for payment receipt → Supabase Storage signed upload.
- Reuses `packages/api-client` and `packages/shared`.
- **Web parity** (owner standing rule, 2026-10-06: every web feature is in sync with the mobile). «المستخدمون» (owner, 2026-10-12) is in «المزيد» behind `users.read` (`apps/mobile/src/users`, routes `app/(tabs)/more/users/*`): list with search, role and status filters and paging, detail, create (with the one-time credential: selectable text + the share sheet), edit, disable / enable, reset password, sign out everywhere, delete (or disable when the user has history); every write behind `users.write`, same endpoints, bodies and error messages as the web. The student file has «إنشاء حساب» as on the web.
- **Mobile parity exemptions** (owner decision 2026-10-12): «الأدوار والصلاحيات» (roles & permissions) and «الترجمات» (the translations editor) stay **web-only**: rarely used and table-heavy. Any other web feature missing on the phone is a gap, not a decision.

## 7. Integrations

- **WhatsApp Cloud API**: webhook `POST /webhooks/whatsapp` (verify `X-Hub-Signature-256`), `GET` challenge; outbound `messages` endpoint; templates created in Meta Business Manager and names stored in `message_templates`; startup `TemplateRegistry.verifyAll()` flags missing (fixes the 132001 errors for good).
- **Config** (owner, 2026-10-12, migration `20261012000310`): the integration keys (WhatsApp lines, the staging guards, LiveKit, Expo, FX URL; registry `packages/shared/src/integrations`) are edited by an admin in `/admin/settings` → «التكاملات». Plain values live in `public.integration_config`, secrets in Supabase Vault (service-role functions, write-only from the app). The API (`common/integrations`: `IntegrationConfigModule`, global; the snapshot in `common/integrations/integration-overlay.ts`) loads them at boot, after each save and every `integrationRefreshMs(env)` (`common/integrations/integration-refresh.ts`: the optional env `INTEGRATION_REFRESH_MS`, else `SETTINGS_CACHE_MS`; never when `INTEGRATION_CONFIG_FROM_DB=false`), checks each against the env schema and lays them over `process.env` in `loadEnv()`: a non-empty DB value wins, env is the fallback, and every reader takes the config per call (no restart). Bootstrap and infrastructure keys (`PORT`, `SUPABASE_*`, `WEB_ORIGIN`, …) stay in env only (`env.ts`, blank = unset via `env.blank.ts`); sending is the DB switch `settings.messaging_enabled` alone (docs/23). docs/09 «Integration config in the database».
- **Settings and config module graph** (docs/25 §3): `SettingsModule` (global: `SettingsService`, storage and cache only; GET/PATCH `/settings`, GET `/config/meta`) ← `PublicConfigModule` (GET `/settings/public`) → `CustomConfigModule` (`/config/custom`); every module reads settings through its own reader `modules/<m>/<m>.settings.ts` (`readSlice`, docs/25 §4); `IntegrationConfigModule` (global) → the overlay ← `loadEnv()`. Shared: `settings/` (registry by owner in `domains/*.ts`, page order in `layout.ts`) ← `custom-config/` ← `public-config.ts`. Boundary tests: `packages/shared/src/settings/boundaries.test.ts`, `apps/api/src/common/config-boundaries.test.ts`, `apps/web/src/features/settings/boundaries.test.ts`, and the API ESLint `no-restricted-imports` guard.
- **Google Calendar** (optional mirror): service account with calendar share; events keyed by `extendedProperties.private.lessonId`.
- **PDF**: HTML (React) → Playwright Chromium in a worker; stored at `reports/{student_id}/{lesson_id}.pdf`; signed URLs 7 days for WhatsApp document template.

## 8. Code constraints (enforced)

`packages/config/eslint` rules:
```js
'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
'max-params': ['error', 3],
'@typescript-eslint/no-explicit-any': 'error',
'complexity': ['warn', 10],
```
Patterns to stay under limits: options objects instead of positional params; one component/service per file; split Nest services into `*.service.ts` + `*.queries.ts` + `*.mapper.ts`; colocate tests as `*.test.ts` (tests also ≤150 lines — split by scenario).

## 9. Testing strategy

| Level | Tool | Scope | Gate |
|-------|------|-------|------|
| Unit | Vitest (packages, web), Jest (api) | pure functions: phone normalise, Arabic normalise, occurrence generator, conflict checker, state machine, balance calc, reminder scheduling, template variable mapping | ≥ 80 % lines on `packages/shared`, `apps/api/src/modules/**/*.service.ts` |
| API e2e | Jest + Supertest + local Supabase (`supabase start`) | each controller happy path + auth/RLS negative cases | all green |
| Web e2e | **Playwright** (`e2e/`), seeded DB, mocked WhatsApp API (MSW/local stub) | the 6 journeys in `03-requirements.md §5`, RTL screenshots, mobile viewport | all green |
| Mobile | jest-expo + React Native Testing Library | screens render, query hooks, optimistic updates | all green |
| Contract | OpenAPI snapshot diff | api ↔ api-client | no breaking change without bump |

## 10. Activity log («سجل النشاط»)

Owner, 2026-10-05: "add user tracker/logger for all the actions". Table `public.activity_log` (migration `20261005000205_activity_log.sql`), shown at `/admin/activity` and as «النشاط» on the student profile and the teacher profile tab. `audit_log` (before/after of money, merges, reports) is unchanged and separate.

- **What is logged**: every mutating API request (POST / PUT / PATCH / DELETE) by the global `ActivityInterceptor` (`apps/api/src/common/activity/`), after the handler answers or throws: actor (`auth.users` id, null for public calls), role (`public` without a login), action key `${controller}.${handler}` (e.g. `expenses.create`), method, route **pattern** (`/students/:id`), entity + entity id (from an `:id` / `:fooId` param, or the `id` of a created row), HTTP status, duration, IP, user agent (≤ 200 chars) and `meta.fields` (top-level field **names** of the body). Sign-in, sign-out and failed sign-ins: the web signs in against Supabase directly, then calls `POST /activity/session/login|logout|login-failed` (no body; rate-limited). Mobile mutations are logged through the API like any other; the mobile app does not report its sign-ins yet (deferred).
- **What is skipped**: GET / HEAD / OPTIONS; `/health`, `/webhooks/whatsapp`, `/livekit/webhook` (`SKIPPED_ROUTES`); throttled (429) calls without a login; requests the AuthGuard refuses (401/403) — they never reach interceptors.
- **Never stored**: body or response values, query strings, raw URLs, passwords, tokens (`:token`, `:linkToken` params never become the entity id), phone numbers (`:phone` likewise), message text, file contents, emails of failed sign-ins.
- **Writes** are fire-and-forget: queued in memory and inserted in batches every 3 s (`ActivityWriter`); a failed insert is logged and dropped, never failing or slowing the request.
- **Access**: RLS, admins select (`is_admin()`); `v_activity_log` (security invoker) adds the actor's name. Append-only: no insert/update/delete for clients, no update/delete even for the service role.
- **Retention**: 180 days. `prune_activity_log()` runs daily from the API (`ActivityRetentionJob`; pg_cron is not enabled), idempotent.

## 11. Translations («الترجمات»)

Owner, 2026-10-05: "add dynamic translations; don't leave any content static or dynamic untranslated; dynamic content can be optionally not translated."

- **Bundle = defaults + offline fallback.** `packages/shared/i18n/ar.json` and `en.json` (same key tree, same `{placeholders}`: `i18n-parity.test.ts`) ship in every app and are always complete. A failed or slow override fetch never leaves a blank text.
- **Overrides in the DB.** `public.translation_overrides (key, locale, value, updated_by, updated_at)`, primary key `(key, locale)`, migration `20261005000213_translation_overrides.sql`. `key` is the dotted path of a string leaf (`nav.leads`). RLS: anon + authenticated may SELECT key, locale, value and updated_at (public UI copy, needed on the login page; never `updated_by`), only the API (service role) writes. Clients read through the API, not PostgREST.
- **API** (`apps/api/src/modules/translations/`): `GET /i18n/:locale/overrides` (public, `{ key: value }`, `Cache-Control: max-age=60` + ETag → 304); admin `GET /i18n/keys?search=&section=&page=&pageSize=` (every bundle key with ar/en defaults and overrides), `PUT /i18n/:locale/:key { value }` (404 for a key not in the bundle; 400 `placeholders_missing` when the value drops a `{name}` / `{{n}}` slot of the default) and `DELETE /i18n/:locale/:key` (restore). Writes are logged by the ActivityInterceptor. `TranslationsService` holds the overrides in memory (loaded 1 s after boot, after every save, every 5 min) and merges the Arabic ones **in place** into `common/i18n/server-text` `ar`, which every server text producer reads (report PDF, WhatsApp, exports, push, alerts, follow-ups, invoices, template review samples). Parent-facing output stays Arabic.
- **Web**: `main.tsx` fetches the current locale's overrides (≤ 1.5 s, `cache: 'no-cache'` so a saved edit shows on the next reload) and merges them into `t` (a copy of the bundle, same type) **before** `boot.tsx` loads the router and the screens. Edit at `/admin/translations`; changes apply on the next page load.
- **Mobile**: `app/_layout` applies the overrides saved by the last run (AsyncStorage `ab.i18n.overrides.<locale>`) before the first screen, then refreshes from the API in the background (≤ 1.5 s) and saves for the next start. No editor on mobile.
- **Adding a key**: add it to `ar.json` (clear MSA) and `en.json` at the same path, read it as `t.section.key`; it appears in the editor automatically. Never hard-code UI text: `apps/web/src/i18n-literals.test.ts` and `apps/mobile/src/i18n-literals.test.ts` fail on Arabic in any `.tsx` outside comments (exceptions, with a reason, in the `i18n-literals.allow.json` next to them). Lists join with `t.common.listSeparator`.
- **Dynamic names** (admin-entered data) are not overridden: teachers (`display_name_ar` / `display_name_en`) and expense categories (`label_ar` / `label_en`) show the English name in the English UI when it is set, else the Arabic one (`localizedName` / `teacherName` in `@ab/shared`). Other admin-entered content (student names, notes, meeting titles) is shown as typed.

## 12. Roles & permissions («الأدوار والصلاحيات»)

Owner, 2026-10-05: "add dynamic roles and permissions". Migration `20261005000220_roles_permissions.sql`, page `/admin/roles`.

- **Two layers.** `profiles.role` (enum `user_role`: admin, teacher, guardian, assistant, sales, student) stays the **base scope**: *who you are* — the `user_role` JWT claim, `HOME_BY_ROLE`, the mobile app split, every RLS policy and scope helper (`is_admin()`, `my_teacher_id()`, …) and the API's ownership checks (own lessons, own students, teacher of this lesson, kick rank) are unchanged. On top, a **role** (`public.roles`: `key`, `name_ar`, `name_en`, `base_role`, `is_system`) carries **permissions** (`public.role_permissions`) — *what you may do* — enforced by the API guard per endpoint.
- **Held role**: `profiles.role_id`; null = the system role of `profiles.role`. Assigning a custom role sets `profiles.role` to its `base_role` (a composite FK `(role_id, role) → roles(id, base_role)` keeps them in step), so RLS scoping follows. The access-token hook also emits `role_id` (keeps `user_role`).
- **System roles**: five rows (key = the enum value), seeded with exactly the access of the old `@Roles(...)` metadata. Their grants are editable in the UI **except the system admin**, which always holds every grantable permission (its rows are not read). Owner 2026-10-12 (docs/16 row 26): the built-in teacher, sales and assistant roles (`EDITABLE_SYSTEM_ROLES`) also get «استعادة الافتراضي» (`POST /roles/:id/reset` → `defaultGrantsOf`), and every grant change of any role is audited (`audit_log`: `roles`, `permissions_update` / `permissions_reset`). Editable grants: the system teacher, sales and assistant roles and every custom role; fixed grants: admin, guardian and student (the family portal's access): a `PATCH /roles/:id` with `permissions` is 400 `admin_role_fixed` / `portal_role_fixed`, a rename still works, and the web dialog locks the matrix and sends the names only.
- **Catalog**: `packages/shared/src/permissions/catalog.data.ts` — stable `resource.action` keys grouped by area (labels in `i18n/*.json` → `permissions.items` / `permissions.areas`). One key per group of endpoints that shared one `@Roles` set before, so system-role parity is exact. `self.teacher` / `self.sales` / `self.assistant` are **scope keys**: never in the matrix, held by every role of that base role (the "my …" pages), so the admin is still refused `/teachers/me/*` as before.
- **API**: `@Permissions('payments.read')` on a controller (default) or handler (override); `@Public()` and `@SignedIn()` (only `/auth/me` and the sign-in/out log) are the exceptions. The global `AuthGuard` verifies the JWT, resolves the user's effective set from the DB (`profiles.role/role_id` → role → grants; `db-permission.resolver.ts`), caches it per user for 30 s (`PermissionCache`, cleared on every role change on that instance), puts it on `req.user.permissions`, and answers 403 without the route's key. `GET /auth/me` returns `permissions: string[]`. Inline checks that are about permission use `can(user, 'templates.manage')`; scope checks stay on `user.role`.
- **Endpoints** (all `roles.manage`; logged by the activity log): `GET /permissions`, `GET/POST /roles`, `PATCH/DELETE /roles/:id` (not system roles, not while held: 409 `system_role` / `role_in_use`), `GET /roles/staff-users` (staff profiles; `GET /users` is the users module's directory), `PATCH /users/:id/role` `{ role_id }`. A change that would leave nobody with `roles.manage` (409 `last_admin`) or take it from the actor (409 `self_lockout`) is refused.
- **Web**: `usePermissions()` / `canDo(me, p)`; the `/admin` layout keeps `requireRole('admin')` and then checks the page's permission (`features/auth/admin-access.ts`, longest prefix; the home needs `dashboard.read`, else the first allowed page). Nav items (AdminNav, TeacherNav, SalesNav) carry a `permission` and are filtered by `can`. Mobile: the app stays role-gated; «المزيد» rows hide what the role does not grant.
- **Adding a permission**: add a row to `catalog.data.ts` (area + default system grants), its Arabic/English labels, a migration inserting it for the system roles that should hold it, then `@Permissions('x.y')` on the endpoints. Tests that fail otherwise: `permissions.coverage.test.ts` (every non-public handler has exactly one catalog key), `permissions.parity.test.ts`, `roles.seed.test.ts` (migration seed = catalog), `catalog.test.ts` (labels). A **new, renamed or removed handler** must also be recorded in `apps/api/src/common/auth/parity/access-before.json` with its intended system-role set (`["admin"]`, `["admin","teacher"]`, `"signed-in"`, `"public"`); the parity test fails until it is.
- **Parity test** (`apps/api/src/common/auth/parity/`): `access-before.json` froze `Controller.handler → @Roles` for all 204 handlers before the conversion (later handlers, e.g. translations, are added with their intended role set); the test boots the app, walks every controller handler and asserts each of the five system roles (and a user without a role) is admitted/refused exactly as before. Only the role routes are new.
- **Users control** (owner, 2026-10-06; migrations `20261006000280`–`288`, API `modules/users`, web `/admin/users`). Every login of every kind: admin, teacher, assistant, sales, guardian and **student** (new base role; system role «طالب», no permissions until the portal task). Permissions `users.read` / `users.write` (system admin only by default). Endpoints: `GET /users` (q over name / email / phone / student code, role, status; via the service-role SQL function `admin_list_users`), `GET /users/role-options`, `GET /users/link-candidates`, `GET /users/:id`, `POST /users` (Auth Admin API: typed password, generated password returned once, or recovery link returned once; idempotent on email; a student / guardian login must LINK an existing row, a teacher may be new), `PATCH /users/:id`, `POST /users/:id/{disable,enable,reset-password,sign-out}`, `DELETE /users/:id` (only without history: 409 `users_has_history` with the table counts from `user_references`). Rules: escalation as in roles (the actor holds the target's grants and the new role's grants); `users.write` alone does not reach a teacher / student / guardian login, it also needs `teachers.write` / `students.write` / `guardians.write` (create, update, reset, sign-out, disable, enable, delete, link pickers); only a **system admin** touches a system-admin login or gives the system admin role (403 `system_admin_only`), and an admin-base role (custom ones too) is given only by an actor whose own base role is admin (403 `admin_role_only`; the actor's profile is read from the DB, not the JWT claim); never disable / delete yourself (`cannot_disable_self` / `cannot_delete_self`), nobody re-enables themselves (`self_lockout`), never the last active system admin (`last_admin`: the API checks first, and migration 287 is the race backstop, a deferred constraint trigger under one advisory lock), no base-role change for a linked user (`role_change_linked`), secrets never stored, logged or audited. `PATCH /users/:id` checks everything (email and phone owners, profiles and teachers) before the first write and changes the auth email last. `DELETE` removes the auth user first; the profile goes with it and the `profile_id` foreign keys (on delete set null) release the teacher / student / guardian record. A **disabled profile** (`profiles.disabled_at`) is refused by the AuthGuard with 403 `account_disabled` even with a valid JWT, and the auth user is banned. Migration 286 closes the database side: a client session can never write `disabled_*` (the guard trigger of 225 covers them), and `auth_role()` is null for a disabled profile, so `is_admin()` and every RLS policy built on it refuse a disabled admin at once. A student reads their own record only through the whitelisted view `student_self` (migration 288, no `notes` / `meeting_link_override` / `created_by`).
- **Hardening** (migration `20261005000225`): a client session (anon/authenticated) can never change `profiles.role` / `role_id` (trigger `profiles_guard_role_trg`, error 42501), so a limited admin cannot move itself to the system admin role through PostgREST; `set_role_permissions(role_id, perms[])` replaces a role's grants in one transaction (service role only). The API refuses (403 `permission_not_held`) creating a role, adding a grant to a role, or assigning a role that carries a permission the actor does not hold; a permission lookup failure no longer blocks a non-admin's `GET /auth/me`.
- **Limits**: a custom role with base role admin still reads everything RLS lets an admin read if it calls PostgREST directly (the web and mobile apps read through the API only); `user_role` in an unrefreshed token lags a re-assignment by up to an hour for the API's scope checks (permissions are read from the DB within 30 s). **Token window**: disabling, "sign out everywhere" and a password reset delete the sessions (refresh tokens) and a disabled account is refused by the API guard (at once on the instance that disabled it, within the 30 s permission cache elsewhere), but an access token already issued stays cryptographically valid until it expires (at most one hour, `jwt_expiry`): for a signed-in user who is not disabled, "sign out everywhere" and reset-password do not cut the API within that hour (the web copy of both says so). RLS refuses a disabled admin at once (`auth_role()`), but a disabled non-admin keeps whatever own-row policies (`auth.uid()`) allow until the token expires. A `tokens_valid_after` check of `iat` in the guard would close it and is not built (a column, `iat` in the verifier and a shape change of the permission cache).

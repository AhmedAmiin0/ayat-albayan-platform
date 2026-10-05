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
profiles(id uuid pk refs auth.users, role user_role /* BASE role: admin|teacher|guardian|assistant|sales; app section + RLS */, role_id uuid refs roles /* the user's (possibly custom) role, §12 */, full_name, phone_e164 unique, locale default 'ar', tz default 'Asia/Riyadh')
roles(id, key unique, name_ar, name_en, base_role user_role, is_system, created_at, updated_at)   -- 5 system roles seeded, admins add custom ones
role_permissions(role_id, permission text, pk(role_id, permission))                              -- '*' or '<module>.view|manage'

teachers(id, profile_id refs profiles, display_name_ar, display_name_en, gender, programs text[], phone_e164, meeting_link, rate_30 int, rate_45 int, rate_60 int, rate_90 int, max_students int, status, google_calendar_id, mirror_enabled bool)
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

-- system
audit_log(id, actor_id, entity, entity_id, action, before jsonb, after jsonb, at)
settings(key pk, value jsonb)   -- follow-up delays, late-cancel hours, reminder offsets
```

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
- Push via expo-notifications; server stores Expo push tokens in `profiles.push_tokens`.
- Camera for payment receipt → Supabase Storage signed upload.
- Reuses `packages/api-client` and `packages/shared`.

## 7. Integrations

- **WhatsApp Cloud API**: webhook `POST /webhooks/whatsapp` (verify `X-Hub-Signature-256`), `GET` challenge; outbound `messages` endpoint; templates created in Meta Business Manager and names stored in `message_templates`; startup `TemplateRegistry.verifyAll()` flags missing (fixes the 132001 errors for good).
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

## 12. Roles and permissions (owner request, 2026-10-05)

- **Two layers.** `profiles.role` is the **base role** (`admin|teacher|guardian|assistant|sales`, the `user_role` enum): it decides the app section, the JWT claim `user_role` and **all RLS**. `profiles.role_id` points to a row of `roles`: either the **system role** of the same name (seeded, immutable key/base role, cannot be deleted; `admin` always keeps `*`) or a **custom role** an admin created, which has a base role and a set of permissions. A trigger (`profiles_sync_role`, migration 222) keeps the two consistent: setting `role_id` sets `role` to its base role; setting only `role` selects the system role.
- **Ceiling.** RLS stays base-role based. Fine-grained permissions are enforced **in the API and the UI only**; they never widen what the database lets a base role read. A custom role therefore can only take away from, never add to, its base role's data access. **A limited admin role is therefore not an RLS-level read boundary:** a user whose base role is `admin` passes `is_admin()`, so anyone with a database session of their own (a PostgREST call with their token, outside the API) reads every table an admin reads, whatever the role's permissions. Restricting an admin's *data* needs the API (which is what the product uses) or a future RLS change keyed on permissions; the permission set is an API/UI gate, not a data-isolation guarantee.
- **Catalogue** (`packages/shared/src/permissions/`): `<module>.view` and `<module>.manage` for leads, inbox, job_applicants, students, teachers, schedule, classrooms, feedback, subscriptions, payments, payouts, expenses, invoices, receivables, finance, pricing, settings, dashboard, activity, users, roles, translations, recordings, plus the wildcard `*`. `can(perms, key)`: `*` grants all, `x.manage` also grants `x.view`. Every permission has an `ar` and `en` label (`roles.perm.*`, tested).
- **Enforcement is automatic.** `ROUTE_PERMISSIONS` maps method + path prefix (GET → `.view`, writes → `.manage`; longest prefix wins; `:param` matches any segment) to a permission, so the ~55 `@Roles('admin')` controllers are not edited. `AuthGuard` runs after the `@Roles` check; for an **admin-base** caller on any route that admits admins it resolves the caller's permissions (`PermissionResolver`: server-side, 30 s in-memory cache per user, cleared on every role change; **not in the JWT**, so changes apply at once) and applies the map. The wildcard always passes; a route in no rule is **denied** to non-wildcard roles (safe default); `EXEMPT_PREFIXES` (`/auth`, `/me`, `/activity/session`, `/health`) need no permission. Callers whose base role is teacher, assistant, sales or guardian keep the base-role access `@Roles` gives them. `@RequirePermission('x')` adds an explicit check for any caller. A test scans every controller and fails when an admin route is neither mapped nor exempt: **a new admin route must get a rule in `route-permissions.ts`**.
- **API.** `GET|POST /roles`, `GET|PATCH|DELETE /roles/:id`, `POST /roles/:id/duplicate` (`roles.view` / `roles.manage`). 409 `system_immutable`, `admin_wildcard`, `role_has_users {count}` (delete, or re-basing a role that has users), `duplicate`. Changes are written to `audit_log` (`role_create|update|delete|duplicate`) and, like all mutations, to the activity log. `GET /auth/me` returns `{id, email, role, fullName, locale, tz, roleKey, permissions}`; the web reads it with `usePermissions()` / `<Can permission=…>` (UI gating only). The mobile gate still uses only the base `role`.
- **No self-escalation (migration 225, `RolesService`).** Clients never write the role tables: the `roles_admin_write` / `role_permissions_admin_write` policies are gone (the API writes with the service role, like settings; admin keeps read; `anon` has no access). Trigger `profiles_guard_role_trg` rejects any change to `profiles.role` / `role_id` from a client session (`is_client_session()`: JWT role `anon`/`authenticated`, or that `current_user`); postgres, migrations and the service role pass, so the auth hook, seeds and the API keep working. `role_permissions_guard` refuses `*` on any role but the admin system role (insert and update) and any removal of admin's `*`; `roles_guard` refuses flipping `is_system` and a system role inserted by a client. In the API, `create` / `update` / `duplicate` answer 403 `wildcard_reserved` (`*` for any role but the admin system role), 403 `permission_not_held {permissions}` (a grant the caller does not hold; `update` checks only what it adds) and 403 `own_role` (editing the role you hold, unless you hold `*`). Permission sets are written by `set_role_permissions(role_id, perms[])` in one transaction (service role only); the resolver cache is dropped in a `finally`.
- **Degrading.** `GET /auth/me` for a non-admin base role returns the plain user with `permissions: []` and `roleKey: null` when the permission lookup fails (logged); for an admin it fails, like every admin permission check (closed).
- **Mapping notes.** `/i18n` (editor routes) is `translations`; the three finance CSVs (`/exports/expenses.csv`, `teacher-ledger.csv`, `receivables.csv`, `FinanceExportsController`) are `finance`; `GET /meetings/by-link/:token` is `classrooms.view`. `users` is catalogued but has no routes yet, so the editor hides it (`RESERVED_MODULES`); a test fails when an offered module has no rule.
- **Web.** `/admin/roles` (list, editor with the permission matrix, duplicate, delete). Assigning a role to a user, the nav filter and the `translations` / `users` routes come in later tasks.

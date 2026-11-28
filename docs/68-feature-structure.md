# 68 · Feature-organized folders: one domain/feature tree in every layer

The owner asked on 2026-11-28 for a more feature-organized folder structure with one folder per unit, in the frontend and the backend. This doc sets the target and the rules. The move map lives in refactor/structure/map.json and the review findings in refactor/structure/findings.md. The moves are made by a script in ONE PR (the owner: no small batches), after the lint-zero PR merges.

# 68. Feature folders in every layer

The owner asked for a feature-organised tree, one folder per unit, in the frontend and the backend. This doc fixes one
list of domains and features and gives the path each feature has in every layer. The move map that gets there is in
`refactor/structure/plan.json`.

## Target tree

| layer | feature root | also at the root |
|---|---|---|
| api | `apps/api/src/modules/<domain>/<feature>/` | `common/` (cross-cutting infra only), `config/env`, `route-map`, `scripts` |
| shared | `packages/shared/src/<domain>/<feature>/` | `events/`, `testing/`, `package-checks/` |
| client-core | `packages/client-core/src/<domain>/<feature>/` | `core/` (http, auth, keys, paging, query, phone-countries, audio-player) |
| staff-web | `apps/staff-web/src/features/<domain>/<feature>/` | `routes/` (thin), `shell/`, `components/`, `lib/`, `test/` |
| family-web | `apps/family-web/src/features/<domain>/<feature>/` | `routes/` (thin), `shell/`, `test/` |
| staff-mobile | `apps/staff-mobile/src/features/<domain>/<feature>/` | `app/` (expo-router, thin), `shell/`, `core/`, `testing/`, `tests/` |
| family-mobile | `apps/family-mobile/src/features/<domain>/<feature>/` | `app/` (expo-router, thin), `shell/`, `components/` |

The seven domains are finance, messaging, people, platform, reporting, sales and teaching. A domain folder holds only
feature folders, group folders and an optional `tests/`.

## Rules

1. **Feature.** A feature is a folder with an `index.ts`. In the api it is one Nest module. It may hold units that are
   Nest modules of their own (for example `messaging/inbox/threads`), registered by the feature's module.
2. **Group.** A group is a folder of features with no code of its own. A package group may have an `index.ts` that only
   re-exports its features. Two groups exist: `messaging/notifications` (9 features) and `teaching/courses` (6).
   No domain needs a group to stay under the cap. These two are groups because their api folders hold many Nest
   modules and no module of their own.
3. **Unit.** Inside a feature, a unit with 3+ files has its own folder (`Name/{Name.tsx, Name.types.ts, use-name.ts,
   index.ts, tests/}`), plus `pages/`, `components/` and `index.ts` (rule 16). Unit names are not checked across
   layers. A unit that is the client of an api sub-module should still use that sub-module's name.
4. **One name.** A feature has the same `<domain>/<feature>` path in every layer that has it. When the layers
   disagree, the api Nest module name wins, unless it is named after the viewer (`me`, `my`, `teacher-me`), after a
   layer (`reads`, `providers`, `http`) or repeats the domain (`sales-money`). In those cases the clearest name used by
   another layer wins.
5. **Cap.** At most 12 code files and 12 sub-folders per folder, at every level (`folder-cap.mjs`). `tests/`, `shared/`
   and `pages/` count as sub-folders.
6. **Routes stay thin.** `routes/` and `app/` files map a URL to one page. Route URLs do not change: the folders move,
   not the paths. The `route-map` snapshot tests and the expo-router trees prove it.
7. **No cross-package moves.** Code moves only inside its own workspace (rule 23). `@ab/shared` and `@ab/client-core`
   export only `.`, so a move inside them changes nothing for the apps. Code that a kit or a domain package holds for
   one app is listed under «What stays» as a follow-up.
8. **The mobile rule changes.** CLAUDE.md rule 13 says `mobile src/<feature>`. It becomes
   `src/features/<domain>/<feature>` for both mobile apps.

## Domains and features

- **finance (11):** assistant-pay, expenses, fx, invoices, payments, payouts, pricing, receivables, stripe
  (gate, payment-links, pay, webhook), subscriptions (admin-tasks, alerts, start-date-edit, used-before, trial,
  student-lifecycle...), teacher-earnings.
- **messaging (6 features and 1 group):** calls, inbox (threads, search, thread-sync, files, send, reactions,
  message-hide, stickers, chat-lists, saved-replies), numbers, templates, webhook (crm, evolution, wacrm, external,
  inbound, status, line-resolve), whatsapp (drivers, sender, messages, lines, number-routes, gate, relay).
  The **notifications** group holds bell, catalogue, family-push, follow-ups, push, reminders, rules,
  schedule-notices and teacher-alert.
- **people (12, at the cap):** account (push-tokens, profile), guardians, people-edit, portal (home, child,
  family-pick, lessons, schedule, package, recordings, reports, actions), presence, roles, sign-in, students,
  teacher-students, teachers (availability), test-accounts, users (photos).
- **platform (10):** custom-config, drive-backup, google-sync, health (storage-probe), integrations, legal,
  process-role, settings (values, public-config), short-links (admin, gate), translations.
- **reporting (6):** activity, dashboard (finance-summary), exports, report-page, report-pdf, reports.
- **sales (9):** academy, assignment, course, job-applicants, leads (family-link, qualification), money (receipts,
  views, package-cancel, payment-edit), registration, schedule, students (attendance, details, lesson-actions,
  teachers).
- **teaching (10 features and 1 group):** booking (core, invoice, instant, slots, trial-date, booking-extras),
  classroom (assistants, room-open, meetings, live, livekit, max-duration, moderation, recordings), feedback,
  lesson-files (recordings, assets, retention), lesson-links, lesson-rating, lessons (overview, day, status,
  reschedule, time-edit, family-requests, proposals, auto-held), scheduling, student-channels, teacher-home
  (today, alerts, board, lessons, schedule). The **courses** group holds course-card, course-change,
  course-extend, course-pause, course-stop and profile-course.

If people needs a 13th feature, it splits into `people/access/{account, sign-in, users, roles, presence,
test-accounts}` and `people/directory/{students, guardians, teachers, teacher-students, people-edit, portal}`.

## Feature table

A cell gives the feature's path under that layer's feature root; — means the layer has no such feature.

| domain | group | feature | api | shared | client-core | staff-web | family-web | staff-mobile | family-mobile |
|---|---|---|---|---|---|---|---|---|---|
| finance | — | assistant-pay | finance/assistant-pay | finance/assistant-pay | finance/assistant-pay | finance/assistant-pay | — | finance/assistant-pay | — |
| finance | — | expenses | finance/expenses | finance/expenses | finance/expenses | finance/expenses | — | finance/expenses | — |
| finance | — | fx | finance/fx | — | — | — | — | — | — |
| finance | — | invoices | finance/invoices | finance/invoices | finance/invoices | finance/invoices | — | finance/invoices | — |
| finance | — | payments | finance/payments | finance/payments | finance/payments | finance/payments | — | finance/payments | — |
| finance | — | payouts | finance/payouts | finance/payouts | finance/payouts | finance/payouts | — | finance/payouts | — |
| finance | — | pricing | finance/pricing | finance/pricing | finance/pricing | finance/pricing | — | finance/pricing | — |
| finance | — | receivables | finance/receivables | finance/receivables | finance/receivables | finance/receivables | — | finance/receivables | — |
| finance | — | stripe | finance/stripe | finance/stripe | finance/stripe | finance/stripe | — | finance/stripe | — |
| finance | — | subscriptions | finance/subscriptions | finance/subscriptions | finance/subscriptions | finance/subscriptions | — | finance/subscriptions | — |
| finance | — | teacher-earnings | finance/teacher-earnings | finance/teacher-earnings | finance/teacher-earnings | finance/teacher-earnings | — | finance/teacher-earnings | — |
| messaging | — | calls | messaging/calls | messaging/calls | messaging/calls | messaging/calls | — | messaging/calls | — |
| messaging | — | inbox | messaging/inbox | messaging/inbox | messaging/inbox | messaging/inbox | — | messaging/inbox | — |
| messaging | notifications | bell | messaging/notifications/bell | messaging/notifications/bell | — | messaging/notifications/bell | messaging/notifications/bell | messaging/notifications/bell | messaging/notifications/bell |
| messaging | notifications | catalogue | — | messaging/notifications/catalogue | — | messaging/notifications/catalogue | — | messaging/notifications/catalogue | — |
| messaging | notifications | family-push | messaging/notifications/family-push | — | — | — | — | — | — |
| messaging | notifications | follow-ups | messaging/notifications/follow-ups | — | — | — | — | — | — |
| messaging | notifications | push | messaging/notifications/push | messaging/notifications/push | — | — | — | — | messaging/notifications/push |
| messaging | notifications | reminders | messaging/notifications/reminders | messaging/notifications/reminders | — | — | — | — | — |
| messaging | notifications | rules | messaging/notifications/rules | messaging/notifications/rules | — | messaging/notifications/rules | — | messaging/notifications/rules | — |
| messaging | notifications | schedule-notices | messaging/notifications/schedule-notices | messaging/notifications/schedule-notices | — | — | — | — | — |
| messaging | notifications | teacher-alert | messaging/notifications/teacher-alert | — | — | — | — | — | — |
| messaging | — | numbers | messaging/numbers | messaging/numbers | — | messaging/numbers | — | messaging/numbers | — |
| messaging | — | templates | messaging/templates | messaging/templates | messaging/templates | messaging/templates | — | messaging/templates | — |
| messaging | — | webhook | messaging/webhook | messaging/webhook | — | — | — | — | — |
| messaging | — | whatsapp | messaging/whatsapp | messaging/whatsapp | — | messaging/whatsapp | — | — | — |
| people | — | account | people/account | people/account | people/account | people/account | people/account | people/account | people/account |
| people | — | guardians | people/guardians | people/guardians | people/guardians | people/guardians | — | — | — |
| people | — | people-edit | people/people-edit | people/people-edit | people/people-edit | people/people-edit | — | people/people-edit | — |
| people | — | portal | people/portal | people/portal | people/portal | people/portal | people/portal | — | people/portal |
| people | — | presence | people/presence | people/presence | people/presence | people/presence | — | people/presence | — |
| people | — | roles | people/roles | — | people/roles | people/roles | — | — | — |
| people | — | sign-in | people/sign-in | people/sign-in | people/sign-in | people/sign-in | people/sign-in | people/sign-in | people/sign-in |
| people | — | students | people/students | people/students | people/students | people/students | — | people/students | — |
| people | — | teacher-students | people/teacher-students | people/teacher-students | people/teacher-students | people/teacher-students | — | people/teacher-students | — |
| people | — | teachers | people/teachers | people/teachers | people/teachers | people/teachers | — | people/teachers | — |
| people | — | test-accounts | people/test-accounts | people/test-accounts | people/test-accounts | people/test-accounts | — | — | — |
| people | — | users | people/users | people/users | people/users | people/users | — | people/users | — |
| platform | — | custom-config | platform/custom-config | — | — | platform/custom-config | — | — | — |
| platform | — | drive-backup | platform/drive-backup | — | — | — | — | — | — |
| platform | — | google-sync | platform/google-sync | — | — | platform/google-sync | — | platform/google-sync | — |
| platform | — | health | platform/health | platform/health | — | — | — | — | — |
| platform | — | integrations | platform/integrations | — | — | platform/integrations | — | — | — |
| platform | — | legal | — | — | platform/legal | — | platform/legal | — | platform/legal |
| platform | — | process-role | platform/process-role | — | — | — | — | — | — |
| platform | — | settings | platform/settings | — | platform/settings | platform/settings | — | platform/settings | — |
| platform | — | short-links | platform/short-links | platform/short-links | platform/short-links | platform/short-links | — | platform/short-links | — |
| platform | — | translations | platform/translations | — | platform/translations | platform/translations | — | — | — |
| reporting | — | activity | reporting/activity | reporting/activity | — | reporting/activity | — | reporting/activity | — |
| reporting | — | dashboard | reporting/dashboard | — | — | reporting/dashboard | — | reporting/dashboard | — |
| reporting | — | exports | reporting/exports | — | — | reporting/exports | — | — | — |
| reporting | — | report-page | reporting/report-page | reporting/report-page | — | — | — | reporting/report-page | — |
| reporting | — | report-pdf | reporting/report-pdf | — | — | — | — | — | — |
| reporting | — | reports | reporting/reports | reporting/reports | reporting/reports | reporting/reports | — | reporting/reports | — |
| sales | — | academy | sales/academy | sales/academy | — | sales/academy | — | — | — |
| sales | — | assignment | sales/assignment | sales/assignment | — | sales/assignment | — | — | — |
| sales | — | course | sales/course | sales/course | sales/course | — | — | sales/course | — |
| sales | — | job-applicants | sales/job-applicants | — | — | sales/job-applicants | — | sales/job-applicants | — |
| sales | — | leads | sales/leads | sales/leads | sales/leads | sales/leads | — | sales/leads | — |
| sales | — | money | sales/money | sales/money | — | sales/money | — | sales/money | — |
| sales | — | registration | sales/registration | sales/registration | — | sales/registration | — | sales/registration | — |
| sales | — | schedule | sales/schedule | sales/schedule | — | sales/schedule | — | sales/schedule | — |
| sales | — | students | sales/students | sales/students | — | sales/students | — | sales/students | — |
| teaching | — | booking | teaching/booking | teaching/booking | teaching/booking | teaching/booking | — | teaching/booking | — |
| teaching | — | classroom | teaching/classroom | teaching/classroom | teaching/classroom | teaching/classroom | — | teaching/classroom | teaching/classroom |
| teaching | courses | course-card | teaching/courses/course-card | teaching/courses/course-card | teaching/courses/course-card | teaching/courses/course-card | — | teaching/courses/course-card | — |
| teaching | courses | course-change | teaching/courses/course-change | teaching/courses/course-change | teaching/courses/course-change | teaching/courses/course-change | — | teaching/courses/course-change | — |
| teaching | courses | course-extend | teaching/courses/course-extend | — | — | — | — | — | — |
| teaching | courses | course-pause | teaching/courses/course-pause | teaching/courses/course-pause | teaching/courses/course-pause | teaching/courses/course-pause | — | teaching/courses/course-pause | — |
| teaching | courses | course-stop | teaching/courses/course-stop | teaching/courses/course-stop | teaching/courses/course-stop | teaching/courses/course-stop | — | teaching/courses/course-stop | — |
| teaching | courses | profile-course | teaching/courses/profile-course | — | — | — | — | — | — |
| teaching | — | feedback | teaching/feedback | teaching/feedback | — | teaching/feedback | — | teaching/feedback | — |
| teaching | — | lesson-files | teaching/lesson-files | teaching/lesson-files | teaching/lesson-files | teaching/lesson-files | — | teaching/lesson-files | — |
| teaching | — | lesson-links | teaching/lesson-links | teaching/lesson-links | — | teaching/lesson-links | — | — | — |
| teaching | — | lesson-rating | teaching/lesson-rating | teaching/lesson-rating | — | teaching/lesson-rating | — | teaching/lesson-rating | — |
| teaching | — | lessons | teaching/lessons | teaching/lessons | teaching/lessons | teaching/lessons | — | teaching/lessons | — |
| teaching | — | scheduling | teaching/scheduling | teaching/scheduling | teaching/scheduling | — | — | — | — |
| teaching | — | student-channels | teaching/student-channels | teaching/student-channels | teaching/student-channels | teaching/student-channels | — | teaching/student-channels | teaching/student-channels |
| teaching | — | teacher-home | teaching/teacher-home | teaching/teacher-home | teaching/teacher-home | teaching/teacher-home | — | teaching/teacher-home | — |

## Names that change

- **api:** `people/me` becomes `account`. `stripe/links` becomes `payment-links`. `student-recordings` becomes
  `lesson-files`. `lessons/teacher-me` becomes `teacher-home`. `sales-money`, `sales-registration` and
  `sales-students` become `money`, `registration` and `students`. `sales/sales` becomes `assignment`, with academy and
  schedule as features of their own. `booking/sales` becomes `sales/course`. booking's card, course-change, extend and
  profile, plus `course-pause` and `course-stop`, go into `teaching/courses`. `booking/plan` becomes `slots`.
  In the inbox, `delta` becomes `thread-sync`, `hide` becomes `message-hide` and `reads/search` becomes `search`.
  `whatsapp/numbers` becomes `number-routes`, and `whatsapp/templates` becomes `messaging/templates`. In webhook,
  `crm-*` becomes `crm/*`, `providers` becomes `wacrm` and `lines` becomes `line-resolve`. `short-links-admin` becomes
  `short-links/{admin,gate}`. notification-rules, reminders, follow-ups, push, messaging-jobs and schedule-notices go
  into `notifications/*`.
- **shared:** the domains `reports`, `schedule` and `notifications` become `reporting`, `teaching` and
  `messaging/notifications`. `chat` becomes `inbox`, `channel` becomes `teaching/student-channels`, `earnings` becomes
  `teacher-earnings` and `sales/payment-link` becomes `finance/stripe/payment-links`. The `schemas/` grab-bag is
  dissolved into features and `events/`.
- **client-core:** `stripe-feature` becomes `stripe`, `family-auth` becomes `sign-in`, `translation-overrides`
  becomes `translations` and `lead-sort` becomes `leads`. `channels` becomes `teaching/student-channels`. The eight
  inbox fragments become `inbox/*` units. `teaching/reports` becomes `reporting/reports`.
- **staff-web:** `people/auth` becomes `sign-in`, `student-channel` becomes `student-channels`, `teaching/teacher`
  becomes `teacher-home` and `teaching/schedule` becomes `lessons`. `messaging/messaging` becomes `whatsapp`.
  `platform/presence` becomes `people/presence`. `people/assistants` becomes `finance/assistant-pay` (every call goes
  to `/assistant-pay`). `finance/finance` splits into invoices, receivables and `reporting/dashboard`.
- **family apps:** every `/portal/*` screen goes to `people/portal/<unit>`. Alerts become
  `messaging/notifications/bell`. `room` becomes `teaching/classroom` and `chat` becomes `teaching/student-channels`.
- **staff-mobile:** the 33 top folders become `features/<domain>/<feature>` plus `shell/`, `core/` and `testing/`.
  The role folders (`teacher/`, `sales/sales`, `more/`, `ops/`, `student-file/`, `assistant-app/`) are dissolved.

## What moves by hand

The codemod moves folders and file stems. It cannot split a file or rewire a Nest module. Those cases are listed in
the plan's `splits`, for example `sales.controller.ts` (split across money and classroom), `messaging/wa.ts`,
`messaging/schemas.ts`, `people/schemas/people.ts`, the `*/keys` folders in staff-web, and the mobile `app/_layout.tsx`.
Each one is a small PR on a `lane/<name>` branch after the move PR for its layer.

## Order

1. Add `guard:structure` with the feature list. Each layer is switched on only by the PR that makes it pass.
2. Move shared, then client-core. They are package-internal, so the apps do not change.
3. Move the api, one domain per PR. messaging goes first, because it pulls features out of `common/`.
4. Move staff-web, then family-web.
5. Move staff-mobile, then family-mobile. The family-mobile PR also adds it to the folder-cap roots.
6. Do the hand splits, then run `pnpm units:fold` on the loose units the moves bring into view.

Pure-move PRs use `refactor/*` branches, so the pure-move check runs. Titles follow the form
`refactor(<scope>): move <domain> into feature folders`.

## What stays

- **api `common/`:** audit, auth, config-store (the reader), db, http, infra, jobs, storage and telemetry
  (client-usage, request-id). The duplicate http and errors folders are a follow-up.
- **api root:** `app.module.ts`, `main.ts`, `openapi.ts`, `config/env`, `route-map` and `scripts`.
- **Domain packages:** `@ab/core`, `@ab/time`, `@ab/money`, `@ab/schedule`, `@ab/settings`, `@ab/catalog` and
  `@ab/i18n` keep their own layout.
- **Kits:** `@ab/web-kit` (portal, classroom, report, auth) and `@ab/mobile-kit` (room, channel, auth, account) stay
  as they are.
- **Thin route trees:** staff-web and family-web `routes/`, and both mobile `app/` trees. Only their import paths
  change.
- **staff-web UI:** `components/data-table` and `components/table-toolbar`, and `lib/{dom,list,query,storage,time}`.
- **staff-mobile:** `core/{auth,lib,push,ui}`, minus the feature parts that move out.
- **shared:** `finance/empty-when-missing.ts` and `people/tests/`.

Follow-ups, outside this plan because they cross packages: kit feature code into client-core; `invoice-view.schemas`
out of `@ab/schedule`; the routes in `@ab/schedule` and `@ab/catalog` into shared; `empty-when-missing` into
`@ab/core`; and the family-mobile `countries.ts` copy replaced by client-core's.

## Owner decisions

- The family apps go under `people/portal/*`, following the api's `/portal/*` module. The alternative is real
  domains: `teaching/lessons`, `finance/subscriptions`, `reporting/reports`.
- `student-channels` stays in teaching. That is where the api and staff-web already have it.
- `activity` goes to reporting, where staff-web already has it, and not to platform.
- `account` replaces the api's `me`. Five layers already say account.
- `teacher-earnings` is used everywhere. The api, staff-web and client-core already say it; shared and staff-mobile
  rename.
- people sits at 12 features in the api, staff-web and client-core. The fallback groups are given above.

## Tentative mappings to confirm in the move PR

- staff-web `reporting/reports/link` → `teaching/lesson-links/report-link`.
- staff-web `teaching/teacher/proposals` → `people/teachers/availability` (the api also has `lessons/proposals`).
- staff-mobile `inbox/rating` → `teaching/lesson-rating`.
- staff-web has no `sales/course` folder: its sales booking UI stays in `sales/registration/chat-register` and in
  `sales/money`.
- `staff-web messaging/messaging` → `whatsapp` is checked: `gate-api.ts` calls `/messages/gate` and the lines page
  calls `/messaging/lines`, and both are served from `messaging/whatsapp`.


## Guard

pnpm guard:structure, in tools/scripts/ci-checks/lint/structure/gate.mjs with its tests beside it, run in the CI lint job.

Where the list lives: refactor/structure/features.json, parsed with zod. It holds:
- layers: name -> feature root (api apps/api/src/modules, shared packages/shared/src, client-core packages/client-core/src, staff-web, family-web, staff-mobile and family-mobile src/features).
- enforced: the layers that are switched on.
- extras: allowed non-domain children per layer root (shared: events, testing, package-checks; client-core: core).
- domains: domain -> { features: [...], groups: { notifications: [...] } }.

The file sits outside refactor/guards/ and refactor/folder-cap/, so guard:baselines does not treat it as a baseline, and no debt file is added (rule 13). Widening the list is a visible diff in features.json, and the gate prints a warning the way guard:packages does.

What it checks, per enforced layer, from git ls-files:
1. Every child folder of the layer root is a domain or a listed extra.
2. Every child of a domain is a listed feature, a listed group or tests/.
3. A group holds only its listed features. In packages it may also hold an index.ts that only re-exports.
4. Every feature folder has an index.ts.
5. In the api, a feature or unit folder with a *.controller.ts at its root also has a *.module.ts there (rule 13).

Each problem is printed on one line with the closest allowed name. There is no baseline. A layer joins `enforced` only in the PR that makes it pass (docs/57 §9): shared, then client-core, then api, staff-web, family-web, staff-mobile and family-mobile, each after its move PR. A feature the domain does not list fails, so adding one means editing features.json in the same PR. Unit tests use small fixture trees for each check.

Also in this work: folder-cap.mjs appRoots().mobile gains apps/family-mobile/src and apps/family-mobile/app, in the family-mobile move PR, because family-mobile has 18 top folders today. The staff-mobile allow-list entry (apps/staff-mobile/src, 33 folders) is dropped by its move PR, and the shared entry (13 folders) by the shared PR.

## Move script

This reuses tools/scripts/ci-checks/move-module.ts and adds two flags. Everything runs in a cloud session or CI, never on the owner's PC.

1. Input map: refactor/structure/plan.json holds this plan's moves (layer, from, to). `from` is a `dir/`, a file, or a one-folder glob (`dir/stem.*`).
   - Pass = how deeply `from` is nested inside other entries' folders, deepest first. Pass 0 is moves[0..37] (38 entries), pass 1 is moves[38..255] (218), and pass 2 is moves[256..575] (320).
   - Passes are needed because expandMap throws "moved twice" when one map holds both `dir/x.*` and `dir/`. A stem or sub-folder carve-out therefore runs in a map before the folder it leaves.
   - Entries in the same pass are disjoint, and no earlier pass moves files into a folder that a later pass walks. One case depends on this: staff-web `messaging/notifications/` becomes `notifications/bell/` in the same pass as the rules and catalogue moves into `notifications/`, so the bell move must not be split into a later map.

2. Generator: `move-module.ts --plan refactor/structure/plan.json --layer <layer> [--domain <d>]` writes refactor/moves/s<seq>-<layer>[-<domain>]-p<pass>.json, one map per pass, with seq after the last committed map. Each map carries:
   - `barrels` for new folders that have no index.ts: the shared notifications group root, client-core inbox/search, the family-web people/portal units, and the staff-mobile and family-mobile features roots.
   - no identifier `renames`, because only folders change.

3. Apply: `move-module.ts <map>`.
   - It moves files with their companions (x.test.*, __snapshots__) and rewrites, across the monorepo, relative imports, `@/` aliases, re-exports, import(), require and vi/jest mock paths.
   - It also rewrites repo paths in md, yml and json: owned-routes.json, e2e/areas.json, workflows (deploy-staging.yml), oxlint-suppressions.json, knip.json and the refactor/guards baselines (guard:baselines follows git renames).
   - Apps: rewritten imports stay absolute `@/…`. Then run `pnpm imports:absolute -- <app> --write` for any leftovers.
   - Packages: imports stay relative inside the package. @ab/shared and @ab/client-core export only `.` (shared also `./testing`), so package-internal moves change only their src/index.ts and nothing in the apps.
   - By hand in the same PR: path strings in .mjs and .ts config or fixtures (lint.blocks.mjs, tools/scripts/ci-checks/e2e-areas fixtures, the components and mappers gate tests), and CLAUDE.md rule 13's mobile path. The pure-move check accepts a string literal that changes by exactly a rename in the same diff.

4. Dry run (new `--dry-run`): expands the maps against the current tree and writes nothing. It prints the files matched per entry, and fails on:
   - an entry that matches nothing (expandEntry returns [] silently today);
   - a file matched twice within one map;
   - two files moving to one target;
   - a simulated tree that breaks folder-cap or guard:structure.
   I ran the same simulation against origin/develop at 8936decfc: all 576 entries match, with no clash, no same-pass overlap and no re-walk. The only folders over the cap are staff-web features/people (its keys/ folder is dissolved by hand) and client-core people (roster/ is left holding only index.ts). Both clear with the hand splits.

5. Re-run on a fresh develop: rebase the branch, then run `move-module.ts --replay` so earlier committed maps follow. Then regenerate the layer's maps from plan.json and run --dry-run. Any entry that develop has since broken (a file renamed or added) is fixed in plan.json before the PR. Running a map twice gives no diff.

6. PRs: one per layer, or per api domain. The branch is refactor/* so the pure-move check runs. The title is `refactor(<scope>): move <domain> into feature folders`. Checks: folder-cap --strict, guard:structure for that layer, guard:baselines, the route-map snapshot tests (URLs unchanged) and the full CI. Hand splits follow on lane/<name> branches.

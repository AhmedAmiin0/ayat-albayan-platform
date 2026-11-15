# 50 — Family app (guardians + students), mobile + web

Owner 2026-11-14: «make a new mobile app for the students/guardians». Agreed in conversation (quotes are the owner's). Checked against origin/develop d6272b6fa. Builders: this doc is the spec; where it says "builder's call", decide and note it in the PR body.

## 1. Intent

Families stop depending on WhatsApp messages and Google links to follow their child. One place, on the phone and in the browser, shows each child's schedule, what happened in every lesson and what to prepare next.

- «as a guardian i want to be able to see the full list of my children reports/sessions»
- «students should be able to sign in themselves»
- «the student will see the reports and the schedule and the lessons he attended and the lessons he was absent» (first version)
- «yes package for guardian … he will see the details for all the children he have»
- «make the application interactive for the user and make sure that the code quality stays dry and solid»

## 2. Scope of the first version

| Who | Sees |
|---|---|
| Guardian | Home with ALL their children at a glance; per child: upcoming lessons + join, attended lessons + reports, absent lessons, package (incl. money) |
| Student, adult who is their own contact (`students.contact_is_self`) | Same as a guardian, for themselves only |
| Student, child | Upcoming lessons + join, attended + reports, absent. **Never money or the package screen** |

Per lesson:
- **Upcoming:** day/time in the viewer's tz; a live countdown; «ادخل الحلقة».
- **«ما المطلوب للحلقة القادمة»:** the newest SENT report's `homework` («الواجب المطلوب قبل الحلقة القادمة») and `next_plan` («خطة الحلقة القادمة»), shown on the next-lesson card.
- **Attended:** opens the report (same content as the parent PDF: recited, new memorisation, revision, tajweed/theory, grades, notes, homework, next plan) + the PDF + the recording when one is visible (`visible_to_student`).
- **Absent:** date, and the reason when one was recorded.

**Join (on from day one, no switch):** «ادخل الحلقة» opens whatever is enabled for that lesson: the external link (Google Meet) or the in-house room (LiveKit, inside the app / page). Today's rule `wayIn()` (portal-lessons.mapper.ts) and `POST /portal/students/:id/lessons/:lessonId/join` already decide and serve this; reuse them, never a second rule.

**Package (guardian / adult student only):**
- package name and duration;
- lessons used and left («8 من 12»);
- start, end and renewal dates;
- **amount due**, with the academy's payment instructions (manual transfer; online pay is out of scope);
- payment history (date, amount).

**Chat:** «all chat in app is turned off by default from the config». ONE new setting, `family_chat_enabled` (bool, default **false**, «القيم», `reachesFamilies`).
- While off:
  - the API refuses every family channel read/write: 403 `family_chat_off`;
  - no chat tab or icon on web or mobile;
  - no teacher push for family messages.
- While on: today's teacher↔family channel (`apps/api/src/modules/teaching/student-channels/`, write rules in `channel-access.ts`) works as it does now.

**No WhatsApp inside the app or the family web pages.** «there is no whats app messages its all in app chat»: remove the `renew_url` wa.me link from `PortalHome` and every family screen. WhatsApp reminders and report PDFs keep going out exactly as today («not now, after we full migrate»).

## 3. Non-goals (first version)

- A family↔academy (sales) in-app chat. It doesn't exist; it comes after chat is switched on.
- Online payment or an in-app renewal flow.
- iOS (needs an Apple developer account).
- Any WhatsApp cut-over.
- Families editing, cancelling or rescheduling anything.

## 4. Anti-goals (a failure even if it "works")

- A child student sees a price, amount or payment.
- A family sees another family's student (today's `portal_students_of()` scoping must hold on every new endpoint: unknown id = 404 `student_not_found`).
- Any link to WhatsApp in the family app or pages.
- A second copy of logic that already exists for staff or the web (see §7).
- Pushes to families who never signed into the app; pushes while the setting/rule for that kind is off.

## 5. What exists (reuse) and what is missing (build)

Exists (paths on develop):
- **Roles `guardian` / `student`** with `self.portal` (packages/catalog/src/permissions/catalog.data.ts).
- **Sign-in** (apps/api/src/modules/people/sign-in/):
  - a guardian by phone + WhatsApp code;
  - a student by student code + password; the first password is set with a code sent to the guardian's phone;
  - settings `family_login_enabled` (default off), `login_code_ttl_minutes`, `login_code_max_attempts`;
  - web panel apps/web/src/features/people/auth/family/FamilyPanel.tsx.
- **Portal API** (apps/api/src/modules/people/portal/):
  - `GET /portal/me`;
  - `…/students/:id/lessons` (next 14 days + running);
  - `…/lessons/:lessonId/join`;
  - `…/reports` (sent only);
  - `…/reports/:id/url`;
  - `…/recordings/:id/url`;
  - `…/package` (no money).
  - Types: packages/shared/src/people/students/portal.ts.
- **Report content** for a family: `GET /report-pages/by-report/:id` (apps/api/src/modules/reporting/report-page/).
- **Web portal:** apps/web/src/routes/portal.tsx → features/people/portal/PortalHome.tsx (child switcher; tabs lessons / reports / package / chat).
- **Chat:** student_channels (migrations 800/971/993) and their endpoints; realtime signal + polling in packages/client-core/src/messaging/channels/.
- **Push:** apps/api/src/common/push/; `profiles.push_tokens` + `push_device_sessions`; `PUT /me/push-tokens` (needs `notifications.push`); kinds in packages/catalog/src/enums/messaging.ts; rules off/bell/push (push.rules.ts).
  - Family schedule notices are already planned in `schedule-notices/notice.plan.ts` (`familyParts`), but are dropped: guardian/student lack `notifications.push`.
- **Mobile app** apps/mobile:
  - one expo-router app with a guarded stack per staff role;
  - guardians/students get the «wrongApp» notice;
  - `app.config.ts` already builds a second app identity (the `stripetest` variant, own package id).
- **Shared TS packages:** `@ab/shared`, `@ab/client-core` (HTTP, query keys, channel code with a `'portal'` audience), `@ab/schedule` (join window), `@ab/time`, `@ab/money`, `@ab/settings`, `@ab/i18n`.

Missing (build):
1. **Past lessons:** `GET /portal/students/:id/history?status=attended|absent&cursor=` (newest first, paginated). Each row has lesson time, teacher display name, attendance outcome (+ reason for absence where recorded), `report_id` when a SENT report exists, `recording_id` when visible. Same scoping as the other portal routes.
2. **«ما المطلوب»:** `prepare: {homework, next_plan, report_id, lesson_starts_at} | null` from the newest sent report, on the lessons response (or its own route, builder's call). Only sent reports, never a draft.
3. **Package money:**
   - Extend `/package` for guardian and adult student with `lessons_used`, `amount_due` (currency, from the same calculation staff see in `StudentBalanceView`), `payments[]` (date, amount, currency) and `payment_instructions`.
   - Build a reduced `FamilyBalanceView`, the way `TeacherBalanceView` reduces it for teachers. Never invoices' internals, never commissions or teacher pay.
   - A **child** student gets 403 `package_guardian_only` on `/package`.
4. **`payment_instructions`:** reuse an existing bank-transfer text setting if one exists, else add one text setting (`family_payment_instructions`, «القيم», default empty → the package screen shows nothing for it).
5. **`family_chat_enabled`** (§2): setting + API gate in `ChannelAccess` family paths + `teacher_student_messages_enabled` untouched for the teacher side.
6. **Push for families:**
   - Grant `notifications.push` to `guardian` and `student` in the catalog: a fixed portal-role grant, since `portal_role_fixed` blocks editing it in the UI.
   - Add kinds `lesson_starting` (when the join window opens, once per lesson per recipient, dedup key) and `report_sent` (when the report is sent to the family).
   - Default both kinds to `push`; the admin can turn either off with today's rule screen.
   - Existing `familyParts` notices then start reaching app users.
   - Children: lesson/report kinds only, never money.
   - No push for a profile with no push token (inherent).
7. **The family mobile app** (§6).
8. **Web parity:** the family web pages show the same screens as the app (§6), from the same shared code (§7). Includes the guardian's all-children home and the attended/absent views.

## 6. Screens (mobile app and web, same structure)

| Screen | Content |
|---|---|
| Sign-in | Guardian: phone + WhatsApp code. Student: code + password, «أول دخول؟», forgot. Reuse the API and web panel logic. |
| Home (guardian) | One card per child: name + code; next lesson with live countdown and «ادخل الحلقة» when the window opens; «ما المطلوب»; this month attended/absent counts; package summary (left of total, renews on, amount due badge). Tap → child. |
| Home (student) | Their own child screen directly (no list). |
| Child | Tabs: «القادمة» (upcoming + prepare card), «حضرها» (attended → report), «غاب عنها» (absent), «الباقة» (guardian / adult only). |
| Report | The report content, PDF button, recording player when visible. |
| Package | §2 package fields, payment history, payment instructions. |
| Settings | Name, sign out, notifications on/off for this device (unregisters the token). |

**Interactive (owner ask):**
- live countdown; join lights up at the window;
- pull-to-refresh on every list, skeletons while loading;
- instant pressed states / haptics on join;
- animated tab changes;
- a «جديد» mark on reports the family hasn't opened (builder's call where the "seen" state lives, server or device);
- realtime re-read when a report is sent, if cheap through the existing realtime signal, else on focus/refresh;
- keep the academy's colours and Arabic-first RTL type (memory: no palette change).

## 7. How it is built (DRY / SOLID)

**The app** (owner 2026-11-14: a separate app, not a variant of the staff app):
- A separate app on the phone: its own name, icon, Android package / iOS bundle `com.ayatalbayan.family`, scheme `ayatalbayanfamily`, own EAS project and update channels.
- **`apps/family`**: its own Expo project (package `family`, slug `ayat-albayan-family`, owner `holdmycup`), with the family routes only (expo-router `app/`) and the same scripts as apps/mobile: `lint`, `typecheck`, `test` (jest-expo), `bundle` (`expo export --platform android`), `eas-build-post-install` (`pnpm --filter "family^..." build`).
  - `eas.json`: profiles `preview` (APK, channel and environment `preview`) and `production` (channel `production`).
  - `app.config.ts` reads `FAMILY_EAS_PROJECT_ID` (→ `extra.eas.projectId` and `updates.url`; unset = no updates url) and `GOOGLE_SERVICES_JSON` (→ `android.googleServicesFile`).
- **`packages/mobile-kit`** (`@ab/mobile-kit`): what both apps share (theme, UI kit, auth session, push registration, i18n). A **source** package: no build step; Metro, jest and tsc read its `.ts` sources.
- **apps/mobile** is the staff app again: no family routes, no `family-*` EAS profiles. The staff app keeps showing «wrongApp» to families; the family app shows it to staff.
- **No in-app room route for now:** the staff app's classroom (LiveKit) stays staff code in apps/mobile; it is not in the kit.
- The constraint stays: **no copied screen, hook or helper** between the two apps: what both need moves into `@ab/mobile-kit` (or `@ab/client-core` when the web needs it too).
- **CI** (`ci.yml` «verify»): lint and typecheck cover every workspace; `test family` runs the family app and `@ab/mobile-kit` (jest-expo, own machine); `bundle family` runs the Metro bundle. A change only under apps/mobile, apps/family or packages/mobile-kit skips the e2e machines.

**Shared client logic:**
- Portal queries (keys, fetchers, zod schemas) and view-model rules go in `@ab/client-core` (e.g. `messaging`-style folder `people/portal/`). Both web `PortalHome` and the app use them.
- The view-model rules are: lesson card state from `@ab/schedule` join window, countdown, attended/absent grouping, package display, who sees money.
- Web's existing portal code moves onto these, not beside them.

**Server:**
- New portal endpoints follow the module's controller / service / repo / mapper split and the existing scope guard.
- The money view is a mapper over the staff balance, not a second calculation.

**Repo rules:** 150 lines per file, 3 params, no `any`, lookup maps over if-chains, unit tests next to code, MSA strings in `packages/shared/i18n/ar.json`.

## 8. Rollout and owner steps

- **PRs, in order (each green on CI, merged by the owner's session):**
  1. API + shared: history, prepare, package money + child block, `family_chat_enabled`, push grant + kinds, `payment_instructions`.
  2. `@ab/client-core` portal + web pages.
  3. The family app (`apps/family` + `@ab/mobile-kit`) and its screens.
  4. e2e: guardian sees all children + attended/absent + package; a child student never sees money; chat hidden when off.
- **Builds** (GitHub → Actions → mobile → Run workflow on develop, **app = family**; `profile` and `branch` are staff-only):
  - every step runs in `apps/family` with its own `preview` profile: `build-android-apk` = its APK, `ota-update` = an OTA to its channel `preview`, compared with its own last build (native-change guard);
  - first, `eas init --non-interactive --force` links the EAS project `@holdmycup/ayat-albayan-family`, or creates it on the first run. Its id goes to `FAMILY_EAS_PROJECT_ID` for the run's later steps and is printed in the run summary (it is not a secret);
  - the id is committed: `apps/family/app.config.ts` falls back to `ccc6c105-1f67-4b5e-ada5-c892bddaa95a` (`FAMILY_EAS_PROJECT_ID ?? EAS_BUILD_PROJECT_ID ?? <that id>`, owner 2026-11-15), so Expo's build servers and every later run have it without the env; the workflow's `eas init` step stays;
  - run titles are `mobile <action> family-preview`; release tags `mobile-family-v<version>-b<run>` (APK) and `ota-family-preview-<day>-<n>` (OTA);
  - deploy-staging's automatic OTA stays **staff only** (it dispatches mobile.yml without `app`, i.e. staff); a family OTA is always run by hand.
- **Owner, before families can sign in:**
  - switch `family_login_enabled` on in «القيم» (the `account_code` template is approved on the chat line);
  - Firebase: add the Android app `com.ayatalbayan.family`, download its `google-services.json` and upload it to the **family** EAS project as the **file** environment variable `GOOGLE_SERVICES_JSON`, environments `preview` and `production` (credentials: owner);
  - in the family EAS project's `preview` and `production` environments, set the same `EXPO_PUBLIC_*` variables the staff project has (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_ORIGIN`);
  - choose the app's name and icon (default: «آيات البيان», the academy logo).
- **Then:** a family APK (mobile → `build-android-apk`, app = family); Play Store later.

## 9. Left to the builder

- Pagination sizes; skeleton and animation details within the theme.
- Whether `prepare` rides on the lessons response or has its own route.
- Where the report "seen" mark lives.
- Exact build wiring inside apps/family and what moves into `@ab/mobile-kit`.
- Naming of new files.

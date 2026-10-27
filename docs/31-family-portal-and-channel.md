# 31 — Family portal and student channel

Owner, 2026-10-27: «a basic portal: upcoming lessons with the join link, lesson reports, the package (lessons
left, renewal date); a web page that works on the phone browser». Families reach it only once family sign-in
(docs/30, branch `cloud/family-auth`) ships and its flag is on: a guardian signs in by phone + WhatsApp code
(`guardians.profile_id`, base role `guardian`, also an adult student who is their own contact,
`students.contact_is_self`), a child by `students.code` + password (`students.profile_id`, base role `student`).
This document builds against those roles and links only; it never touches sign-in, `/login`, `/set-password`
or the auth endpoints.

## 1. Portal (PR «portal: the family's lessons, reports and package»)

### Decisions

1. **One page, phone first.** `/portal` is the portal shell's home (`PortalShell` → `AppShell homePage`), no
   child routes (the routes folder is at its cap). Mobile-first card list, RTL, the app's design language
   (docs/07): a student switcher, then three tabs «الحلقات القادمة» · «تقارير الحلقات» · «الباقة».
2. **Who sees what.** A guardian login sees every student of that guardian («أبنائي»); a student login sees
   only itself; an adult who is their own contact reads «حسابي» (`contact_is_self`, read through `to_jsonb` so
   the code works before and after docs/30 adds the column). Scope = `portal_students_of(profile)` (migration
   790, service role), decided by the profile's role in the database, empty for a disabled profile.
3. **Access key.** The portal roles hold no matrix permission (migration 433). The routes carry the new scope
   key `self.portal` (`area: 'self'`, follows the base role guardian/student, never grantable), like
   `self.teacher`. `access-before.json` records the seven handlers as `["guardian","student"]`.
4. **«الحلقات القادمة».** The next 14 days (`PORTAL_LESSON_DAYS`) plus the lesson whose room is still open,
   moved-away lessons left out. Time on the student's clock (`students.tz`), the Riyadh time under it. Teacher
   display name, status chip. «ادخل الحلقة» only inside the join window (`settings.join_opens_before_min /
   join_closes_after_min`), re-read every 30 s so it turns on by itself.
   - **Our classroom** — the reminders' rule (`reminders.links.ts roomFor`): a platform lesson
     (`usesPlatform(teacher.meeting_mode, settings.meeting_link_auto)`), or a lesson with no link of its own,
     once LiveKit is configured; a platform lesson never falls back to a fixed link (no LiveKit → no way in).
     `POST /portal/students/:id/lessons/:lessonId/join` → `StudentLinkService.portalJoin`: the same guest
     admission the student's own link gives (`/s/<token>`), for that lesson of that student only, refused
     outside the window (403 `join_not_open_yet` + `opens_at`, 410 `join_closed`), rate-limited per login
     and lesson (429), and admitted through THE `(lesson, student)` row of `lesson_join_links` (migration 191)
     found or created once, so a removal from the room (`classroom_blocks.join_link_id`) holds and no token
     leaves the API: the `/join/<token>` the reminder sent on WhatsApp keeps working beside it. The room opens
     in the portal itself, covering the page. (Review fix: a first version re-tokened that row for a URL,
     which killed the WhatsApp link.)
   - **External**: the student's `meeting_link_override` on a one-student lesson, else the lesson's own link;
     the API sends it only while the window is open.
5. **«تقارير الحلقات».** Reports already sent to the family (`status = submitted`, `pdf_status = ready`,
   `sent_at` set): the same PDFs, newest first. The list carries no link; each tap mints a signed URL: a PDF
   lives 5 minutes (`SIGNED_URL_SECONDS.portal`), a recording an hour (a player keeps range-requesting it);
   the web opens a blank tab inside the tap (`opener` cleared) and points it at the URL (phones block a tab
   opened after an await). A recording is offered only when staff switched
   `visible_to_student` on (default off), it is finished, and the lesson had one student.
6. **«الباقة».** The newest package (as alerts and the admin balance read it): package name, lessons left over
   all packages (`studentRemaining`, the admin's number), lesson length, start, renewal date, a family-worded
   status chip («بانتظار التفعيل» for `unpaid`); a negative balance reads 0. No price, payment, invoice or
   currency. «تواصل معنا للتجديد» opens `wa.me/<chat line>`: the chat role's default number in module mode
   (`wa_numbers`), else the last good line check of the chat line (`wa_line_health`); an academy on one
   number (no separate chat line) uses the notifications line; hidden while no number is known. Never
   hard-coded.
7. **Whitelists.** Every response is mapped field by field: no teacher phone or email, meeting mode, note,
   reason, money, storage path or other family. Tests walk every key of every portal response.

### API

| Route | Answer |
|-------|--------|
| `GET /portal/me` | `{ kind, students[], renew_url }` |
| `GET /portal/students/:id/lessons` | `{ lessons[] }` with `way_in`, `meeting_url` (open window only), `window` |
| `POST /portal/students/:id/lessons/:lessonId/join` | the room join (`RoomJoinResult`); 404 / 409 `not_classroom_lesson` / 403 / 410 / 429 / 503 |
| `GET /portal/students/:id/reports` | `{ reports[] }` with `recording_id` |
| `POST /portal/students/:id/reports/:reportId/url` | `{ url, expires_at }` (5 min) |
| `POST /portal/students/:id/recordings/:recordingId/url` | `{ url, expires_at }` (1 h, playback) |
| `GET /portal/students/:id/package` | `{ package | null }` |

Another family's (or, for a student login, a sibling's) id is 404 `student_not_found`, the answer of an
unknown id. The POSTs are logged by the activity log like every mutation.

### Database (migration `20261027000790_portal_scope.sql`)

- `portal_student_ids()`: the caller's students by `auth_role()` (null when disabled).
- The old guardian row policies of migrations 003, 071, 120, 121, 122 exposed whole rows (staff notes, cancel
  reasons, prices, payments; `guardians_self_read` the guardian's own staff notes) and are dropped; their
  helpers (`my_student_ids`, `is_my_child_*`) are no longer executable by clients. A portal login that calls
  PostgREST directly reads only whitelisted definer views: `portal_students`, `portal_guardians` (own row:
  name and tz), `portal_lessons`, `portal_reports`, `portal_packages`, `portal_recordings` (the
  `student_self` pattern of migration 288), and report PDFs in storage through `storage_reports_portal_read`
  (sent, ready reports of the scope). Checked against a local stack when written: a guardian sees exactly
  their students and none of the base tables, a student login never a sibling's lesson. Family sign-in
  (docs/30) reads the guardian row through the API (service role), so the drop does not touch it.
- `portal_students_of(profile)`: the API's scope read, service role only. Expand-only otherwise; writes no row.

## 2. Student channel

Added by the second PR (`cloud/student-channel`), see below once it lands.

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

## 2. Student channel (PR «student channel: a teacher–student chat watched by the assistant»)

Owner, 2026-10-27: «When the assistant registers a student it opens a chat channel between teacher and
student that is monitored by assistant and all authorized users.»

### Decisions

1. **In-platform messaging, not WhatsApp.** The WhatsApp Cloud API has no usable groups, and teachers already
   see the family's WhatsApp thread in teacher mode. The channel lives in our database and our apps; nothing
   is sent on WhatsApp.
2. **One channel per student, opened at registration.** A trigger on `students` INSERT opens it, whatever the
   path (sales registration, admin form, booking, import); one idempotent insert…select opened it for every
   existing student (new rows only). `merge_students` moves the merged student's messages into the kept
   channel.
3. **Participants** (read and write): the student's own login (`students.profile_id`, if any), the guardian's
   login (`guardians.profile_id`, if any; a child's guardian takes part, an adult who is their own contact is
   both), and the student's CURRENT teacher(s): `channel_teacher_ids(student)` = the assigned teacher
   (`students.teacher_id`) or the teacher of an open lesson of the student running now or starting within a
   day (a substitute on the day; a lesson booked weeks ahead with another teacher grants nothing yet). It is the
   current part of the teacher scope (`teacher_student_ids`, migration 165), whose 90-day look-back keeps
   reports readable but must not keep a chat: a teacher change moves access at once — the new teacher reads
   the whole history, the old one nothing.
4. **Monitors are read-only in v1**: the owning assistant (sales ownership, `ownershipOf`: her leads' families
   and the students she brought) and anyone holding the new permission `student_channels.monitor` (catalog,
   area messaging; the system admin by default, grantable to custom roles). A monitor has no send route: a
   post from a monitor is 403. Every monitor screen says «للاطلاع فقط».
5. **Text only**, 1–2000 characters (trimmed), links clickable with the shared `splitLinks`.
6. **Refresh** like the inbox: polling (web `INBOX_REFRESH_MS` while the window has focus, mobile every 15 s
   while the screen is shown). Threads open on the newest message (web scrolls to it, mobile is an inverted
   list); a time shows its day when it is not today. Unread counts per participant
   (`channel_reads.last_read_at`), counting the other side only: a teacher counts the family's messages (never
   a co-teacher's), the family the teacher's. Opening a thread marks it read up to the newest message shown
   (`POST …/read { at }`, never later than now), so a message that arrives after the screen read stays
   unread; a monitor never marks anything read.
7. **Notifications**: a message from the family pushes to the current teacher(s) only, through the existing
   push service, new kind `channel_message` (its catalogue row `channel_message` follows the notification
   settings like every staff kind: off → nothing, bell only → no device push). The bell row quotes up to 80
   characters, and it stays in that teacher's bell after a teacher change. A teacher's message notifies
   nobody (the family reads it in the portal). No WhatsApp; nothing to monitors.
8. **Trial students**: the channel is open from registration (the owner's request), so a teacher assigned to
   a trial student can write to the family in the platform; the WhatsApp rule (no teacher ↔ family chat
   before the subscription, owner 2026-10-11) is unchanged. Owner to confirm.

### API (`apps/api/src/modules/teaching/student-channels`)

| Who | Routes | Key |
|-----|--------|-----|
| Teacher | `GET /teachers/me/channels` (my current students, last message, unread), `GET/POST /teachers/me/channels/:studentId/messages`, `POST …/read` | `self.teacher` |
| Family | `GET/POST /portal/students/:id/channel/messages`, `POST /portal/students/:id/channel/read`, `GET /portal/students/:id/channel/unread` | `self.portal` |
| Admin monitor | `GET /students/:id/channel/messages` | `student_channels.monitor` |
| Sales monitor | `GET /sales/students/:id/channel/messages` (owned students only) | `self.sales` |

`GET …/messages?before=<iso>` pages back 50 at a time, newest page first. A message view is
`{ id, body, sender_role, sender_name, mine, created_at }`: names only (the teacher's display name, the
student's or guardian's name), never a phone, email or profile id; a page also carries `student_name` (the
header). RLS lets a direct PostgREST reader see `sender_profile_id` (a uuid, no personal data); the apps
read through the API only.

### Database (`20261028000800_student_channels.sql`, `20261028000801_push_kind_channel.sql`)

Numbered 800–801 on the `20261028` prefix: family sign-in (docs/30) landed its 770–775 on that prefix first, and the
migration check refuses a new file that sorts before the base branch's latest.


`student_channels (id, student_id unique, created_at)`, `channel_messages (id, channel_id, sender_profile_id,
sender_role, body check 1..2000, created_at)`, `channel_reads (channel_id, profile_id, last_read_at, primary
key both)`. RLS on all three: a participant, the owning assistant and the admin read
(`can_read_channel`); a profile reads its own read marks; no client writes (the API is the writer). Checked
against a local stack when written: the trigger, the backfill, a teacher change, another family refused, a
merge.

### Apps

- Web: teacher «رسائل الطلاب» (`/teacher/messages`); the portal tab «المحادثة مع المعلم/ة»; the admin's student
  page and the assistant's «طلابي» list open the read-only thread.
- Mobile (JS only, OTA): teacher «المزيد» → «رسائل الطلاب» (list + thread); the admin's student file and the
  assistant's «طلابي» rows open the read-only thread.

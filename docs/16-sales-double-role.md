# 16 — Sales double role (sales + classroom assistant)

Owner, 2026-10-11: «sales should be able to see all chats and see the confirmed subscriptions they made
with their history», «also they should be able to see teachers students and current running sessions»,
«sales are playing double roles here: sales and assistant role».

The base role `sales` (shown «المبيعات», PR #74) keeps everything it had and also does the classroom
assistant's job across the academy. Smallest change: reuse the inbox, the classroom join and the
assistant's session row; new read-only routes under `/sales` with whitelisted columns.

## Decisions

| # | Area | Decision |
|---|---|---|
| 1 | All chats | `SalesScope` is widened server-side to **every thread**: it now carries only the salesperson's id (dedup key, audit `sales_id`). `SalesThreadsService` lists without a phone filter and opens any thread; text and template sends no longer check the phone. What made the sales view different stays: no «غير مدفوع» flag, the people panel lists the family's children **without packages or money**, the next lessons without meeting links, the two signed-link templates (`lesson_join_link`, `lesson_feedback_request`) dropped from the log and stripped of params. Teachers' `TeacherScope` is untouched. |
| 1a | Lessons in a template | A template naming a lesson is no longer limited to the salesperson's trials (same as the admin): she answers every family. `ThreadsQueries.salesOwnsLesson` is removed (no caller left). |
| 1b | Rating, media picker | Unchanged: «إرسال تقييم الحلقة» needs `feedback.write` and the «من الشات» file picker needs `inbox.media` (payment proofs = money); neither is a sales grant. Media inside messages (the bubbles' `media_url`) shows in every thread, as before for her own. The admin can still grant either key to a custom role in the matrix. |
| 1c | Ownership | Lead assignment (`leads.assigned_to`), auto-assign and `students.brought_by` (commission) are not touched: «طلابي», «مدفوعاتي», «أرباحي», «مواعيدي» and the pending/confirmed lists keep the ownership rule (`ownershipOf`). |
| 2 | Subscription history | `GET /sales/subscriptions/:id/history`. Allowed when the subscription's student is in the salesperson's ownership (the **same** `ownershipOf(...).studentIds` rule `SalesService.subscriptions` uses); otherwise 404 `subscription_not_found` (no existence leak). Returns the student and **all** that student's subscriptions oldest → newest: package, status, starts_on, renews_on, ended_at, lessons total / used / remaining (`v_subscription_balance`), the status changes from `audit_log` (date, from, to — nothing else of the audit row) and the linked payments as **date, kind, amount and currency** (owner decision 2026-10-11: a salesperson sees the payment amounts of the subscriptions she made; never method, receipt, fx or note, and no price of any other subscription). The web opens it from a «السجل» button on the «مؤكدة» tab (`?kind=confirmed&history=<id>`). |
| 3 | Teachers | `GET /sales/teachers`: active teachers, Arabic/English display name, gender, programs, and the students they teach (`students.teacher_id`, not churned: id, name, code). Never rates, phone, meeting link, calendar, max load or pay. |
| 4 | All students | `GET /sales/students/all?page&pageSize&search`: code, name, status, program, teacher name, guardian name. Search = Arabic-normalised name or code (the admin list's `studentNameOrCodeFilter`), ordered by name, paged (`Page<T>`). Never balances, packages, notes, phones, meeting links. Page `/sales/all-students` «كل الطلاب», next to «طلابي» in the nav. |
| 5 | Running now | `GET /sales/live`: lessons with `starts_at <= now < ends_at` and an open status (`OPEN_LESSON_STATUSES`), teacher and student names, the `AssistantLessonView` shape so the web reuses the assistant's row. Page `/sales/live` «الحلقات الجارية»; the sales landing (`/sales` → the inbox) shows a one-line block «N حلقة جارية الآن» linking to it, only when one is running. |
| 5a | Joining | `POST /lessons/:id/room/join` (unchanged route): a salesperson joins **her own trial** as `sales` (as before) and **any other lesson** as `assistant`, bound by the join window like every non-admin. Kick follows the same role rule (`classroom.kick` is already a sales grant); mute / share grants need `classroom.moderate`, which sales does not hold, so nothing else widens. |
| 6 | Permissions | New base-role scope key `self.sales_academy` (teachers, all students, running lessons), `area: 'self'`, never stored, never grantable, like `self.sales_students`. History rides on `self.sales` (it is part of «الاشتراكات»). New handlers recorded in `parity/access-before.json` as `["sales"]`. |
| 7 | Database | No migration: the API (service role) is the only reader of these routes; the sales RLS policies of migrations 187/274 stay the narrower second wall for direct client reads (none in the web). |
| 8 | Wording | New strings in `ar.json` (MSA, «المبيعات» vocabulary) with `en.json` parity; the existing wording of PR #74 is unchanged. |

## Routes

| Method | Path | Permission | Payload |
|---|---|---|---|
| GET | `/threads`, `/threads/:phone`, POST `…/text`, `…/template` | `inbox.read` / `inbox.send` (unchanged) | every thread, sales redactions |
| GET | `/sales/subscriptions/:id/history` | `self.sales` | `SalesSubscriptionHistory` |
| GET | `/sales/teachers` | `self.sales_academy` | `SalesTeacherView[]` |
| GET | `/sales/students/all` | `self.sales_academy` | `Page<SalesStudentView>` |
| GET | `/sales/live` | `self.sales_academy` | `AssistantLessonView[]` |
| POST | `/lessons/:id/room/join` | `classroom.join` (unchanged) | sales → `sales` or `assistant` |

## Owner report 2026-10-12: start a conversation, teachers, schedule (web + mobile)

| # | Area | Decision |
|---|---|---|
| 9 | Start a conversation | Root cause: `messages.read` was a teacher-only grant, so `GET /messaging/templates` answered 403 for sales and the template picker stayed empty. `messages.read` is now a sales grant (catalog + migration `20261012000300_sales_messages_read.sql`). For sales the list is every approved template the thread send accepts (no PDF one, none of the three own-button templates: `lesson_feedback_request`, `lesson_join_link`, `lesson_rating`). It also opens `GET /messages/gate` (open or not, queue size). `messages.manage` and `templates.manage` stay admin-only. |
| 9a | No thread yet | Admin and sales open a number by URL (`?phone=`, as a lead's or a booking's «افتح المحادثة») or the new «محادثة جديدة» form (web inbox list, mobile «المحادثات» header). A number with no message shows the first-template pane; `GET /threads/:phone` finds a booked family by its number (guardian / lead / teacher) so the template can name the family's next lesson (rule 6). |
| 10 | Teachers | Master-detail. `GET /sales/teachers` adds `lessons_today`, `live_now` and, per student, `program`, `status` and `next_lesson_at` (the next open lesson in the coming 8 days). Web: list + side drawer; mobile: list screen + detail screen. The filter rules are shared (`@ab/shared` `filterSalesTeachers`). Still never pay, rates, phone or meeting link. |
| 11 | Schedule | `GET /sales/schedule?date&teacherId` (`self.sales_academy`): one Riyadh day, whitelisted (time, status, trial, makeup, teacher, students; never a meeting link, reason, note, attendance or money). Web `/sales/schedule` «جدول الحلقات» reuses the admin `LessonChip` read-only; mobile reuses the day switcher and the agenda row's layout. A running lesson shows «ادخل الحلقة» (she joins as the classroom assistant, decision 5a). |

## Owner request 2026-10-12: register a new student from the chat (web + mobile)

| # | Area | Decision |
|---|---|---|
| 12 | Registration | «تسجيل طالب جديد» lives in the chat: on a sales thread with a lead still in the funnel (not a family, a teacher, a converted or a lost lead), the web header opens the same booking wizard in sales mode in a dialog, and mobile pushes the trial wizard in sales mode (`/inbox/book?…&mode=register`). Both post to `/sales/booking`, so the new student is credited to the salesperson (`brought_by`) exactly as before. Prefill = what the thread carries: lead id, number, WhatsApp name, source (sales holds no `leads.read`, so the lead's qualification is not read). After booking, «ارجع للمحادثة» closes the dialog (web) or goes back (mobile) to the same chat. |
| 12c | Scope | The API rule is unchanged: `/sales/booking` books only from the salesperson's **own** (assigned) lead. Every chat is visible (decision 1), so on a lead assigned to someone else the booking answers 403 `not_your_lead`; the wizard now says so in words («هذا العميل غير مسند إليك…», `booking.error.not_your_lead`, and `not_your_family`) instead of the generic error. Hiding the action on such leads needs the assignment in the thread payload (open question for the owner). |
| 12a | Old page | `/sales/register` and its nav entry are removed; the route only redirects to `/sales/inbox` (on that chat when the old link carried `phone`). |
| 12b | Wording | The nav entry for `/sales/meetings` reads «الاجتماعات» (`sales.nav.meetings`); «جدول الحلقات» is only `/sales/schedule`. |

## Next step (not in this change)

Mobile (`apps/mobile`): the same pages for the sales base role (all chats already follow the API), the
running-lessons list with «ادخل الحلقة», teachers and all students. Not part of this PR.

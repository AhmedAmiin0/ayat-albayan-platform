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
| 1c | Ownership | Lead assignment (`leads.assigned_to`), auto-assign and `students.brought_by` (commission) are not touched: «طلابي», «مدفوعاتي», «أرباحي», «مواعيدي» and the pending/confirmed lists keep the ownership rule (`ownershipOf`). Registration (`/sales/booking`) checks it only while `sales_auto_assign` is ON (row 13). |
| 2 | Subscription history | `GET /sales/subscriptions/:id/history`. Allowed when the subscription's student is in the salesperson's ownership (the **same** `ownershipOf(...).studentIds` rule `SalesService.subscriptions` uses); otherwise 404 `subscription_not_found` (no existence leak). Returns the student and **all** that student's subscriptions oldest → newest: package, status, starts_on, renews_on, ended_at, lessons total / used / remaining (`v_subscription_balance`), the status changes from `audit_log` (date, from, to — nothing else of the audit row) and the linked payments as **date, kind, amount and currency** (owner decision 2026-10-11: a salesperson sees the payment amounts of the subscriptions she made; never method, receipt, fx or note, and no price of any other subscription). The web opens it from a «السجل» button on the «مؤكدة» tab (`?kind=confirmed&history=<id>`). |
| 3 | Teachers | `GET /sales/teachers`: active teachers, Arabic/English display name, gender, programs, and the students they teach (`students.teacher_id`, not churned: id, name, code). Never rates, phone, calendar, max load or pay. Meeting link: never, **except** the teacher's fixed link `teachers.meeting_link` (exception, owner 2026-10-12, row 14). |
| 4 | All students | `GET /sales/students/all?page&pageSize&search`: code, name, status, program, teacher name, guardian name. Search = Arabic-normalised name or code (the admin list's `studentNameOrCodeFilter`), ordered by name, paged (`Page<T>`). Never balances, packages, notes, phones, meeting links. Page `/sales/students` «الطلاب» (owner 2026-10-12: one nav entry; «كل الطلاب» is the default view and «طلابي» a view filter, `?view=mine`; `/sales/all-students` redirects there). |
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
| 9 | Start a conversation | Root cause: `messages.read` was a teacher-only grant, so `GET /messaging/templates` answered 403 for sales and the template picker stayed empty. `messages.read` is now a sales grant (catalog + migration `20261012000300_sales_messages_read.sql`). For sales the list is the approved templates the thread send accepts (no PDF one, none of the three own-button templates: `lesson_feedback_request`, `lesson_join_link`, `lesson_rating`), and since row 13 only the admin's starters. It also opens `GET /messages/gate` (open or not, queue size). `messages.manage` and `templates.manage` stay admin-only. |
| 9a | No thread yet | Admin and sales open a number by URL (`?phone=`, as a lead's or a booking's «افتح المحادثة») or the new «محادثة جديدة» form (web inbox list, mobile «المحادثات» header). A number with no message shows the first-template pane; `GET /threads/:phone` finds a booked family by its number (guardian / lead / teacher) so the template can name the family's next lesson (rule 6). |
| 10 | Teachers | Master-detail. `GET /sales/teachers` adds `lessons_today`, `live_now` and, per student, `program`, `status` and `next_lesson_at` (the next open lesson in the coming 8 days). Web: list + side drawer; mobile: list screen + detail screen. The filter rules are shared (`@ab/shared` `filterSalesTeachers`). Still never pay, rates or phone; the meeting link only as the exception of row 14 (2026-10-12). |
| 11 | Schedule | `GET /sales/schedule?date&teacherId` (`self.sales_academy`): one Riyadh day, whitelisted (time, status, trial, makeup, teacher, students; never a meeting link, reason, note, attendance or money). Web `/sales/schedule` «جدول الحلقات» reuses the admin `LessonChip` read-only; mobile reuses the day switcher and the agenda row's layout. A running lesson shows «ادخل الحلقة» (she joins as the classroom assistant, decision 5a). |

## Owner request 2026-10-12: register a new student from the chat (web + mobile)

| # | Area | Decision |
|---|---|---|
| 12 | Registration | «تسجيل طالب جديد» lives in the chat: on a sales thread with a lead still in the funnel (not a family, a teacher, a converted or a lost lead), the web header opens the same booking wizard in sales mode in a dialog, and mobile pushes the trial wizard in sales mode (`/inbox/book?…&mode=register`). Both post to `/sales/booking`, so the new student is credited to the salesperson (`brought_by`) exactly as before. Prefill = what the thread carries: lead id, number, WhatsApp name, source (sales holds no `leads.read`, so the lead's qualification is not read). After booking, «ارجع للمحادثة» closes the dialog (web) or goes back (mobile) to the same chat. |
| 12c | Scope | While `sales_auto_assign` is ON, `/sales/booking` books only from the salesperson's **own** (assigned) lead. Every chat is visible (decision 1), so on a lead assigned to someone else (or to nobody) the booking answers 403 `not_your_lead`; the wizard says so in words («هذا العميل غير مسند إليك…», `booking.error.not_your_lead`, and `not_your_family`) instead of the generic error. While it is OFF there is no ownership check (row 13). |
| 12a | Old page | `/sales/register` and its nav entry are removed; the route only redirects to `/sales/inbox` (on that chat when the old link carried `phone`). |
| 12b | Wording | Owner 2026-10-12: no meetings page for sales (`/sales/meetings` redirects to `/sales/schedule` «جدول الحلقات»; the mobile «اجتماعات داخلية» row is hidden for `self.sales`). «مدفوعاتي» is a view filter of «أرباحي» (`/sales/earnings?view=payments`; `/sales/payments` redirects there). |
| 13 | Auto-assign OFF | Owner 2026-10-12: «if auto assign is turned off dont validate over it from the sales side». `SalesBookingScope` (`sales-booking.ownership.ts`) reads `sales_auto_assign` per call: ON = today's ownership (`ownershipOf`), OFF = `null`, so `/sales/booking` (check, book, teachers, slots) skips `not_your_lead`, `not_your_student` and `not_your_family`, and the `duplicate_student` 409 lists every child (id and name only). The trial-only rules always hold (no package, makeup, override, meeting link or invoice). `leads.assigned_to` is not changed; `students.brought_by` (trigger, migration 270) still credits the salesperson who booked. No migration, no client change; the switch's hint says what OFF means. e2e: `assistant-auto-assign-off.api.spec.ts` (restores ON). |

## Owner request 2026-10-12: active / trial lists, the teacher's fixed link (web + mobile)

| # | Area | Decision |
|---|---|---|
| 14 | Fixed link (exception to rows 3 and 10) | Owner 2026-10-12: «make a way to show the teacher static meeting link for the assistant». `GET /sales/teachers` adds `meeting_link` = `teachers.meeting_link` (null when unset), still whitelisted (never rates, phone, pay, calendar or max load). Shown **only** in the teacher detail of «المعلمون» as «رابط الحلقة الثابت» (LTR, copy / share and open; rendered as a link only when it is http(s)); none: «لا يوجد رابط ثابت لهذا المعلم»; while `meeting_link_auto` is ON a one-line hint says families get the platform link instead. Never in the sales schedule, chat or students lists. |
| 15 | Active / trial | `GET /sales/teachers` adds `active_count` and `trial_count` per teacher (shared `countByKind`). The list rows show «مشترك n · تجريبي n»; the detail splits the students «مشترك · تجريبي · الكل» (default «مشترك»; «الكل» = the former list, paused included). The admin teachers and students lists and the mobile app have the same option. |

## Mobile: the sales and classroom-assistant phone apps (owner 2026-10-12 20:05Z)

The base role `sales` (the owner's «مساعد/ة») and the classroom `assistant` («مساعد حلقة») sign in to the
Expo app, each to its own home matching its web pages (standing rule 2026-10-06: web and mobile in sync).
JS only (ships by OTA): no dependency, no app.json change, no native module, no migration.

| # | Area | Decision |
|---|---|---|
| M1 | Routing | `AppRole` = admin, teacher, sales, assistant (`apps/mobile/src/auth/role-claim.ts`); `/auth/me` first, the token's `user_role` claim offline. Admin and teacher (incl. the teacher-mode double role) unchanged; guardian, student and no role are refused («wrongApp» / «لم يُفعَّل حسابك»), a disabled account gets «accountDisabled». |
| M2 | Sales tree `/sales` | Tabs in the web SalesNav order and gates: «المحادثات» (`inbox.read`; every chat and no leads list or lead / family tags, as the web `/sales/inbox`, even with `leads.read`; the thread in sales mode with «تسجيل طالب جديد» and the restricted templates, rows 1, 9, 12, 15), «الطلاب» (`self.sales_academy`; «طلابي» a filter), «جدول الحلقات» (`self.sales_academy`; read-only, «ادخل الحلقة» on a running lesson), «المزيد» («حسابي», «المعلمون» and «الحلقات الجارية» on `self.sales_academy`, «الاشتراكات» with «السجل» on `self.sales`, «أرباحي» with «مدفوعاتي» inside on `self.sales_earnings`, appearance, language, sign-out). No internal meetings (row 12b), no lead screen, no subscription panel, no rating send, no media picker, no retry / «ابعتها بنفسك» on a failed send (those need `messages.manage`, admin-only). Every link stays in `/sales` (`useSalesHrefs`, `inTree`): «جدولها» on a teacher opens `/sales/schedule`. |
| M3 | Assistant tree `/assistant` | «حلقاتي» (`self.assistant`): the open lessons of the students they assist (`GET /assistants/me/lessons`), today first and a Riyadh day at a time, «ادخل الحلقة» opening the room in the system browser; «اجتماعات داخلية» below (`meetings.read`: create, enter, share, end as `can_manage` allows). «المزيد»: «حسابي», appearance, language, sign-out. |
| M4 | Reuse | The same screens as the admin tree's «المبيعات» section (`src/sales`, `src/sales-money`, `src/inbox`, `src/classroom`, `src/meetings`); `src/nav/tree-base.tsx` prefixes their links with the tree, and the admin routes stay for double-role admins. |
| M5 | Push | Registered only when `/auth/me` lists `notifications.push` (admin-only by default): no OS prompt otherwise; a 403 from `PUT /me/push-tokens` is swallowed without a warning or UI. |
| M6 | Account | «حسابي» (R-ACC-01, the shared `AccountScreen`) heads both trees' «المزيد» (`/sales/more/account`, `/assistant/more/account`), with the header avatar; sign-out at the end. |

## Owner request 2026-10-12: starter templates (web + mobile composer)

| # | Area | Decision |
|---|---|---|
| 14 | Starters only | Sales list and send ONLY approved templates with `sales_starter` (docs/12 §13.18): `GET /messaging/templates` filters them, `POST /threads/:phone/template` answers 403 `template_not_allowed` for any other. The admin keeps every template. |
| 14a | Where they come from | «راجع حالة القوالب» imports every approved template of the chat (main) number's WABA the registry does not know, ticked (a `teacher_` one unticked), sent from the chat number. The admin ticks or unticks any template with «قالب بدء محادثة للمبيعات» on the templates page (`PATCH /messaging/templates/:key/starter`, audited). |
| 14b | Staging | The chat line is not configured on staging (Meta test credentials, `WA_TEMPLATE_SYNC=false`), so nothing is imported: sales see only the templates an admin ticks, none by default. Tick at least one approved template there, or sales cannot open a chat after 24 h. |

## Owner request 2026-10-12: restricted templates (teachers, sales and other limited roles)

Owner: «for assistants keep only two templates which is free_trial_invite and welcome_greeting», then «this only applies for teacher and assistant», then «all roles except the ones allowed to have all templates». Contract: docs/12 §13.19.

| # | Area | Decision |
|---|---|---|
| 15 | Who | Every role without `templates.manage` or the new `templates.send_all` («إرسال كل القوالب», admin-only by default, grantable to a custom role) lists and sends ONLY the restricted allow-list: teachers in teacher mode, sales (the owner's «assistant»), the classroom assistant and custom roles. Row 14 (sales starters only) is widened to all of them. |
| 15a | The list | Approved rows flagged `sales_starter` (column name kept; it now means «allowed for restricted roles»), never a PDF one or an own-button one; by default exactly `free_trial_invite` and `welcome_greeting` (migration `20261012000360_restricted_templates.sql`, which resets earlier ticks). The admin changes it with the «متاح للمعلمين والمبيعات» switch on the templates page. Anything else: 403 `template_not_allowed`. |
| 15b | Teachers | They lose the manual lesson reminders (`lesson_reminder*`); automatic reminders are unchanged. Own families only, never their own chat, `not_your_lesson` still apply. |
| 15c | Import | «راجع حالة القوالب» flags a new chat-line template only when it is one of the two defaults (row 14a's «ticked» no longer applies); it never re-flags or unflags an existing row. |
| 15d | Staging | No chat line, so the two templates are not imported: the restricted composers read «لا توجد قوالب متاحة لك بعد» until the chat line is configured and the sync imports them. |

## Owner request 2026-10-12: subscribe from the chat and record the bank transfer (web + mobile)

Owner question «how can assistants move student from trial to subscribed»; decisions: she creates the subscription herself from the chat for a family she brought (same calculator and price rules as the admin); after the trial the family pays by bank transfer and sends her the receipt; it counts immediately (no admin confirmation), the student becomes «مشترك»; online card payment is a later, separate project (nothing built). Contracts: docs/03 R-ASST-01/04, docs/11 §7.

| # | Area | Decision |
|---|---|---|
| 16 | Money writes | New base-role scope key `self.sales_money` (`area: 'self'`, never stored, never grantable, like `self.sales_students`). Routes: `POST /sales/subscriptions/quote`, `POST /sales/subscriptions`, `POST /sales/payments/receipt-upload-url`, `POST /sales/payments/receipt-from-chat`, `POST /sales/payments`, `GET /sales/money/family?phone`, `GET /sales/money/chat-receipts?studentId` and `…/:messageId`. Thin controllers (`apps/api/src/modules/sales-money`) that REUSE `SubscriptionCreator`, `PaymentsService` and `ReceiptsService` with her as the actor (replay by `clientRequestId`, catalog quote, receipt path `{subscription_id}/{file}` that must exist, audit, recompute, lead conversion; the transfer is in the package currency only, 400 `currency_mismatch` otherwise, fx never runs on her path, row 22). Strict bodies: no typed price, no notes, no refund, no invoice; `method = 'bank'` and `kind = 'payment'` are forced; the receipt and the `clientRequestId` are required. Whitelisted responses (no fx internals, no quote source, no notes, no recorder, no other family). No edit or delete for sales. All handlers recorded in `parity/access-before.json` as `["sales"]`. |
| 17 | Ownership | Every handler checks the student (for a payment: the package's student) is in `ownershipOf(...).studentIds` (row 1c: her leads' families and the students she brought, `students.brought_by`), else 403 `not_your_student`, **whatever `sales_auto_assign` says**: row 13 (no check while it is OFF) is for trial bookings only, never money. `GET /sales/money/family` lists only her own children of the chat's family. |
| 18 | Receipt from the chat | Narrow exception to row 1b (2026-10-12): for a student she owns, she may list the inbound images and PDFs (last 30 days) of THAT family's chat (the guardian's phone), see their thumbnails (signed URL, `ThreadMediaService`) and have the chosen one copied server-side into `receipts/{subscription_id}/wa-{message_id}.{ext}`. A message of any other chat is 404; other files (audio, video) are never listed. `inbox.media` stays admin-only: no general media picker for sales. She can also upload a photo or file (web file input, mobile camera or library) through the scoped upload URL. |
| 19 | Counts immediately | Her payment is final at once: the package status is recomputed as for the admin's, and a student still in `trial` becomes `active` («مشترك», `StudentActivation`, docs/11 §7, for the admin's payments too). The commission trigger (migration 272) earns her commission on the student's first fully paid package exactly as before (it reads the payments, not the recorder). The payment shows in «مدفوعاتي» (`recorded_by` = her). The admin corrects or deletes a wrong payment with the existing admin tools; deleting the payment that flipped the student reverts the flip (to `trial` when no positive payment is left, else `active` / `pending_renewal`), unless the status was changed since (by hand or by another payment) — docs/11 §7. |
| 20 | Discount | Only the website's pills 0 / 5 / 10 / 15 % (`DISCOUNTS`, packages/shared/src/pricing/catalog.ts): `assertSalesDiscount` (sales-money.scope.ts) runs in `quote()` and `subscribe()` after the ownership check and before any pricing or insert → 403 `discount_not_allowed` (a service rule; the body schema stays the admin's). Web `PricingFields discounts={DISCOUNTS}` and mobile `PricingInputs freeDiscount={false}` show the pills instead of the free field; the admin keeps the 0–100 field. Reason: a 1 SAR package plus her own recorded payment would earn the full fixed commission. |
| 21 | Country | She may pick the pricing country, same calculator as the admin (default: the guardian's country); the price is always the catalog's for that country. |
| 22 | Currency | Her transfer is recorded in the package currency only: `SalesMoney.pay` → 400 `currency_mismatch` (`{ currency: <package currency> }`) when `currency` differs, before `PaymentsService.create`, so no fx. The field stays in `salesPaymentCreateSchema` for client compatibility; web and mobile show the package currency read-only and always send it. |


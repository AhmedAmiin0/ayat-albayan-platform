# Assistant (sales) mobile — UX + business review · 2026-10-29

Owner request (2026-10-29): «enhance the overall ui ux experience for the assistant in chat, schedule and every
screen … review the current mobile screens and make a business review». Read-only review of `apps/mobile/app/sales/**`,
`apps/mobile/app/(sales-chat)/**` and the code they import. Lenses: Nielsen's 10 heuristics, docs/07 (§12–14 mobile),
docs/16, docs/29, docs/31, docs/03 IDs. Paths are relative to `apps/mobile/src/` unless they start with `apps/`.
Severity 4 critical … 1 cosmetic · Effort S (≤ 1 day) / M (2–4 days) / L (a week+).

## 1. Executive summary

1. **Transactions: complete.** Reply, register, book a trial, subscribe, record a transfer with a receipt, renew, move/cancel/confirm, pause and meetings all work on mobile and have guards.
2. **Pipeline management: missing.** There are no lead stages, follow-up reminders, missed-trial, unconverted or renewal-due worklists, and no KPIs. This is where families are lost.
3. **Chat matches WhatsApp on bubbles but not on the list.** Ticks, voice notes, swipe-to-reply, reactions, `/` quick replies and template buttons are good. Rows have **no time**, there is no pin/archive/mute, and there is no scroll-to-unread.
4. **The typed draft is erased** when she leaves a chat. A half-written price reply is lost when she checks another lead.
5. **«اليوم» is the academy timetable, not her to-do list.** Unread chats, money owed, renewals and her own trials are not surfaced.
6. **Money actions can only be reached from inside a chat.** The student file and the pending-subscriptions list cannot record a transfer or a renewal.
7. **Schedule:** the only filter is teacher. There is no «يحتاج تأكيد» filter, no inline or bulk confirm, and rows show Riyadh time only.
8. **Cancel and pause never tell the family.** Reschedule always messages the family, with no switch.
9. **The student file is one long scroll** of 7 sections (the owner dislikes long pages). It should be tabs, like the teacher detail screen.
10. **Several fixes are cheap because the API is ready:** show lead tags/stages in the sales inbox, a "waiting for reply" sort, more allowed templates (admin switch, no code), and `payment_due` sent to the student's owner.

## 2. Top 15 improvements (ranked by impact ÷ effort)

| # | Screen | Problem | Why it matters for sales | Fix | Sev | Effort |
|---|---|---|---|---|---|---|
| 1 | Chats list | No last-message time on rows (`inbox/threads-list/ThreadRow.tsx:53-62`; `ListRow` has no time slot) | She cannot see who has waited longest; stale leads go cold | Trailing time above the green count ("10:42", "Yesterday", short date) | 4 | S |
| 2 | Chats list | Lead stage/source tags hidden in the sales tree (`ThreadRow.tsx` `useThreadRow`: `tags = admin && !base`) although the API sends them | New / no-reply / trial-booked chats all look the same | Show `ThreadTags` for sales (without `unpaid`) plus stage chips on the existing `GET /threads?status=` | 4 | S |
| 3 | Chats list | No "waiting for reply" view or sort | A slow first reply loses ad leads | Client filter/sort on `last_direction = in` + `last_inbound_at` | 3 | S |
| 4 | Composer | Draft erased on leaving the chat (`inbox/composer/draft-store.ts:30-40`); no "Draft:" in the list | Half-written quotes are lost while multitasking | Keep drafts until sign-out; "Draft:" preview on the row | 3 | S |
| 5 | Templates (admin config) | Only 2 templates allowed for sales after the 24 h window (docs/16 row 15) | No way to re-open a missed-trial, renewal or silent lead | Admin allows `renewal_due`, `follow_up_slots` and a missed-trial template (switch exists) | 4 | S |
| 6 | Schedule | Teacher filter only; no «يحتاج تأكيد» status pills with counts (`sales/screens/SalesScheduleScreen.tsx:71-72`) | Her main sweep is unconfirmed lessons | Status pill row (All / Needs confirmation / Confirmed / Cancelled) reusing Today's summary filter | 4 | S |
| 7 | Thread | No unread divider, no open-at-first-unread, no jump-to-bottom (`inbox/messages/components/MessageList.tsx:51-133`) | A family's 6 messages get one answer | Port the web JumpToLatest + "N unread" divider | 4 | M |
| 8 | Today | Shows academy lessons only, nothing actionable for her (`sales/screens/SalesTodayScreen.tsx:26-41`) | She hunts through 4 screens for who to chase | «يحتاج إجراء» block on top: unread chats, owed packages, renewals ≤ 7 days, her trials today | 4 | M |
| 9 | Student file / subscriptions | No money action outside the chat (`sales/student/SalesStudentScreen.tsx:213-226`, `sales/components/SalesSubscriptionRow.tsx:172-181`) | Pending rows cannot be acted on | One primary context action («تسجيل تحويل» or «تجديد») reusing `/inbox/sales-transfer` and `/inbox/sales-subscribe` | 4 | S |
| 10 | Students | No status filter (trial / pending subscription / pending renewal / expired) (`sales/screens/AllStudentsScreen.tsx:64-67`) | No missed-trial, unconverted or renewal worklist | `status` param on `salesStudentsQuerySchema` + pills | 4 | M |
| 11 | Cancel lesson | Sends nothing to the family; no "tell family" step (`sales/lesson-actions/SalesCancelLesson.tsx:19-32`) | The family waits in an empty classroom, the costliest mistake | After success: «أبلغ الأسرة» opens the chat with a prefilled draft (or a switch, on by default) | 4 | M |
| 12 | Notifications / renewals | `payment_due` goes to admins only (`apps/api/src/modules/finance/subscriptions/alerts/alerts.service.ts:84`); sales pushes open the general list (`core/push/notification-route.roles.ts:30-38`) | Renewal commission and families are lost | Send to the student's owner too; deep-link to `/sales/students/:id` or the transfer screen | 4 | M |
| 13 | Thread header | Up to 4 icons leave ~60 dp for the name on a 360 dp Android (`inbox/thread/components/ThreadHeaderActions.tsx:23-26`) | Contacts get confused | Call + one «⋮» overflow (copy, lists, check, search) | 3 | S |
| 14 | Student file | 7 stacked sections, attendance up to 60 rows (`SalesStudentScreen.tsx:46-59`) | Long page, balance buried | Summary line + tabs «الاشتراك · الجدول · الحضور · التقارير» (pattern: `sales/screens/SalesTeacherScreen.tsx:26-41`) | 3 | M |
| 15 | Trial no-show | No «موعد تجريبي جديد» where the no-show is seen (`sales/student/TrialSection.tsx:24-36`) | Missed-trial recovery is a dead end | Add the action when the latest outcome is no-show or cancelled (route exists) | 3 | S |

## 3. Per-area findings

### 3.1 Chat (vs WhatsApp Business)

| Feature | Status | Evidence |
|---|---|---|
| Ticks · unread count · voice notes · swipe-reply · reactions · forward · `/` quick replies · template buttons · lists · date separators · calls | present | `MessageMeta.tsx:236-240`, `UnreadCount.tsx`, `composer/voice/*`, `messages/hooks/swipe.ts`, `SlashSuggestions.tsx`, `TemplateButtons.tsx:22` |
| Time on rows · pin · archive · mute · mark unread · swipe on rows · search in chat · starred · link previews · typing · draft per chat | missing | `ThreadRow.tsx:53`, `draft-store.ts:38`, `LinkedText.tsx` |
| List search (name/phone only) · documents (PDF only) · message info · two lines (no reply-from) · offline send | partial | `threads.mapper.ts:85-88`, `send-file.ts:42`, `shared/line-words.ts`, `use-thread.ts:86` |

| # | Problem | Fix | Sev | Effort | Evidence |
|---|---|---|---|---|---|
| C1 | No time on rows | Trailing time slot | 4 | S | `ThreadRow.tsx:53-62` |
| C2 | No scroll-to-unread / jump-to-bottom | Port web JumpToLatest + divider | 4 | M | `MessageList.tsx:97-128` |
| C3 | Draft erased on leave | Persist until sign-out; "Draft:" row | 3 | S | `draft-store.ts:30-40` |
| C4 | No lead panel for sales (status, follow-up, notes) | Tap header name → sheet with LeadFacts / status / FollowUpCard | 3 | M | `ThreadScreen.tsx:105-109` |
| C5 | Header too crowded on Android | Call + «⋮» overflow | 3 | S | `ThreadHeaderActions.tsx:23-26` |
| C6 | Photo sends instantly; no preview or caption | Preview sheet + caption + one primary Send | 3 | M | `composer/attach/use-pick-send.ts:19-22` |
| C7 | Network failure deletes the row | Keep as "failed" + retry with the same request id; paused mutations offline | 3 | M | `thread/hooks/use-thread.ts:86` |
| C8 | No pin / archive / mute / mark unread | Long-press sheet on the row; one swipe action | 3 | L | `ThreadRow.tsx:53` |
| C9 | No 24 h window countdown | Note under 4 h left + list chip | 2 | S | `thread/hooks/chat-window.ts` |
| C10 | Two lines: no outgoing-line indicator or line filter | Line chip in the composer + list filter | 2 | M | `MessageMeta.tsx:40` |
| C11 | Long-press menu is a tall button stack | Compact top action bar (WhatsApp style) | 2 | M | `MessageMenu.tsx:88-125` |
| C12 | Blank body on first open; pull-to-refresh fights the inverted list | Skeleton while pending; remove `onRefresh` (polling covers it) | 2 | S | `ThreadScreen.tsx:110-135`, `MessageList.tsx:100,112-116` |

### 3.2 Schedule + lessons

| # | Problem | Fix | Sev | Effort | Evidence |
|---|---|---|---|---|---|
| S1 | No status filter / counts | «يحتاج تأكيد» pills with counts | 4 | S | `SalesScheduleScreen.tsx:71-72` |
| S2 | Cancel never tells the family | «أبلغ الأسرة» after success / switch | 4 | M | `sales/lesson-actions/SalesCancelLesson.tsx:19-32` |
| S3 | Reschedule always messages the family; note shown only after the move | Note + "send to family" switch before submit (API flag) | 3 | M | `SalesRescheduleForm.tsx:45-50`, `teaching/reschedule/RescheduleDone.tsx:45` |
| S4 | Confirm takes 2 taps; no saffron border (docs/07 §12); no bulk confirm or undo | Inline «تأكيد» on the row, multi-select, «تراجع» toast | 3 | M | `sales/components/SalesLessonRow.tsx:50-53` |
| S5 | Row shows Riyadh time only (R-SCH-01) | Second line with the family's time when the zone differs | 3 | S | `SalesLessonRow.tsx:42` |
| S6 | Trial no-show has no recovery action | «موعد تجريبي جديد» in TrialSection | 3 | S | `sales/student/TrialSection.tsx:24-36` |
| S7 | Resume says "n clashes" with no way to find them; pause sends nothing | Link to upcoming lessons with clashes marked; «أبلغ الأسرة» | 2 | M | `students/course-pause/CoursePauseBanner.tsx:36` |
| S8 | Day view only; no week view or date picker | Day/week tabs (`SchedulePeriod` supports week) + date picker | 2 | S | `calendar/overview/SchedulePeriod.tsx:9-20` |
| S9 | 20+ teachers in one scrolling pill row | One «المعلم: الكل ▾» pill → searchable sheet | 2 | S | `SalesScheduleScreen.tsx:51-54` |
| S10 | Spinner pops every 60 s poll; list blanks on day change; silent stale data | Spinner only on user pull; `keepPreviousData`; "last updated / failed" line | 2 | S | `SalesScheduleScreen.tsx:81-91` |
| S11 | Free-text cancel reason; mixed verbs «تغيير/غيّر الموعد»; stale "read-only" comments | Reason chips; one MSA verb; fix comments | 1 | S | `SalesTodayScreen.tsx:8-11`, `SalesLessonRow.tsx:17-20` |
| S12 | Makeup is admin-only (403); a «غاب» row has no "ask admin for makeup" step | «اطلب حلقة تعويضية» → admin task | 2 | M | docs/16 row 27 |

### 3.3 Today · Students · Student file · More

| # | Screen | Problem | Fix | Sev | Effort | Evidence |
|---|---|---|---|---|---|---|
| T1 | Today | Academy timetable, not her work; duplicates «الجدول» | «يحتاج إجراء» block on top | 4 | M | `SalesTodayScreen.tsx:26-41`, `sales-app/lib/sales-tabs.ts:14-17` |
| T2 | Student file | No money action outside the chat | Context primary action (transfer / renew) | 4 | S | `SalesStudentScreen.tsx:213-226` |
| T3 | Student file | 7 stacked sections | Tabs + last 5 attendance rows + «عرض السجل» | 3 | M | `sales/student/AttendanceSection.tsx:153-161` |
| T4 | Students | No status filter or sort | Status pills + sort | 3 | M | `AllStudentsScreen.tsx:64-67,85` |
| T5 | Students «طلابي» | Tap opens the teacher–family channel, «الكل» opens the file (breaks "same tap every time") | Always open the file; channel as a button there | 3 | S | `sales-money/components/MyStudentItem.tsx:94` vs `sales/components/AllStudentRow.tsx:143-152` |
| T6 | Notifications | Payment due / new student / report open the general list; 20 rows, no grouping or paging | `studentId` deep link; Today/Earlier groups; paging | 3 | S-M | `notifications/NotificationsScreen.tsx:25,60-77` |
| T7 | أرباحي | No earned / pending / paid split, no per-student commission list | 3-number summary + commission rows | 3 | M | `sales-money/screens/MyEarningsView.tsx:27-47` |
| T8 | Students | 3–4-line rows; «طلابي» has no search; switching clears search | 2-line rows; search + count in both views | 2 | S | `AllStudentRow.tsx:151-165` |
| T9 | Bank transfer | Blank body while family data loads | Loading indicator | 2 | S | `sales-subscribe/screens/SalesTransferScreen.tsx:55-58` |
| T10 | Subscription card | No paid/remaining line for her own students; past packages expand inline | Paid/remaining line; history opens its own screen | 2 | S | `sales/components/HistoryEntryCard.tsx:14-15` |
| T11 | المزيد | Long page; settings weigh as much as work; «الحلقات الجارية» buried | Groups «العمل» / «الإعدادات»; one «المظهر واللغة» row | 2 | S | `sales-app/screens/SalesMoreScreen.tsx:43-50,60-77` |
| T12 | Today | «للتأكيد» count shown without `lessons.confirm`; stale comment | Hide the count without the key; fix the comment | 1 | S | `SalesTodayScreen.tsx:9-13` |

**Strengths to keep:** permission-driven tabs, rows and routes; one filled button per sheet (`SalesLessonActions.tsx:89-116`), 48 pt buttons, 44 pt icons; full loading/empty/error/offline states on lists; careful RTL (LTR-isolated codes and phones, logical rows, RTL-aware swipe); MSA strings with full en parity; theme tokens (dark mode); a well-guarded pause form and conflict handling.

## 4. Business gaps (funnel: lead → qualified → trial → subscribed → renewal → paused/expired)

| Gap | Impact on revenue / retention | Proposal | Req ID | Sev | Effort |
|---|---|---|---|---|---|
| No lead stages in the sales inbox (data already sent) | Warm leads go cold unseen | Show tags + stage chips (API ready) | R-LEAD-02 | 4 | S |
| Only 2 templates after 24 h | No re-engagement where most revenue is lost | Allow `renewal_due`, `follow_up_slots`, missed-trial | R-MSG-01, R-LEAD-05 | 4 | S |
| No missed-trial / unconverted list; a no-show silently goes back to `new` | Paid ad leads never chased | Status filter + push to the owner on `no_show` | R-STU-05, R-RPT-01 | 4 | M |
| No renewal-due list; `payment_due` admin-only | Churn + lost renewal commission | Owner push + «تجديد قريب» list (2 left, `pending_renewal`, `expired`) | R-SUB-02, R-MOB-01 | 4 | M |
| No personal follow-up reminder | "Call me Thursday" is forgotten | «ذكّرني» on a thread: date + note → bell/push (idempotent job) | R-LEAD-05 | 3 | M |
| Cannot qualify a lead or mark it lost with a reason | Funnel/source reports wrong; nobody learns why families leave | Narrow `leads.qualify` key (own or unassigned leads) + `lost_reason` enum | R-LEAD-03, R-RPT-02 | 3 | M |
| No response-time signal | Slow first replies lose leads | "Waiting for reply" filter + oldest-first sort | R-LEAD-02, R-NFR-08 | 3 | S |
| `new_lead` push goes to every assistant; no claim or handover | Double answers or none; `not_your_lead` blocks | «استلم العميل» + handover request / admin reassign | R-LEAD-02, R-ASST-01 | 3 | M |
| No KPIs or target | No self-steering, weak incentive | «إنجازي»: leads answered, trials, conversions, renewals, commission vs target | R-RPT-01, R-ASST-06 | 3 | M |
| No projected commission | Less push to close pending families | `pending_subscription` list with the commission each would earn | R-ASST-02, R-ASST-06 | 2 | S |
| Family history spread across screens | Slow answers on calls | Timeline on the student file (lessons, reports, status changes, chat) | R-STU-06 | 2 | M |
| Lost lead cannot be reopened | Returning families blocked | Registration on `lost` → `contacted` | R-LEAD-06 | 2 | S |
| Expiry / pause end tells nobody | Silent churn | Owner push + win-back list + stop reason | R-SUB-02 | 3 | M |
| Writes not queued offline | Lost replies and receipts on weak data | Outbox for text and receipt uploads | R-MOB-03 | 2 | L |

**Requirement coverage (sales, mobile):** met: R-AUTH-01, R-LEAD-01, R-LEAD-06, R-STU-03, R-SCH-03, R-SCH-07, R-SCH-12, R-SUB-01, R-PAY-01, R-MSG-05, R-MOB-02, R-NOT-01, R-ASST-01/02/04/06, R-MEET-01/03 · partial: R-LEAD-02, R-LEAD-05, R-STU-05, R-STU-06, R-SCH-01 (row shows Riyadh time only), R-SUB-02, R-MSG-01, R-MOB-01, R-MOB-03 · missing for sales: R-LEAD-03, R-SCH-10 (makeup, by design), R-RPT-01/02.

## 5. Roadmap

| Wave | Items | Notes |
|---|---|---|
| **Quick wins — this week** | Top 1, 2, 3, 4, 5, 6, 9, 13, 15 · C12 · S5 · T5 · T9 · T12 | Mostly mobile-only, S effort; item 5 is an admin setting, no code |
| **Next 2 weeks** | Top 7, 8, 10, 11, 12, 14 · C4, C6, C9 · S3, S4, S8, S9, S10 · T6, T7, T8 · reminders («ذكّرني»), claim/handover | Small API changes: `status` param, owner-routed pushes, notify-family flag |
| **Later** | C7 + offline outbox · C8 (pin/archive/mute) · C10 two-line picker · C11 menu bar · in-chat search · lead qualification + `lost_reason` · KPIs/targets «إنجازي» · family timeline · makeup request · referral loop | Needs new permissions, schema (`lost_reason`, reminders) and design review (docs/07) |

# Family chat (المحادثة): board spec

Source: develop checkout `wt-ref` at 35fb46a2e, read 2026-11-19.
Older canvas boards (ChatX*, FamilyChat*, RoomXChat) were used for content and states only, not their look.
The look is the staff portal's «Emerald Mint» (Noto Sans Arabic, soft green-grey dark mode).

Path roots used in the citations:

| Root | Path in the checkout |
|---|---|
| `fw/` | apps/family-web/src/ |
| `fm/` | apps/family-mobile/src/ |
| `wk/` | packages/web-kit/src/ |
| `mk/` | packages/mobile-kit/src/ |
| `cc/` | packages/client-core/src/ |
| `sh/` | packages/shared/src/ |
| `api/` | apps/api/src/modules/teaching/student-channels/ |

Each student has one chat. Four kinds of people can be in it: the student's current teacher(s), the
guardian login, the student's own login (a child's too) and the one follow-up assistant who holds the
chat's seat. All of them read every message and all of them can write (docs/31-family-portal-and-channel.md
§2 decisions 3 and 7). The chat runs in the app over a live connection (a 15 s poll when the socket is
down) and never goes through WhatsApp.

## 0. Read this first: the web and phone apps don't have the same chat features

Both apps read the same zod data, but their screens differ a lot. Draw the full design, and mark each part
with what the code has today.

| Capability | family-web (`wk/components/channel/ChannelThread.tsx`) | family-mobile (`mk/channel/ChannelScreen.tsx`) |
|---|---|---|
| Text, links, time, «تم التعديل», «تم حذف هذه الرسالة» | yes | yes |
| Sender line (name · role) | yes, on every bubble; the viewer's own say «أنت» | others' messages only, on the first message of a run, name in the role's colour. Own messages have no name line |
| Photo / PDF / voice bubble | **no**: a file message shows as an empty bubble (`wk/components/channel/edit/ChannelBubbleBody.tsx:27` shows `LinkedBody` of an empty `body`) | yes: a photo opens the in-app viewer; PDF and voice open in the phone's own apps |
| Reply quote in the bubble, reply bar in the composer | no | yes (swipe or menu) |
| Ticks ✓ / ✓✓, «من قرأ الرسالة» | no | yes |
| Unread band, day chips, floating day | no (the time includes the date when it isn't today) | yes |
| Pending row «جارٍ الإرسال…» | no (only the button text changes) | yes |
| People line under the title | no | yes |
| Presence line | yes | yes |
| Message menu | ⋯ button, only beside the viewer's own messages while a window is open: تعديل, حذف للجميع | long-press sheet: ردّ on any message; تعديل, حذف للجميع, معلومات الرسالة on own messages |
| Send error text | the generic line and «too long» only | the API's reason when it is known, else the generic line |
| Unsent text | kept per chat for the browser tab's session (`wk/components/channel/composer/draft-store.ts`) | lost when the chat screen closes (`mk/channel/compose/use-composer.ts:33`) |
| Times shown in | the student's time zone (`student.tz`, `wk/portal/ChildPanel.tsx:29`) | the phone's time zone (`mk/channel/list/use-channel-rows.ts`) |
| Composer | textarea + «أرسل» | emoji + text + round «أرسل» |
| Attach, microphone | no | **built in the shared mobile kit but not connected in the family app**: `fm/chat/FamilyChatScreen.tsx:13` passes no `media` port (`fm/chat/FamilyChatScreen.test.tsx:67` asserts it) |
| Offline | nothing of its own | the app's connecting bar at the top (S23) |
| Closed state | one grey line | card with three steps |

## 1. Where it lives

### Entry points

| Where | Web (apps/family-web) | Phone (apps/family-mobile) |
|---|---|---|
| Child page tabs | Last tab «المحادثة» (`portal.app.child.chat`) on `/portal` (a student, or the picked child) and on `/children/$studentId` (guardian links). `?tab=chat` opens it (`fw/features/children/child-tabs.ts:10`, `fw/features/children/ChildBody.tsx:33`) | Last pill «المحادثة» in `FilterPills fit`. It opens `/chat/<studentId>` as a full screen with no tab bar (`fm/child/ChildBody.tsx:62`, `fm/nav/hrefs.ts:13`). A guardian has six pills in one row; `fit` spreads them, and at large text sizes the row scrolls sideways. ChatXFamilyEntry drew five, before «التسجيلات» existed |
| Unread badge | Green pill after the word (`wk/components/ui/layout/tab-parts/tab-parts.tsx:5`), hidden at 0. Screen readers hear «المحادثة، {n} غير مقروءة» (`portal.app.child.chatUnread`) | The same badge on the pill (`cc/people/portal/app/tab-word.ts:46`) |
| Bell row / push | Kind `channel_message` (`cc/people/portal/app/alerts.ts:62`) opens the child page on `tab: 'chat'`. While the switch is off it opens the plain child page (`fw/features/alerts/alert-link.ts:42`) | Tapping the bell row or the push opens `/chat/<id>` (`fm/nav/hrefs.ts:46`) |
| Live lesson room | No chat panel; the room's only panels are people and recordings. On a trial lesson the room shows the note «المحادثة النصية مغلقة في الحلقات التجريبية.» (`classroom.chatClosedTrial`, `wk/classroom/room/components/LiveRoom.tsx:61`) | An «المحادثة» control with its own count opens `/room-chat/<id>`, a native modal over the room. It holds the same full chat screen as `/chat/<id>`, back button included (`fm/room/use-family-room-chat.ts:13`, `fm/root/room-screen.ts:5`, `apps/family-mobile/app/room-chat/[id].tsx`). Open chat: S24. Trial lesson: S22 |

There is no list of chats across children. A guardian with two or more children first switches child
(«اختر الطالب», or the child switch in the header), then opens that child's «المحادثة».

### Who sees what

| Login | Tabs around the chat | In the chat |
|---|---|---|
| Guardian | القادمة · حضرها · غاب عنها · التسجيلات · الباقة · المحادثة | Writes as «ولي الأمر». Own bubbles: «أنت» on the web, no name line on the phone |
| Adult student (`contact_is_self`) | القادمة · حضرتها · غبت عنها · التسجيلات · الباقة · المحادثة | Writes under the role of the login used (`api/channel-access.ts:60`): «الطالب» when signed in as the student, «ولي الأمر» when signed in through the guardian login |
| Child's own login | القادمة · حضرتها · غبت عنها · التسجيلات · المحادثة (never الباقة, `cc/people/portal/viewer.ts:77`) | The same chat and the same tools. Writes as «الطالب»; the guardian sees the child's bubbles named «يوسف خالد · الطالب» |

Who is listed in the chat (`api/reads/channel-members.ts`): the student appears only when the child has a
login of their own, and the assistant only while one holds the seat. Blue ✓✓ waits for every one of them.

Role words: `studentChannel.roles.teacher` «المعلم/ة», `.guardian` «ولي الأمر», `.student` «الطالب», `.sales`
«مسؤول المتابعة», `.unknown` «مشارك في المحادثة». On the phone the sender's name colour follows the role:
teacher in brand green (`lapis`), assistant in action amber (`act`), family in `ink2`
(`mk/channel/bubble/role-ink.ts`).

### Switches and conditions

| Switch or condition | Effect |
|---|---|
| `family_chat_enabled` (default **off**, public setting; `cc/people/portal/viewer.ts:57`) | While it is off, unknown or still loading there is no tab, no pill, no unread request and no room control (`fm/room/use-family-room-chat.ts:13`). The API answers 403 `family_chat_off` on every family route (`api/channel-access.ts:58`). An old phone link to `/chat/<id>` shows the load error (S18). On the web, `?tab=chat` falls back to «القادمة» |
| `teacher_student_messages_enabled` (teacher side) | docs/50-family-app.md §2 says to switch it on together with the family switch. With only the family switch on, the teacher can't open the chat from a push |
| The chat opens when the student is subscribed (status is not `new`, `trial` or `pending_subscription`) and has a teacher assigned (`sh/messaging/channel/channel.ts:67`) | Until then: the closed state below, no messages, no composer, unread 0. A send gets 409 `channel_not_open`. An `expired` student keeps the chat open |
| `presence_enabled` | Off means no presence line. A family only ever sees its teacher(s)' presence (`sh/people/presence/presence-rules.ts:28`) |
| `family_meetings_in_app` | Only decides whether the phone's room-chat control exists (live-session spec) |

A closed card with reason `family_chat_off` can never appear. The mobile kit can draw it (title only), but
the page data never carries that reason: `api/channel.repo.ts:105` hard-codes `familyChatOn: true`, and the
403 comes first anyway. Don't draw it as a state. When the switch is off, the family has no way in.

## 2. Screens and states

Sample data (fake): today is Thursday 19 November 2026. Student «يوسف خالد», code «AB-9001», time zone
Asia/Riyadh; sister «مريم خالد» «AB-9002»; guardian «خالد»; teacher «أ. فاطمة»; assistant «سارة». The viewer is
the guardian unless a row says otherwise.

### 2.1 Data the boards show (`sh/messaging/channel/channel-views.ts`)

`ChannelPage` (newest page): `student_name` «يوسف خالد», `open` true, `closed_reason` null, `read_only` false,
`has_more` true (50 messages a page), `participants` = [{name «أ. فاطمة», role teacher}, {«سارة», sales},
{«يوسف خالد», student}, {«خالد», guardian, me true}], `my_last_read_at` = the `created_at` of #2 (the guardian
last had the chat open at 5:10 م).
`ChannelUnread` for the tab badge before the chat opens: `{ unread: 3 }`.

| # | `sender_name` · `sender_role` | `kind` / content | `created_at` (as the bubble shows it) | Flags |
|---|---|---|---|---|
| 1 | أ. فاطمة · teacher | pdf, `attachment` {name «خطة الحفظ لشهر نوفمبر.pdf», size 245760 → «PDF · 240 كيلوبايت», mime application/pdf}, body '' | «18 نوفمبر 8:40 م» under the «أمس» chip | |
| 2 | أ. فاطمة · teacher | text «هل نبدأ بالصفحة الأولى في حلقة اليوم؟», `reply_to` = #1 (kind pdf) | 5:10 م, under the «اليوم» chip | the read mark |
| 3 | سارة · sales | «أُضيفت حلقة تعويضية يوم الأحد 22 نوفمبر، 6:30 م.» | 5:40 م | first unread; phone band «4 غير مقروءة» above it |
| 4 | يوسف خالد · student | voice, `duration_ms` 42000 → «0:42» | 6:02 م | |
| 5 | أ. فاطمة · teacher | photo, caption «صفحة الواجب» | 6:20 م | |
| 6 | أ. فاطمة · teacher | (deleted) | 6:22 م | `deleted` → «تم حذف هذه الرسالة»; follows #5, so no name line |
| 7 | خالد · guardian (`mine`) | «جزاكم الله خيرًا» | 6:25 م | `read_by_all` true → blue ✓✓ |
| 8 | خالد (`mine`) | «سنراجعها الليلة إن شاء الله.» | 6:31 م | `edited` → «تم التعديل · 6:31 م» (the message's own time, not the edit's), grey ✓ |
| 9 | خالد (`mine`, pending) | «شكرًا يا أستاذة» | now | «جارٍ الإرسال…» + clock tick (phone only) |

Read the sample as the phone screen at about 6:32 م. The guardian opened the chat at 6:24 م, after #6, and
wrote #7 to #9 after that. A send moves the sender's read mark to that message
(`api/send/channel-sender.ts:64-65`), so the viewer's own messages can never sit after an unread mark. The
band stays where it was when the chat opened until the screen is left (`mk/channel/list/use-read-mark.ts`).

Message times come from `channelTimeText` (`cc/messaging/channels/channels.ts:65`): just the clock for today
(12 or 24 h, per viewer), otherwise date and clock, «18 نوفمبر 8:40 م». So the phone repeats the date under a
day chip; the ChatXFamilyThread board showed «8:40 م» alone (§6). Day chips (phone only) read «اليوم», «أمس»
(`inbox.dayToday` / `inbox.dayYesterday`), the weekday within the last six days, otherwise «29 سبتمبر».

The badge and the band count different senders:
- **Tab badge, before opening: 3** (#3, #5, #6). It counts teacher and assistant messages after the read
  mark, deleted ones included (`api/channel.mapper.ts:44`; `channel_summaries` in migration
  `20261030000993_chat_edit_delete.sql`). It drops to 0 once the open chat marks them read.
- **Phone band, on opening: 4** (#3, #4, #5, #6). It counts messages from everyone else after the mark, the
  child's included (`mk/channel/list/list-rows.ts:80`).
- **Bell and push:** every member but the sender gets one (`api/channel-notify.ts`), so the guardian also
  gets a row for the child's #4, which the badge doesn't count.

Draw the numbers as the code produces them, and flag the mismatch (§6).

### 2.2 States to draw

| # | State | Phone (390) | Web (child tab) |
|---|---|---|---|
| S1 | Entry with unread | Pills, «المحادثة» with badge «3» | Tab «المحادثة» + green «3» |
| S2 | Open chat, full sample above | Header: back, avatar (the first teacher's initials), title «المحادثة مع المعلم/ة · يوسف خالد» (`studentChannel.portalTab` + student), people line «أ. فاطمة، سارة، يوسف خالد، أنت» (up to 4 names, then «أنت», `mk/channel/header/participants.ts`), presence. Variants: without a child login «أ. فاطمة، سارة، أنت»; with no assistant in the seat, «سارة» drops out | Presence line, then bubbles oldest first, composer at the end. No band, no chips, no ticks |
| S3 | Presence | «متصل الآن» with a green dot (`presence.online`), or «آخر ظهور منذ 10 دقائق» (`presence.lastSeen` + `presence.minutes.few`). Teacher only. Nothing when presence is off or the teacher has never been seen | Same line above the messages |
| S4 | Older messages | «الرسائل الأقدم» ghost button at the top (`studentChannel.older`), busy while loading | Same |
| S5 | Composer, empty / typing | Emoji button («الرموز التعبيرية» ↔ «لوحة المفاتيح»), box «اكتب رسالتك…», round «أرسل» 48pt, disabled while the box is empty, over 2000 characters or sending | Textarea (label «الرسالة», placeholder «اكتب رسالتك…»), button «أرسل», disabled while empty, too long or sending, and reading «جارٍ الإرسال…» while sending. Enter adds a line; Esc leaves the box |
| S6 | Emoji panel open | 240pt grid under the bar; focusing the text box closes it | n/a |
| S7 | Replying | Quote bar above the composer: sender in the role colour, first words or the kind word («ملف PDF», «صورة», «رسالة صوتية»), ✕ «إلغاء الرد» (`inbox.reply.cancel`). Opened by a swipe on the bubble or «ردّ» in the menu. The pending row shows no quote until the API answers | not in code |
| S8 | Send errors | Line above the bar with the API's reason (`studentChannel.actions.errors.*`), e.g. `reply_not_found` «تعذّر العثور على الرسالة التي تردّ عليها.», `family_chat_off` «المحادثة مع المعلم غير متاحة حاليًا.», `channel_not_open` «المحادثة مغلقة الآن، فلا يمكن تعديل الرسائل أو حذفها.» (§6). Otherwise «تعذّر إرسال الرسالة، أعد المحاولة.». Too long: «الرسالة أطول من 2000 حرف.». The pending row disappears and the words stay in the box (`mk/channel/send/use-channel-send.ts`); there is no failed bubble | «تعذّر إرسال الرسالة، أعد المحاولة.» or «الرسالة أطول من 2000 حرف.» above the textarea. The API's reason is never shown |
| S9 | Message menu | Sheet «خيارات الرسالة». On someone else's message: «ردّ» only. On own: «ردّ», «تعديل» (text only, within 15 min), «حذف للجميع» (within 48 h, danger), «معلومات الرسالة». A long press on a photo, PDF or voice note opens the same sheet. Deleted or pending messages have no menu. Tapping the backdrop closes it | ⋯ beside own messages only (on hover or focus, always on touch screens): «تعديل», «حذف للجميع». Hidden once both windows have passed |
| S10 | Edit | Form inside the sheet, which rises above the keyboard; «احفظ» / «جارٍ الحفظ…»; «إلغاء» goes back to the menu | Edit box in place of the text, «إلغاء» + «احفظ»; Esc cancels |
| S11 | Delete confirm | Inline: «حذف الرسالة للجميع؟ ستُحذف الرسالة عند جميع المشاركين في المحادثة، ولا يمكن التراجع عن ذلك.» + «احذف للجميع» + «إلغاء» | Dialog with the same title and body, «احذف للجميع» |
| S12 | Edit/delete refused | «انتهت مدة التعديل (15 دقيقة).», «انتهت مدة الحذف (48 ساعة).», «حُذفت هذه الرسالة بالفعل.», any other failure «تعذّر تنفيذ الإجراء، أعد المحاولة.» (`actions.failed`) | The same words under the bubble |
| S13 | Read receipts sheet (long press on own ticks, or «معلومات الرسالة») | «من قرأ الرسالة»: a spinner while loading, then «قرأها» rows like «أ. فاطمة · المعلم/ة 6:27 م», «لم يقرأها بعد» rows like «يوسف خالد · الطالب», «لا أحد بعد» when a list is empty, error «تعذّر تحميل حالة القراءة.», button «إغلاق» | not in code |
| S14 | Photo viewer | Full screen, pinch to zoom, pan, close (`mk/chat-ui/photo/PhotoViewer.tsx`) | not in code |
| S15 | Closed, `not_subscribed` | Card: gold diamond, «تُفتح المحادثة بعد الاشتراك وتعيين المعلم/ة», «هنا يتحدث المعلم/ة ومسؤول المتابعة مع الطالب وولي الأمر. هذا ما بقي قبل فتحها:», then three steps. Step 1 «الاشتراك في باقة» with pill «الخطوة الحالية» and «يشترك الطالب في إحدى باقات الأكاديمية.» Step 2 «تعيين المعلم/ة» with «تختار الأكاديمية المعلم/ة للطالب.» Step 3 «فتح المحادثة» with «تُفتح هنا تلقائيًا، دون أي خطوة إضافية.» | One line: «تُفتح المحادثة مع المعلم/ة بعد الاشتراك» |
| S16 | Closed, `no_teacher` | Same card; step 1 shows «تم.» as done, step 2 is current | «تُفتح المحادثة بعد أن يُعيَّن للطالب معلم/ة.» |
| S17 | Loading | Header with the title «المحادثة مع المعلم/ة» alone (no student name, no people line), then a brand-green spinner | `ListSkeleton` |
| S18 | Load failed: network, the 403 when the switch is off, or a 404 for a student outside this family | Header title alone, `ErrorState` «تعذّر تحميل المحادثة.» + ghost «حاول مرة أخرى» (`mobile.retry`, `mk/ui/feedback/ErrorState.tsx:38`). Once messages have loaded, a failed reload shows nothing and the messages stay | Alert «تعذّر تحميل المحادثة.» + «أعد المحاولة» (`studentChannel.retry`). Once messages have loaded, a failed reload is one small inline line and the messages stay |
| S19 | Empty | «لا توجد رسائل بعد» | «لا توجد رسائل بعد» + «ابدأ المحادثة برسالة.» |
| S20 | Child login | S2 as يوسف sees it: guardian bubbles «خالد · ولي الأمر», his own without a name line; pills without «الباقة» | Same, his own say «أنت»; tabs without «الباقة» |
| S21 | Bell row | Title «رسالة في محادثة يوسف خالد» (`notifications.channel_message.title`), body «أ. فاطمة: هل نبدأ بالصفحة الأولى في حلقة اليوم؟» (`.body`). Text past 80 characters is cut with no «…»; a file with no caption reads «أ. فاطمة: صورة», «ملف PDF» or «رسالة صوتية» (`api/notify/preview.ts`). Editing or deleting the message rewrites the row («تم حذف هذه الرسالة»); a push already shown stays as it was | Same row on the web bell |
| S22 | Chat inside the lesson room, trial lesson | The room's «المحادثة» control shows no count. A tap opens a sheet titled «المحادثة» (`mobileRoom.controls.chat`) with «تُفتح المحادثة مع المعلم/ة بعد الاشتراك» (`studentChannel.closed`, `mk/room/live/LiveSheet.tsx:29`) | The note «المحادثة النصية مغلقة في الحلقات التجريبية.» in the room (§1) |
| S23 | Offline | The app's connecting bar grows in at the top and pushes the chat down: «جارٍ الاتصال…» with gold dots, after 10 s the amber hint «تحقّق من اتصالك بالإنترنت», then «تم الاتصال» with a check before it closes (`mk/ui/connecting/ConnectingBar.tsx`, `mobile.connection.*`). Loaded messages stay. A send fails at once (`networkMode: 'always'`, `mk/lib/query/query-client.ts:52`): S8's generic line, the words stay | No offline indicator. A failed reload shows S18's inline line; a send shows «تعذّر إرسال الرسالة، أعد المحاولة.» |
| S24 | Chat inside the lesson room, subscribed student | The room's «المحادثة» control shows the unread count. A tap opens S2 as a native modal over the room, which keeps running underneath. The header is S2's, with the back button; not RoomXChat's sheet header (§5) | No chat in the web room (§5) |

Bubble types on the phone (`mk/channel/bubble/ChannelBubble.tsx`, `mk/channel/attach/AttachmentBody.tsx`):
- **Photo.** 240pt wide at the photo's own ratio, square until it loads, `sunk` behind it. Caption under
  it. A tap opens the full-screen viewer.
- **PDF.** 240pt card: «PDF» strip, badge, file name on up to two lines (fallback «ملف PDF»),
  «PDF · 240 كيلوبايت». A tap opens the phone's own viewer; there is no page preview.
- **Voice.** Play button, waveform, clock «0:42». The family app has no audio player wired in, so a tap
  opens the phone's own player and dragging the waveform does nothing (`mk/channel/attach/use-voice.ts:48`).
- **Quote.** Sits at the top of the bubble. A tap jumps to the original and highlights its edge for 1.5 s.
  When the original is older than the loaded pages, nothing moves and nothing is said
  (`mk/channel/list/use-jump.ts:30`). If the original was deleted it reads «رسالة محذوفة».
- **Meta row.** «تم التعديل · 6:31 م» and the ticks: a clock while sending, grey ✓ once sent, blue ✓✓ when
  `read_by_all` (`mk/chat-ui/ticks/DeliveryTicks.tsx`).
- **Follow-ups.** A second message in a row from the same sender drops the name line and the bubble's tail
  corner. A day chip or the unread band breaks the run.

## 3. Layout

**Phone app (390).**
- The chat is its own full screen, opened on top of the tabs (no tab bar). Header 52pt, then the message list
  (anchored at the bottom, so it opens on the newest message), then the composer, which moves up with the
  keyboard. The connecting bar, when shown, sits above the header.
- The unread band runs edge to edge. Bubbles are 4pt apart when on the same side, 8pt when the side changes.
- The viewer's own messages sit at the inline end (left in Arabic) on the light brand colour; others' sit at
  the start on `raised` (`mk/chat-ui/bubble/bubble-side.ts:13`).

**Web (390).**
- The chat is a tab panel inside the page. The shell header (wordmark, child switch, bell) is sticky at the
  top (`fw/features/shell/FamilyShell.tsx:18`). The chat itself pins nothing: the page scrolls and the
  composer sits after the last message. The tabs scroll sideways and follow the selected tab.
- The bottom tab bar is fixed. `--chat-end-gap` (9.5rem + safe area) keeps the newest message and the
  composer above it (`fw/features/children/ChildBody.tsx:24`).
- Bubbles are at most 85% of the width.

**Web (1280).**
- Above 56.25rem the page has a 14rem side menu and a centred main column at most 720px wide
  (`fw/features/shell/FamilyShell.tsx:15`, `:29`). The chat fills that column, and the end gap drops to 6rem.
- The ChatXWebFamily board drew two columns: a chat card (30rem) and a side panel «في هذه المحادثة» with
  members, presence and «ما المطلوب للحلقة القادمة». That doesn't fit in 720px, and the side panel isn't in
  code.
- Either draw one column, or mark a wider chat tab as a decision for the owner.

**Which side "mine" sits on.** On the web, the viewer's own messages sit at the inline start (right in
Arabic, `wk/components/channel/ChannelBubble.tsx:40`), the opposite of the phone. The owner's rule
(2026-10-27, «like whatsapp») is the inline end. Draw the inline end on both, and flag the web as needing a
code change.

## 4. Motion (only where it means something)

| Moment | In code | Proposed (not in code) |
|---|---|---|
| Opening the chat (phone) | The pushed screen slides in from the reading end (`fm/root/screen-animation.ts`); the in-room chat rises as a native modal (`fm/root/room-screen.ts:5`) | Keep |
| Tab or pill change | Web panel `animate-fade-up` 200ms (`fw/features/children/ChildBody.tsx:55`); phone `useTabMotion` | Keep |
| New message arrives | None; the messages reload and the view stays at the end | Fade up 6px over 200ms, only for messages that arrive while the chat is open, never on first load |
| My send | Phone: the pending row shows at once, its clock becomes ✓, then blue ✓✓ | 160ms colour crossfade from ✓ to ✓✓ so the viewer notices the read |
| Swipe to reply | Springs back on release (`mk/chat-ui/swipe/use-swipe-reply.ts:17`) | Keep |
| Tap a quote | Scrolls to the original and highlights its edge for 1.5s (`mk/channel/list/use-jump.ts`) | Keep |
| Scrolling back | Floating day chip fades out over 200ms, 1.2s after scrolling stops (`mk/channel/list/use-floating-day.ts`) | Keep |
| Connection lost / back | Phone bar grows to its measured height and closes after «تم الاتصال»; no movement when the phone asks for reduced motion (`mk/ui/connecting/ConnectingBar.tsx:39`) | Keep |
| Round button, mic ↔ send | 120ms fade when it changes (`mk/chat-ui/composer/use-mode-fade.ts:18`, used by `RoundAction`). The family app never shows the mic yet | Keep |
| Recording | Red dot blinks every 500ms (`mk/chat-ui/voice/use-blink.ts`) | Keep, once recording is connected |
| Unread badge goes up | None | One `pop-in` (180ms) of the number, not repeated |
| Online dot | Static | Stay static, no pulse |
| ⋯ menu / sheets | The web menu just appears; phone sheets fade in with their backdrop (`mk/ui/feedback/MenuSheet.tsx:22`) | Web menu `pop-in` 180ms |

`prefers-reduced-motion` turns off every web animation (`wk/styles/motion.css`). Phone boards should assume
the same.

## 5. Not in code

Tags: **[K]** built in a shared kit, not connected in the family app. **[B]** not in code, but on a ChatX
board the owner reviewed, so it can be drawn. **[N]** neither, so don't draw it unless the owner asks.

| Item | Tag | Note |
|---|---|---|
| Phone attach sheet «أرفق صورة أو ملف PDF» with «المعرض», «الكاميرا», «مستند» + hint «يمكن إرسال صور JPG أو PNG أو ملفات PDF فقط» | K | `mk/channel/compose/AttachSheet.tsx`. The family app already ships expo-image-picker and expo-document-picker. Limits: photo 10 MB, PDF 15 MB, voice 10 MB (`sh/messaging/channel/channel-media.ts:24-31`). Upload texts exist: «جارٍ رفع الملف…», «الملف أكبر من الحد المسموح ({n} ميغابايت).», «نوع الملف غير مدعوم. أرسل صورة أو ملف PDF أو رسالة صوتية.», «تعذّر رفع الملف، أعد المحاولة.» |
| Phone voice note recording + in-app playback | K | `mk/channel/compose/RecordingPill.tsx`: dot, clock, ✕ «إلغاء»; «أرسل» stops and sends. expo-audio already ships in the app. A refused microphone shows no message (`mk/channel/compose/use-recording.ts`) |
| Phone in-app PDF viewer for the chat | K | `mk/chat-ui/pdf/PdfViewer.tsx` is used by the staff inbox; this chat opens PDFs outside the app |
| In-room chat sheet header: grab handle, title, people, ✕ «إغلاق المحادثة» (`studentChannel.closeChat`) | K | `mk/channel/header/ChannelSheetHeader.tsx`, drawn on RoomXChat; no app uses it |
| Web: photo, PDF and voice bubbles, photo viewer | B | ChatXWebFamily. Today these show as empty bubbles; worth fixing before the boards ship |
| Web: reply quote, ticks, read receipts, unread band, day separators, people line, pending row | B | ChatXWebFamily |
| Web: emoji, attach, mic in the composer | B | ChatXWebFamily |
| Web closed card with steps | B | ChatXClosed; the web shows one line |
| Enter sends, Shift+Enter adds a line (web hint) | B | ChatXWebFamily; today Enter adds a line |
| «نسخ النص» in the menu | B | ChatXMenu, ChatXWebFamily; neither app has it. Needs a new i18n key |
| PDF page count «3 صفحات» and page thumbnails | B | Board only; `ChannelAttachmentView` has no page count (`inbox.pdf.pages.*` keys exist for the staff inbox) |
| «اسحب للإلغاء» slide to cancel | B | ChatXVoice; the code uses ✕ |
| Live-lesson banner under the chat header «الحلقة جارية الآن» + «ادخل» | B | ChatXLive; `mk/channel/ChannelScreen.tsx` has a `banner` slot that no app fills. Belongs with the live-session spec |
| «في هذه المحادثة» members side panel | B, conflicts | Showing presence for every member breaks the rule that a family sees only the teacher's. Draw names and roles, with presence for the teacher only |
| A note when a tapped quote's original isn't loaded | N | The staff inbox has `inbox.reply.notLoaded`; this chat does nothing |
| Forwarded marker | N | `ChannelMessageView` has no field for it; forwarding exists only in the staff WhatsApp inbox |
| «وصلت» (delivered) tick | N | The chat only has pending, sent and read |
| Chat list across children | N | |
| Typing indicator, search in chat | N | |
| Chat panel in the web lesson room | N for the family | The web room only has people and recordings panels; RoomXWebRoomChat is the teacher's board |

## 6. Wording and decisions to flag

1. The boards say «متصلة الآن» and «وصلت». Use «متصل الآن» (`presence.online`). The ticks read
   `enums.messageStatus.*` (`mk/chat-ui/ticks/DeliveryTicks.tsx:46`): «في الطابور» (pending), «أُرسلت» (sent),
   «قُرئت» (read), while the time line says «جارٍ الإرسال…». ar.json already has the chat's own words, used
   nowhere: `studentChannel.pending` «قيد الإرسال», `.sent` «أُرسلت», `.readByAll` «قرأها الجميع». Draw those
   (a code change).
2. On the web, screen readers announce the chat as «رسائل الطلاب · يوسف خالد»
   (`wk/components/channel/ChannelThread.tsx:15`), which is the teacher-side wording. It should read
   «المحادثة مع المعلم/ة · يوسف خالد».
3. `actions.errors.family_chat_off` says «المعلم» while every other line says «المعلم/ة».
4. `actions.errors.channel_not_open` speaks of editing and deleting, but the phone also shows it when a send is
   refused because the chat closed.
5. The side for the viewer's own messages differs between web and phone (§3).
6. The badge (3), the band (4) and the bell count different senders (§2.1).
7. The phone shows a date in the bubble time under a day chip that already names the day («18 نوفمبر 8:40 م»
   under «أمس»).
8. Sample data is fake (سارة, AB-9001); low AB codes belong to real students, so never use them on boards. The boards' dates
   follow another year's calendar («الأحد 16 نوفمبر»); in 2026, 16 November is a Monday, so the sample's
   weekdays are 2026's.

Spec file: 

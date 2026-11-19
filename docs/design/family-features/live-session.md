# الحلقة المباشرة (live session): design spec for the family portal

Spec file: 

This covers how a guardian, a child or an adult student gets into a lesson and what they see until it closes. Paths are relative to the develop checkout (`wt-ref`). «not in code» marks anything a board or the task names that the code does not do. Draw it only where the owner asked for it.

The two clients differ a lot today:

- **Web** (`apps/family-web`, any browser, 1280 and 390): the kit's `ClassroomRoom` (`packages/web-kit/src/classroom/room/components/ClassroomRoom.tsx:21-30`) opens over the page.
- **Phone app** (`apps/family-mobile`): the kit's `RoomScreen` (`packages/mobile-kit/src/room/screen/RoomScreen.tsx:24-48`) opens as a full-screen modal. When the in-app switch is off, the lesson opens in the phone's browser instead.

## 1. Where it lives

### 1.1 Entry points

| Entry | Web | Phone app |
|---|---|---|
| Lesson card, tab «القادمة» of the student in view. That student is the login's own, an only child, or the child a guardian picked (`apps/family-web/src/features/children/WithPick.tsx:31`, `apps/family-mobile/src/home/HomeScreen.tsx:16-18`) | `LessonCard` (`packages/web-kit/src/portal/lessons/LessonCard.tsx:27-60`) inside `LessonsPanel` (`LessonsPanel.tsx:14-36`). It shows on «الرئيسية» (`/portal`) for every login, and on `/children/$studentId`, the guardian's child page that a bell row or link opens. Every lesson in the list has its own card and button | `NextLessonCard full` (`apps/family-mobile/src/lessons/NextLessonCard.tsx:93-122`) from `src/child/UpcomingPanel.tsx:20`, on «الرئيسية» (`src/home/StudentHome.tsx:27`) and on `/child/[id]`. Only the first lesson still ahead gets this card and a button. Later lessons under «الحلقات القادمة» have no join (`src/lessons/UpcomingList.tsx:24-61`) |
| «الجدول» row | `ScheduleRow` (`apps/family-web/src/features/schedule/ScheduleRow.tsx:48-50`). While the button can be pressed, the row shows `LessonAction`: the «تُسجَّل هذه الجلسة» line and the full «ادخل الحلقة». Otherwise it shows nothing, with no hint line. Times are on the viewer's clock | `ScheduleRow` (`apps/family-mobile/src/schedule/ScheduleRow.tsx:33,43`). A «● جارية الآن» line and a short «ادخل» |
| Push or bell «الحلقة على وشك البدء» (`notifications.lesson_starting`: «حلقة {student} في {when}: يمكنك الدخول الآن»). A sweep sends it once when the window opens, to the guardian's login and the student's own login. Siblings in one lesson are named together (`apps/api/src/common/push/family-readers.ts:30-49`) | A guardian login (`kind: guardian`) goes to `/children/<id>`, a student login (`kind: student`) to `/portal`, tab «القادمة» (`apps/family-web/src/features/alerts/alert-link.ts:25-28,39`) | Child page (`packages/client-core/src/people/portal/app/alerts.ts:52`), where the card's button joins |
| Push or bell «بدأت الحلقة» (`notifications.lesson_live`: «اضغط لتدخل حلقة {student} مباشرةً والميكروفون مفتوح.»). Sent once, when the teacher first enters the room (`apps/api/src/modules/teaching/classroom/live/lesson-live.push.ts:17-27`) | Same pages as above (`alert-link.ts:44`) | Straight into the room with the mic on while rooms open in the app. Otherwise the child page (`apps/family-mobile/src/nav/hrefs.ts:49-50`) |

- The lesson list reloads every 30 s (`PORTAL_REFRESH_MS`, `packages/client-core/src/people/portal/portal-api.ts:27`) and when the family comes back to the page.
- The cards tick every second, so the button lights up on its own (`LessonCard.tsx:15`, `NextLessonCard.tsx:16`).

### 1.2 Which door opens

`way_in` comes from the API (`apps/api/src/modules/people/portal/lessons/portal-lessons.mapper.ts:36-41`).

| `way_in` | Web | App, `family_meetings_in_app` on and APK ≥ 0.3.0 | App, switch off or older APK |
|---|---|---|---|
| `classroom` | `POST /portal/students/:id/lessons/:lessonId/join` (`portal.controller.ts:66`). The room then covers the page (`fixed inset-0 z-50`). It has no URL of its own, so a reload returns to the list | Same join. The token is handed over in memory (`apps/family-mobile/src/room/enter-room.ts:10-14`), then `/room/[id]?student=` opens as `fullScreenModal` with swipe off (`src/root/room-screen.ts:2`) | `POST …/room-link` (`portal.controller.ts:76`). The phone's browser opens `/join/<token>` on the `app.` host (`docs/51-family-web.md:15`): the guest page, then the web room |
| `external` (Meet) | A link styled as the button, opening in a new tab (`LessonAction.tsx:37-48`) | `Linking.openURL(meeting_url)` (`src/lessons/use-join.ts:19`) | same |
| `none` | Hint «سيصلكم رابط الحلقة قبل موعدها» (`portal.noWayIn`) | same | same |

- The API sends `meeting_url` only while the window is open (`portal-lessons.mapper.ts:47,55`). An `external` lesson without its link reads as `noWayIn` until the next reload (`packages/client-core/src/people/portal/lesson-window.ts:31,39`).
- `classroom` needs LiveKit configured on the server (`classroomReady`, `student-link.service.ts:117-124`). Without it, a platform lesson with no link of its own becomes `none`.
- A lesson whose status is no longer `scheduled` or `confirmed` (`completed`, `late`, `no_show`, `excused`, `cancelled_by_teacher`, `cancelled_by_admin`) gets `way_in: none` (`portal-lessons.mapper.ts:46`). The card shows the closed hint for it (§2.1).
- `joinWay` picks between the room and the link (`apps/family-mobile/src/room/room-way.ts:11-19`). While the public settings are loading or have failed, the switch counts as off and the browser path is used (`src/room/rooms-in-app.ts:10-15`).

### 1.3 Guardian, child, adult

- **One flow for all three.** The API admits the login as a `guest` of that (lesson, student) row (`apps/api/src/modules/teaching/classroom/student-link/student-link.service.ts:81-87`). The guest is named by the student's first name (`packages/schedule/src/classroom/meetings.ts:67`). A guardian who joins shows as «يوسف», not as a parent.
- **Two devices.** Every join gets a fresh LiveKit identity (`join/room-admission.ts:63`). A guardian and a child on two devices are two tiles, both called «يوسف», and they never trigger the duplicate screen. The card's presence list merges them into one «يوسف» (`apps/api/src/modules/teaching/lessons/live-room/room-state.mapper.ts:35-42`).
- **Presence role.** Any family join has the presence role `student` (`room-state.mapper.ts:15-16`). Nothing emits `guardian`, so the «ولي الأمر» label in `packages/mobile-kit/src/room/host/role-word.ts:7-10` never shows in practice. Do not draw a parent row.
- **Names in presence.** The family sees the teacher's name and its own students' names only. Staff appear as a role word (`familyNamed`, `room-state.mapper.ts:26-29`). Inside the room, tiles carry LiveKit names, so the assistant's tile still reads «مريم».
- **Own-voice copy (app only).** A child or adult sees «حلقتك القادمة» (`portal.app.lesson.nextLessonSelf`) and «حلقاتك القادمة» (`upcomingSelf`). A guardian sees «الحلقة القادمة» (`portal.nextLesson`) and «الحلقات القادمة» (`NextLessonCard.tsx:71`, `UpcomingList.tsx:32`). The web card has no title line, so it reads the same for everyone. The web page greets a student or adult with «أهلًا بك» above the name (`apps/family-web/src/features/home/HomePage.tsx:20-24`).
- **Several children.** A guardian of several children joins for the child in view (the picker). The room has no child switch.

### 1.4 Switches and settings

| Key | Default | Effect | When off |
|---|---|---|---|
| `family_meetings_in_app` (`packages/settings/src/domains/family-app.ts:16-20`) | false | The app opens our room inside the app (`src/room/rooms-in-app.ts:10-11`) | Phone browser and guest page. Web is not affected |
| `family_chat_enabled` (`family-app.ts:10-14`) | false | «المحادثة» button in the app room (`src/room/use-family-room-chat.ts:13-18`) | No chat button at all |
| `join_opens_before_min` / `join_closes_after_min` (`packages/settings/src/domains/teaching/classroom.ts:6-16`) | 15 / 120 | Set the window: from `starts_at` minus the first to `ends_at` plus the second (`packages/schedule/src/classroom/join-window.ts:46-54`). A staff «افتح الحلقة الآن» opens it earlier | n/a |
| `meeting_max_minutes` (`classroom.ts:27-31`) | 120 | The server closes a room that has been open longer than this. The app shows «انتهت الحلقة» with «ادخل مرة أخرى». The web shows «خرجت من الحلقة» | 0 = the closer is off |
| `meeting_link_auto` (`classroom.ts:37-41`) | false | Feeds `way_in` for a teacher without a meeting mode | n/a |
| Trial lesson | per lesson | The join answer has `chat: false` (`room-admission.ts:75`) | App: «المحادثة» explains instead of opening. Web: one note line |
| Recording configured | server env | The join answer has `recording: 'off'` when `RECORDING_S3_*` is missing (`room-admission.ts:79-81`). The family then sees no rec pill, but the consent line «تُسجَّل هذه الجلسة» still shows before joining (§6) | n/a |
| Test login | per account | A test login on a test student skips the window. Any test login skips the rate limit (`student-link.service.ts:79-85`, `join/join-gate.ts:48-55`). The card still hides the button outside the window, so there is nothing to draw | n/a |
| Recording media, audio or video | none | Egress records audio only since 2026-10-06 (`apps/api/src/modules/teaching/classroom/livekit/egress-request.ts:33`) | «not in code»: no setting exists. The owner asked on 11-17 for an admin choice, so any «فيديو» wording is new |

## 2. Screens and states

Sample people throughout:
- Student «يوسف أحمد», Asia/Riyadh. The room screens never show the student code. The app's child page header (`src/child/ChildScreen.tsx:28-31`) and board RoomXWebLiveCard do show it; use «AB-0147», as the board does.
- Teacher «أ. فاطمة», assistant «مريم».
- Lesson today 6:30 م – 7:15 م (45 دقيقة). Window 6:15 م to 9:15 م.

### 2.1 Before the room: the card and the row

The cards never read `window.state` from the API. Every second they compare the device clock with `window.opens_at` and `window.closes_at` (`windowStateAt`, `lesson-window.ts:7-11`) and with `starts_at` and `ends_at`.

| State | Data that drives it | Web | App | Copy (key) |
|---|---|---|---|---|
| Too early | `lessonWait` = `opensAt` (`packages/client-core/src/people/portal/lesson-window.ts:34-45`) | Hint and a grey countdown pill (`bg-sunk`, `LessonCountdown.tsx:8-31`) | Hint on the green action card (`lapisFill`) and a countdown pill, which is the card's big figure (`Countdown.tsx:18-44`). The status chip sits at the top. Nothing on a row | «يُتاح الدخول من 6:15 م» (`portal.opensAt`). «يُتاح الدخول بعد 23:40:12» (`portal.opensIn`). Over a day: «يومان 03:15:20» (`portal.days.two`) |
| Window open, not started | `opens_at` ≤ now < `starts_at` | Saffron countdown (`bg-act-soft text-act`, the `act` tone is `--saffron`, `LessonCountdown.tsx:11`). Then «تُسجَّل هذه الجلسة» with a red dot, then the button (`LessonAction.tsx:49-63`) | «الدخول متاح الآن» at the top of the card (`portal.app.lesson.openNow`), the countdown, a white button | «تبدأ الحلقة بعد 00:12:30» (`portal.startsIn`). «ادخل الحلقة» (`portal.join`). Row: «ادخل» (`portal.app.lesson.joinShort`) |
| Lesson time, room empty | `starts_at` ≤ now < `ends_at`, and `room` is null | Green «الحلقة جارية الآن» pill (`bg-ok-soft text-ok`) from the clock. Then the notice and «ادخل الحلقة» | «الدخول متاح الآن» at the top. The countdown pill reads «الحلقة جارية الآن». Button «ادخل الحلقة» | `portal.now`, `portal.join` |
| Live (someone inside) | `room.liveSince`, `room.inRoom` (`packages/schedule/src/classroom/room-state.ts:22-26`) via `liveRoom` (`client-core/.../app/live-room.ts:23-28`). There is no clock gate: someone inside and no `endedAt` is enough (`packages/client-core/src/teaching/lesson-room/room-live.ts:9-19`), so it can show before `starts_at` when staff enter early | Not shown. The web card reads no presence; it shows the clock states above. The presence block is «not in code» (board RoomXWebLiveCard) | `LiveTop` and `LiveStrip` replace the top line and the countdown (`src/lessons/live/LiveTop.tsx:10-35`, `LiveStrip.tsx:14-54`): a green dot, «الحلقة جارية الآن», the time since it started, up to 3 overlapping faces, a title and the names (sample in §7). Button «ادخل الآن», but only while `lessonWait` is null. A room that is live before `opens_at` shows the live top and strip with the «يُتاح الدخول من …» hint in place of the button (`JoinAction.tsx:58-65`) | Since: «بدأت الآن» (`portal.app.live.justNow`, under a minute), «بدأت منذ دقيقة» / «دقيقتين» / «4 دقائق» / «11 دقيقة» (`.since.*`). Title: «المعلم/ة في الغرفة الآن» (`.teacherIn`), or «في الغرفة الآن» (`.othersIn`) without the teacher. Button `.join`. Row: «جارية الآن · المعلم/ة في الغرفة» (`.rowTeacher`) or «جارية الآن» (`.row`) |
| After the end time, window still open | `ends_at` ≤ now ≤ `closes_at` | No countdown pill (`lessonClock` returns null, `countdown.ts:50-56`). The notice and the button stay | «الدخول متاح الآن», no countdown, the button. The live card if someone is still inside | `portal.join` |
| Ended for everyone | `room.endedAt` set | «not in code». No card reads `endedAt`. `liveRoom` returns null and the button stays while the window is open. A press gets 410 `lesson_ended` (below) | same | Web: `classroom.error.lesson_ended` after the press. App: `joinFailed` |
| Where it opens (app card footer) | `way_in` is classroom | n/a | One line under the button (`src/lessons/CardFooter.tsx:14-15,34-36`) | «تُفتح الحلقة في غرفة الأكاديمية على المتصفح، دون تسجيل دخول جديد.» (`roomNote`). When live and in the app: «تدخل الغرفة مباشرةً والميكروفون مفتوح، والكاميرا مغلقة.» (`roomNoteLive`) |
| Pressed or busy | mutation pending | Label changes, button disabled, `active:scale-[0.98]` (`LessonAction.tsx:56-60`) | Label changes, opacity 0.7, press scale, 12 ms vibration (`use-join.ts:12,38`) | «جارٍ فتح الحلقة…» (`portal.joining`) |
| Join refused | An API code from `CLASSROOM_ERRORS` (`packages/schedule/src/classroom/room.ts:37-57`) | Red alert above the notice, worded per code (`errors.ts:15-17`). A code outside the list, such as 409 `not_classroom_lesson`, gets `unknown` | One generic line under the button, whatever the code (`JoinAction.tsx:39-43`). White on the card, the bad tone on a row | Web: `classroom.error.join_closed` «انتهى وقت الحلقة». `.lesson_ended` «انتهت الحلقة، لا يمكن الدخول إليها مرة أخرى». `.removed_from_room`. `.no_lesson` «لا توجد حلقة قادمة لهذا الطالب». `.lesson_not_found` «الحلقة غير موجودة». `.join_not_open_yet` «لم تُفتح الحلقة بعد، يُفتح الدخول قبلها بـ 15 دقيقة», which shows only when the device clock runs ahead. `.too_many_requests` «محاولات كثيرة، حاول بعد قليل». `.classroom_not_configured`. `.unknown` «حدثت مشكلة، حاول مرة أخرى». App: «تعذّر فتح الحلقة، أعد المحاولة.» (`portal.app.lesson.joinFailed`) |
| Over or cancelled | `lessonWait` is `closed` (window passed, or status not open) or `cancelled` | Hint on the card. The week row shows no button | Never shown. The big card skips to the next lesson still ahead (`nextLesson`, `isAhead`, `lesson-window.ts:47-53`). The week row shows its status chip and no button | «انتهى وقت الدخول إلى هذه الحلقة» (`portal.closed`), «أُلغيت هذه الحلقة» (`portal.cancelled`) |
| Loading or failed list | `LoadState` | Skeleton rows, then a red alert «تعذّر تحميل البيانات.» with «أعد المحاولة» (`packages/web-kit/src/portal/LoadState.tsx:25-35`) | `SkeletonCard`, then `ErrorState`: a struck dot, «حدثت مشكلة، حاول مرة أخرى», and a ghost «حاول مرة أخرى» (`apps/family-mobile/src/ui/LoadState.tsx:24-31`). Pull to refresh on «الرئيسية», the child page and the week (`src/home/StudentHome.tsx:25`, `src/child/ChildScreen.tsx:34`, `src/schedule/ScheduleScreen.tsx:20`) | Web: `portal.loadFailed`, `portal.retry`. App: `common.error`, `mobile.retry` |
| Offline, or a failed reload | cached query data | The last list stays on screen. Countdowns keep ticking from the cached window. A press fails with the generic `unknown` line | Same: cached data wins over a failed reload (`LoadState.tsx:17-21`). A press shows `joinFailed` | No offline banner: «not in code» |
| Empty | Web: no lessons in the next 14 days. App: no lesson still ahead | «لا توجد حلقات في الأيام الأربعة عشر القادمة» and its hint | The title only, no hint (`UpcomingPanel.tsx:22`) | `portal.lessonsEmpty`, `portal.lessonsEmptyHint` (web). Week: `portal.app.schedule.empty` |

### 2.2 Phone browser path (app switch off), drawn at 390

This is `apps/staff-web/src/features/teaching/classroom/join/GuestJoinPage.tsx:62-105` on the `app.` host, opened by `routes/(public)/join.$linkToken.tsx:18` with `knownStudent`, so there is no name field. It uses the same web-kit look.

| State | Content |
|---|---|
| Ready | Logo, language switch, cartouche «ادخل الحلقة» (`classroom.guest.title`), «ادخل الحلقة مباشرةً دون تسجيل.» (`classroom.guest.introKnown`), «تُسجَّل هذه الجلسة», button «ادخل الحلقة» |
| Busy | «جارٍ إدخالك الحلقة…» (`classroom.joining`) |
| Too early | Alert «تُفتح الساعة 6:15 م» (`classroom.opensAt`, from the 403's `opens_at`) |
| Refused | Alert per code, as on the web card. An expired or unknown family link reads «هذا الرابط غير صحيح» (`classroom.error.link_invalid`) |
| Admitted | The web room (section 2.4), at phone width. After «خرجت من الحلقة», «ادخل مرة أخرى» returns to this page (`join.reset()`, line 73) |

### 2.3 Before joining: device check (app only)

- The steps come from `packages/mobile-kit/src/room/model/room-phase.ts:67-97` and are drawn by `RoomBody.tsx:48-87`.
- All of them sit on the cover surface under the top bar «الحلقة عبر الإنترنت» (`classroom.title`).
- Cover tokens: light `#ecfdf5` with ink `#064e3b`, dark `#18201d` with ink `#e9efec` (`packages/catalog/src/theme/theme.ts:19-20,34-35`).

| Step | Content | Copy |
|---|---|---|
| checking | Spinner and one line | «جارٍ الاتصال…» (`mobileRoom.connecting`) |
| permission (only if the mic or camera is not yet allowed) | Mic and camera glyphs, title, body, two buttons, a ghost link (`preview/RoomPermission.tsx:19-53`) | «الكاميرا والميكروفون». «يحتاج التطبيق إلى الميكروفون ليسمعك المشاركون، وإلى الكاميرا ليروك. يمكنك إغلاق أيٍّ منهما في أي وقت.» «اسمح وتابع». «تابع دونهما». «فتح في المتصفح» (`mobileRoom.permission.*`, `mobileRoom.openInBrowser`) |
| preview | «قبل الدخول», own camera (or «الكاميرا مغلقة»), round toggles «كتم» and «الكاميرا», a red dot with «تُسجَّل هذه الجلسة», «نحفظ اختيارك هذا، فتدخل مباشرة في المرات القادمة.», «انضم الآن» (`preview/RoomPreview.tsx:26-70`). No «فتح في المتصفح» on this step | `mobileRoom.preview.*`, `mobileRoom.remember`, `classroom.recordedNotice` |
| preview, refused | Notice above the toggles (`preview/PreviewNotice.tsx:9-28`) | Denied: «لم يُسمح بالكاميرا أو الميكروفون، فستدخل دون ما لم يُسمح به.» Blocked: «الكاميرا أو الميكروفون ممنوع في إعدادات الجهاز. اسمح بهما من الإعدادات ثم عُد.» and «افتح الإعدادات» |
| joining | Spinner | «جارٍ الاتصال…» |

- The preview shows the first time only. A later join skips it when a choice is saved and both permissions are granted. A refused permission always shows the preview with its notice (`state/use-auto-join.ts:24-30,39-55`).
- «حاول مرة أخرى» and «ادخل مرة أخرى» go back to the preview, which joins again by itself with the saved choice (`room-phase.ts:96`).
- The «بدأت الحلقة» push enters with the mic on and the camera as last chosen, off if never chosen (`use-auto-join.ts:24-27`).
- Board RoomXPreview also shows «حلقة يوسف مع المعلمة فاطمة», a teacher-presence row, a «مكبر الصوت» button and a «إغلاق» control. All of these are «not in code».
- The preview has no visible way out today. Android back still works.

**Web has no device check («not in code»).**
- Connecting turns the mic and the camera on (`packages/web-kit/src/classroom/room/livekit/livekit-room.ts:84-90`). So a web family always enters with the camera on. The app push keeps the camera as last chosen, off if never chosen.
- A refusal becomes an alert line inside the room (`errors.ts:22-30`):
  - «الميكروفون غير مسموح، فعّله من إعدادات المتصفح» (`classroom.error.mic_denied`)
  - «الكاميرا غير مسموحة، فعّلها من إعدادات المتصفح» (`.cam_denied`)
  - «لا توجد كاميرا أو ميكروفون متصل» (`.device_missing`)
- If the browser blocks sound autoplay, the bar shows «شغّل الصوت» (`classroom.enableAudio`, `ControlBar.tsx:33-37`).

### 2.4 In the room

| State | Web (`LiveRoom.tsx:35-85`) | App (`live/RoomLive.tsx:33-65`) | Copy (key) |
|---|---|---|---|
| Header | Status lines, then the rec pill (`RoomHeader.tsx:6-18`). While connecting, «جارٍ إدخالك الحلقة…» and «بانتظار البقية…» can show together | Title, rec pill with a timer under it, people pill on the end side (`screen/RoomTopBar.tsx:27-54`) | «جارٍ إدخالك الحلقة…», «3 في الحلقة» (`classroom.participants`), «عدد المشاركين: 3» (`mobileRoom.count`, spoken) |
| Alone, waiting | «بانتظار البقية…» in the header while there is one camera tile | Same words under one's own tile (`live/ParticipantGrid.tsx:43-50`) | `classroom.waiting`. A line that waits for the teacher by name is «not in code» |
| With the teacher | Even grid sized by container width (`stage.ts:26-32`). Each tile shows video, or the first letter in gold on the dark tile. Caption «فاطمة». Own tile «يوسف (أنت)», mirrored (`VideoTile.tsx:22-71`) | 1 column for up to 2 people, 2 columns above that (`model/room-grid.ts:12`). A tile without video shows the avatar. Own tile «أنت» comes last. «بدّل الكاميرا» sits on its corner only while the own camera is on (`live/ParticipantTile.tsx:43-64`) | `classroom.you`, `mobileRoom.controls.switchCamera` |
| Speaking | Gold outline, filled dot and «يتحدث» in the caption | Gold 3 pt border. «يتحدث» only in the spoken label | `classroom.speaking` |
| Mic off | Struck dot and «الميكروفون مغلق» in the caption | Struck mic icon on the caption chip | `classroom.muted` |
| Screen share | Stage with a side strip from `lg`, and the strip under the stage below `lg` (`RoomStage.tsx:22-62`). «إخفاء المشاركين» / «إظهار المشاركين». Click for «تكبير الشاشة», «تصغير» (`stage/StageScreen.tsx:24`). When maximised, a picture-in-picture strip shows. On a phone held upright it adds «أدر الهاتف أفقيًا لرؤية الشاشة بوضوح أكبر» (`StageScreen.tsx:65-78`) | The shared screen gets its own full-width row first and is never cropped. «تكبير الشاشة» / «تصغير» on the tile; the zoomed screen takes the whole grid | «شاشة فاطمة» (`classroom.screenOf`), `classroom.stage.*` incl. `rotateHint` |
| Teacher's board | When staff open it, the board takes the stage. «السبورة» shows or hides it on this screen only (`board/use-board.ts:47-54`). Read-only toolbar: «السبورة للعرض فقط» and «اطلب الكتابة على السبورة». When the board is closed, the bar shows «اطلب فتح السبورة». After «سماح», «القلم», five colours, «الممحاة» and «تراجع» appear (`BoardToolbar.tsx:60-77`) | Nothing until the teacher presses «مشاركة السبورة». Then it arrives as a screen tile «شاشة فاطمة». The board label and the requests are «not in code» (board RoomXShare) | `classroom.board.readOnly`, `classroom.boardRequest.draw.*`, `.open.*` («بانتظار فتح السبورة…», «فُتحت السبورة»), `classroom.board.pen` etc., `classroom.boardOf` |
| Ask to share the screen | Desktop browsers only: «اطلب مشاركة الشاشة», then «بانتظار الموافقة على المشاركة…» (`share/ShareButton.tsx:20-28`). The answer is a status line above the stage with «إغلاق» (`share/ShareRequestsPanel.tsx:18-23`): «سُمح لك بمشاركة الشاشة» or «رُفض طلب مشاركة الشاشة». Once allowed, the button becomes «شارك الشاشة» / «أوقف المشاركة» | Never. The phone does not share its screen (`docs/35-inapp-meetings.md` §4) | `classroom.shareRequest.*`, `classroom.shareOn`, `.shareOff` |
| Recording | Pill with a pulsing dot and no timer (`recordings/RecIndicator.tsx:4-11`) | Pill «جارٍ التسجيل · 04:12», with the timer in an LTR island (`screen/RecordingPill.tsx:10-36`). The timer counts from this person's own join, not from the start of the recording (`RoomScreen.tsx:29`, `screen/use-elapsed.ts:13-21`). With no recording there is no pill and no timer | «جارٍ التسجيل» (`classroom.recordingNow`) |
| Muted by the teacher | Toast (`mute/MuteToasts.tsx:7-12`), for the mic or the camera | Notice above the grid until the mic is on again (`state/use-room-controls.ts:9-19`). A camera stopped by staff shows no notice («not in code») | «كتمك المعلم» (`classroom.mute.byStaff`). Web camera: «أوقف المعلم كاميرتك» (`.camByStaff`). App hint: «يمكنك فتح الميكروفون مرة أخرى من زر «كتم».» (`mobileRoom.mutedHint`) |
| Reconnecting | Status line in the header | Full-width red strip over the grid (`RoomLive.tsx:37-51`) | «جارٍ إعادة الاتصال…» (`classroom.reconnecting`) |
| Participants | The «المشاركون» button opens a drawer from the inline end, full width on phones and 460 px at most (`kick/ParticipantsSheet.tsx:56-72`, `components/ui/overlay/Drawer.tsx:33-40`): name, «(أنت)», and the role word from the token. The family's own row reads «ضيف» | The people pill opens a bottom sheet «المشاركون · 3» (`host/ParticipantsPanel.tsx:62-101`): avatar, «يوسف (أنت)» «الطالب», «فاطمة» «معلم/ة» «يتحدث», «مريم» «مساعد حلقة», mic-off and camera-off icons, and a ghost «فتح في المتصفح». Read only | `classroom.people`, `classroom.roles.*`, `studentChannel.roles.student` |
| In-room chat | No panel. Trial lessons only show «المحادثة النصية مغلقة في الحلقات التجريبية.» (`classroom.chatClosedTrial`). A family chat panel is «not in code». RoomXWebRoomChat is the teacher's view, and that is not in code either | Round «المحادثة» button with an unread badge (`live/ChatButton.tsx:19-58`). It opens the student channel as a modal sheet over the live room (`app/room-chat/[id].tsx`). Trial: no badge, and a sheet «المحادثة» with «تُفتح المحادثة مع المعلم/ة بعد الاشتراك» and «إغلاق» (`live/LiveSheet.tsx:24-33`, `screen/use-room-screen.ts:35-38`) | `mobileRoom.controls.chat`, spoken «المحادثة، 3 غير مقروءة» (`portal.app.child.chatUnread`), `studentChannel.closed`. For the thread design, see the chat spec |
| Controls | Bottom bar with icon and words; the words are hidden under `sm`. «أغلق الميكروفون»/«شغّل الميكروفون», «أغلق الكاميرا»/«شغّل الكاميرا», share or its request, «السبورة», «اطلب فتح السبورة» while the board is closed, «المشاركون», and «اخرج من الحلقة» in red (`ControlBar.tsx:25-48`) | Evenly spaced round buttons: «كتم», «الكاميرا», the audio output by name («مكبر الصوت», «السماعة», «سماعة الرأس», «سماعة بلوتوث»; on iOS «الصوت», which opens the system picker), «المحادثة», and «غادر» in red (`live/RoomControls.tsx:34-58`, `live/AudioButton.tsx:11-18`) | `classroom.micOff` etc., `mobileRoom.controls.*` incl. `audio` |
| Leave confirm | None. «اخرج من الحلقة» leaves at once. «not in code» | Sheet «تغادر الحلقة؟», «يمكنك الدخول مرة أخرى ما دامت الحلقة جارية.», then «غادر» (danger) above «ابقَ في الحلقة». The sheet has no «إغلاق». Android back asks too (`live/LeaveSheet.tsx:18-29`, `screen/use-leave-guard.ts:20-30`) | `mobileRoom.leaveAsk.*` |

### 2.5 After the room

- The web maps every disconnect except duplicate and removed to one screen (`livekit-room.ts:28-32`).
- The app tells them apart (`screen/RoomEnd.tsx:30-50`).

| Why | Web (`ClassroomRoom.tsx:25-39`) | App |
|---|---|---|
| Left on purpose | «خرجت من الحلقة» (`classroom.ended`) and «ادخل مرة أخرى», which returns to the card for a fresh press | «خرجت من الحلقة», «الحلقة ما زالت جارية، ويمكنك العودة إليها الآن.» (this line shows whatever the room's state), «المعلم/ة في الغرفة الآن» when presence says so, «ادخل مرة أخرى», «رجوع» (`mobileRoom.left.*`, `classroom.rejoin`, `mobileRoom.back`) |
| Teacher ended it for everyone, or the server closed it (`meeting_max_minutes`) | The same «خرجت من الحلقة» screen. The next press shows `classroom.error.lesson_ended`. A separate ended screen is «not in code» | When LiveKit closes the room: «انتهت الحلقة» (`classroom.closedHint`) and «ادخل مرة أخرى». A rejoin that gets 410 `lesson_ended` makes it final: «انتهت الحلقة» and «رجوع» only (RoomXEnded) |
| Connection dropped | «خرجت من الحلقة» | «انقطع الاتصال بالحلقة» (`mobileRoom.dropped`) and «ادخل مرة أخرى» |
| Removed by the teacher | «أُخرجتَ من الحلقة، ولا يمكنك العودة إليها» (`classroom.error.removed_from_room`), no rejoin | same, with «رجوع» |
| Opened elsewhere (same token) | «دخلت الحلقة من نافذة أخرى، لذا أُغلقت هذه النافذة» (`classroom.error.duplicate`), no rejoin | «دخلت من جهاز أو نافذة أخرى، لذا أُغلقت الغرفة هنا» (`mobileRoom.duplicate`) and «ادخل مرة أخرى» |
| Could not connect | «تعذّر الاتصال بالحلقة، حاول مرة أخرى» (`classroom.error.connect_failed`) or «تعذّر الوصول إلى خادم الحلقات…» (`.server_unreachable`), with «ادخل مرة أخرى» | The refusal text for the code, else `connect_failed` (`state/room-failure.ts:7-12`). Buttons «حاول مرة أخرى» (`classroom.retry`), «فتح في المتصفح», «رجوع» |
| Stale or bad app link | n/a | «انتهت صلاحية الدخول، ادخل مرة أخرى من القائمة» (`mobileRoom.missing`) and «رجوع» (`src/room/FamilyRoomRoute.tsx:70-76`) |
| No LiveKit in this APK | n/a | «تعذّر تشغيل الحلقة داخل التطبيق على هذا الجهاز، فافتحها في المتصفح» (`mobileRoom.sdkFailed`), «فتح في المتصفح», «رجوع» (`FamilyRoomRoute.tsx:45-49`) |

- **Web dead end.** On removed and duplicate, `Closing` shows only the text, inside the `fixed inset-0` overlay, with no close or back. A reload is the only way out, so a «رجوع» there is «not in code».
- **App closing screens** have a 40 pt icon (hang-up, remove, phone or alert), a 20 pt bold title, a quieter line, then stacked buttons (`screen/RoomNotice.tsx:35-86`).

## 3. Layout: web 1280 vs phone 390

**Web 1280.**
- The room replaces the viewport (`fixed inset-0 z-50`) and hides the portal shell.
- It is one screen tall (`h-dvh`). From the top: header line, alerts, request lines, then the grid or the stage. From `lg` a 192 px camera column sits beside the stage.
- The control bar sticks to the bottom, centred, with words on every button.
- The card that leads into the room sits in the «القادمة» tab, inside the shell's max width.

**Web 390.**
- Same room. The camera strip moves under the stage and scrolls sideways (128 px tiles).
- Control buttons keep a 44 px minimum and hide their words. The words stay as accessible names (`RoomButton.tsx`).
- The bar pads for the home indicator (`safe-area-inset-bottom`).
- The participants drawer takes the full width.

**App 390.**
- A full-screen modal on the cover surface: mint in light mode, green-black in dark.
- Top bar: title, the rec pill under it, and a 44 pt people pill.
- The grid fills the middle with 8 pt gaps. A row of round controls sits above the safe area.
- Sheets rise from the bottom to at most 75 % of the height, over a scrim, on the page surface (`live/RoomSheet.tsx:20-62`). Participants use the native bottom sheet.

**Surface.**
- The web room uses the page surface, so it follows Emerald Mint in light and dark. Tiles are the dark `inverse` tone.
- The app room uses the cover tokens instead, with video tiles on `leatherDeep` (light `#d1fae5`, dark `#141b18`).
- `docs/35-inapp-meetings.md` still calls it «the dark cover surface». That wording predates Emerald Mint.
- Whether the web room should also use the cover tokens is a design call («not in code»).

## 4. Motion with a job

**Existing tokens.**
- Web `motion.css`: `fade-up` 200 ms (rise 6 px), `fade-in` 160 ms, `pop-in` 180 ms (rise 4 px, scale 0.97), `toast-in` 200 ms (rise 10 px). `drawer-in` 220 ms slides in sideways from the inline end (the left in RTL), not from the bottom. Ease `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- `prefers-reduced-motion: reduce` turns all of them off.
- Already in use near this feature: the web tab panel fades up (`apps/family-web/src/features/children/ChildBody.tsx:54-55`), and the web participants drawer uses `drawer-in` over a `fade-in` scrim.
- App: `pressScale` (0.98), the child tab motion (`useTabMotion`), and the native stack transition, which the room inherits (`src/root/FamilyRootLayout.tsx:57,73`).

| Moment | What it tells the family | Status |
|---|---|---|
| Press on «ادخل الحلقة» / «ادخل» | The tap registered: scale to 0.98, and a 12 ms vibration on the phone | in code |
| Button appears when the window opens | You can enter now: `pop-in` as it replaces the hint | not in code (it swaps instantly) |
| Countdown | Tabular figures with no per-second animation. Screen readers do not read it every second (`role="timer"`) | in code; keep it still |
| Live dot on the card and row, rec dot | Something is happening now: a slow 2 s opacity pulse | The web rec dot pulses (`animate-pulse`). App dots are static: not in code |
| Live card replaces the countdown card (app) | Someone is inside now: cross-fade the top line and the strip | instant: not in code |
| Room opens and closes | Shows where you went: web `fade-in` on the overlay, app native modal transition | in code on the app. The web is instant: not in code |
| Speaking ring | Who is talking. Fade the ring in and out over about 120 ms so quick speaker changes do not flicker | instant today: not in code |
| Reconnecting strip | The call is recovering, not frozen: it slides down from the top and leaves on reconnect | instant: not in code |
| App leave sheet, locked-chat sheet | Comes from the control row you pressed: rise from the bottom like the native participants sheet. Do not use `drawer-in`, which slides sideways | The participants sheet animates (native). The others appear instantly: not in code |
| «كتمك المعلم» | Something changed for you: `toast-in` on the web, a fade on the app notice | The web toast is in code. The app notice is instant |
| Share and board answers (web) | Your request was answered: `fade-up` on the status line above the stage | instant: not in code |
| Unread badge on «المحادثة» | A new message arrived: `pop-in` when the count rises | not in code |
| Closing screens | A calm settle: `fade-up` | not in code |

## 5. Not in code

The basis column says whether designers may draw each item: an owner-reviewed board, an owner ask, or neither.

| # | Missing | Basis |
|---|---|---|
| 1 | Web: device check before joining (the mic and camera start on connect) | No board and no ask found. The app's RoomXPreview is the closest |
| 2 | Web: leave confirmation | No web board and no ask found. The app has board RoomXLeave |
| 3 | Web: a separate «انتهت الحلقة» screen when the teacher ends it for everyone | Board RoomXEnded (drawn for the app) |
| 4 | Web: «رجوع» on the removed and duplicate screens | No board and no ask found. It is a dead end today |
| 5 | Web: a family in-room chat panel | Owner ask (this request names chat). The only web board, RoomXWebRoomChat, is the teacher's |
| 6 | Web: the live card with presence and «ادخل الآن». `liveRoom` is unused in web-kit and family-web | Board RoomXWebLiveCard |
| 7 | App preview: lesson subtitle, teacher-presence row, speaker button, «إغلاق» control | Board RoomXPreview |
| 8 | App: the board label «سبورة …», «السبورة للعرض فقط», and the draw request | Board RoomXShare |
| 9 | Both: a «waiting for the teacher» line inside the room | No board and no ask found |
| 10 | Both: a choice between audio and video recording (recordings are audio only) | Owner ask, 2026-11-17 |
| 11 | Both: an «ended for everyone» card before the press (`room.endedAt` is sent but never read) | No card board and no ask found. RoomXEnded covers only the room |
| 12 | App: a notice when staff stop one's camera | No board and no ask found |
| 13 | Both: an offline banner on the lessons list | No board and no ask found |
| 14 | The motion marked «not in code» in section 4 | Owner ask: purposeful interactive motion |

## 6. Copy and data mismatches to settle before drawing

- **«المعلمة» vs «المعلم/ة».** The boards write «المعلمة», while the keys say «المعلم/ة» (`portal.app.live.teacherIn`, `classroom.roles.teacher`). Use the key unless the owner wants gendered copy.
- **Hard-coded 15 minutes.** `classroom.error.join_not_open_yet` and `classroom.notOpen` say «15 دقيقة», but the window is a setting. Draw the early state with `portal.opensAt` and a time.
- **`roomNoteLive` promises too much.** It says «والميكروفون مفتوح، والكاميرا مغلقة», but the card's «ادخل الآن» does not pass `direct` (`use-join.ts:28`). Only the push does (`hrefs.ts:50`). On a first join the preview still shows. Later joins use the saved choice, which may be mic off or camera on.
- **`roomNote` shows with the switch on.** «تُفتح الحلقة في غرفة الأكاديمية على المتصفح…» shows whenever the room is not live, even when the in-app switch is on (`CardFooter.tsx:14-15`). Either draw the browser wording on the switch-on card too, or ask the owner to change the rule.
- **The consent line ignores `recording: 'off'`.** «تُسجَّل هذه الجلسة» shows on the web card, the guest page and the app preview even when the server records nothing.
- **«ضيف» vs «الطالب».** The web participants drawer calls the family «ضيف». The app's sheet says «الطالب» because it reads presence (`role-word.ts:19-23`). The app's spoken tile label still says «ضيف» (`ParticipantTile.tsx:33-41`).
- **The assistant's name.** The boards name the assistant on the live card («مريم (مساعد حلقة)»). The API sends staff without names, so the card reads «مساعد حلقة».
- **Join errors.** The app card shows one generic join error. The web shows the reason for each code.
- **An excused lesson.** A lesson the family excused (`excused`) reads «انتهى وقت الدخول إلى هذه الحلقة» on the web card, not «أُلغيت», because only `cancelled_*` statuses count as cancelled (`lesson-window.ts:25-27`).
- **Weekday on the boards.** The boards write «الأحد 16 نوفمبر», but 2026-11-16 is a Monday. Use «الإثنين 16 نوفمبر», or move the sample to Sunday 15 November.

## 7. Sample data (fake)

```json
{
  "portalLesson": {
    "id": "5b1d8c2e-0f3a-4e7b-9c41-2a6d7e8f9a10",
    "starts_at": "2026-11-16T15:30:00Z",
    "ends_at": "2026-11-16T16:15:00Z",
    "status": "confirmed",
    "teacher": { "display_name_ar": "أ. فاطمة", "display_name_en": "Ms. Fatima" },
    "way_in": "classroom",
    "meeting_url": null,
    "window": { "state": "open", "opens_at": "2026-11-16T15:15:00Z", "closes_at": "2026-11-16T18:15:00Z" },
    "room": {
      "liveSince": "2026-11-16T15:30:20Z",
      "endedAt": null,
      "inRoom": [{ "name": "فاطمة", "role": "teacher" }, { "role": "staff" }]
    }
  },
  "roomJoinResult": {
    "url": "wss://rtc.example.invalid",
    "token": "<jwt>",
    "room": "lesson-5b1d8c2e-0f3a-4e7b-9c41-2a6d7e8f9a10",
    "role": "guest",
    "recording": "on",
    "chat": true
  },
  "portalRoomLink": { "url": "https://app.example.invalid/join/<70 chars>", "expires_at": "2026-11-16T18:15:00Z" }
}
```

- This `room` gives the app card «المعلم/ة في الغرفة الآن» over «فاطمة · مساعد حلقة».
- For an empty room send `"room": null`. For a lesson ended for everyone send `{ "liveSince": null, "endedAt": "2026-11-16T16:05:00Z", "inRoom": [] }`.
- `family` («خيارات الحلقة», `portalLessonFamilySchema`) also rides on each lesson. It is outside this spec.

**Schemas (API data):**
- `portalLessonSchema` (`packages/shared/src/people/students/portal.ts:59-73`)
- `joinWindowSchema` (`portal.ts:53-57`)
- `lessonRoomStateSchema` (`packages/schedule/src/classroom/room-state.ts:22-26`)
- `roomJoinResultSchema` (`packages/client-core/src/people/portal/portal-sends.ts:17-24`)
- `portalRoomLinkSchema` (`portal.ts:126`)

**Room tiles (client state, not API data):**
- Web `TileView` (`packages/web-kit/src/classroom/room/components/room-types.ts:8-27`)
- App `RoomTile` (`packages/mobile-kit/src/room/model/room-types.ts:20-34`)

**Sample tiles for a live board:**
- «فاطمة»: معلم/ة, speaking, camera on.
- «مريم»: مساعد حلقة, mic off, camera off.
- «يوسف (أنت)» on the web, «أنت» in the app: mic on, camera off.
- Recording timer «04:12». Unread on «المحادثة»: 3.

# Records (تسجيلات الحلقات): board spec for the family portal

Source: develop checkout `wt-ref` at 35fb46a2e. Path short forms used below:
`wk` = packages/web-kit/src · `cc` = packages/client-core/src · `fw` = apps/family-web/src ·
`fm` = apps/family-mobile/src · `mk` = packages/mobile-kit/src · `api` = apps/api/src/modules ·
`ar` = packages/shared/i18n/ar.json.

## 0. Five facts that shape every board

1. **Audio only today.** The egress writes one MP3 per room at 64 kbps (`api/teaching/classroom/livekit/egress-request.ts:15,33,37`). `media` is `'video'` only for rows recorded before 2026-10-06 (.mp4, `packages/schedule/src/classroom/student-recordings.ts:69`). Both in-app players (web `<audio>`, app expo-audio) are audio players, so a video row plays its sound with no picture. The report page's button (fact 4) hands the raw file to the browser, which may show the picture of an old .mp4. That is browser behaviour, not our code. No admin setting picks audio or video: there is no media key in `packages/settings/src` and no `video` in the recording env (`apps/api/src/config/env/env.recording.ts`).
2. **The family sees finished recordings only.** A row reaches the family only when all four hold: `status = 'done'`; `visible_to_student = true` (off by default; staff switch it on per recording); the lesson had exactly one student; and the student's report for that lesson was sent with a ready PDF (`api/people/portal/reports/portal-reports.repo.ts:103-116`, `sentQuery` :131-139). So no family screen ever shows a "processing", "failed" or "expired" row. When retention runs (`recording_retention_days`, off by default, `packages/settings/src/domains/teaching/recordings.ts:16-21`), it marks a row `deleted`, and the row leaves the list.
3. **No feature switch gates it.** `recordings: true` for guardian, adult and child (`cc/people/portal/viewer.ts:82`). `family_chat_enabled` and `family_meetings_in_app` do not touch this tab.
4. **No download in our players.** Neither in-app player has a download control. A second path exists: the report page's «شاهد التسجيل» (web) or «شاهد تسجيل الحلقة» (app) hands the raw signed file to a browser tab (web, `wk/portal/open-file.ts:6-18`) or to the phone's browser or viewer (app, `Linking.openURL`, `fm/report/use-open-file.ts:13`). That page has no resume and no speed. Its controls belong to the browser, and in most browsers they include a download.
5. **Links last an hour.** `POST /portal/students/:id/recordings/:recordingId/url` returns `portalFileUrlSchema` `{ url, expires_at }` (`packages/shared/src/people/students/portal.ts:119`), signed for 3600 s (`api/people/portal/portal.controller.ts:109`, `portal-reports.service.ts:63`, `apps/api/src/common/storage/storage.paths.ts:28`). Clients treat a link as fresh for 50 min (`staleTime`, `wk/portal/recordings/use-recordings.ts:6`, `fm/recordings/use-assets.ts:8`). After that, the next mount or refetch mints a new one; there is no timer. The app never keeps a link on disk (`noPersist`, `fm/recordings/use-assets.ts:9-10`).

## 1. Where it lives

### Entry points

| Surface | Entry | Route | What opens |
| --- | --- | --- | --- |
| Web (family-web) | Child tab «التسجيلات» (`lessonFiles.recordings`) on «الرئيسية» or a child page | `/portal?tab=recordings`, `/children/<id>?tab=recordings` (`fw/features/children/child-tabs.ts:10-12`) | Inline panel: the picked lesson's card on top, all recordings by month under it (`wk/portal/recordings/RecordingsPanel.tsx:31-65`) |
| Web | «حضرها» row → «افتح تقرير الحلقة» (`portal.openReport`) | `/report/<reportId>?studentId=…&recording=…` (`fw/features/children/ChildBody.tsx:38-43`) | Report page, then a «شاهد التسجيل» button (`portal.openRecording`) that opens the file in a new tab (`wk/portal/report/ReportView.tsx:23-25,39`, `FileButtons.tsx:16`) |
| Web | «التقارير» bar tab → a report row's «افتح تقرير الحلقة». Every login gets this tab once a student is in view; a guardian of several children must pick one first (`cc/people/portal/app/family-tabs.ts:10-17`) | same `/report/…` route (`fw/features/reports/ReportRow.tsx:14-20`) | same |
| App (family-mobile) | Pill «التسجيلات» in the child pills. It does not switch a panel; it pushes a screen (`fm/child/ChildBody.tsx:33,61`) | `recordings/[id]` (`fm/recordings/hrefs.ts:4`) | List screen (`fm/recordings/RecordingsScreen.tsx`) |
| App | A row on that list | `lesson/[id]?student=<id>` (`fm/recordings/hrefs.ts:7-8`) | Lesson screen: player(s), full report, files (`fm/recordings/LessonScreen.tsx`) |
| App | «حضرها» row or «التقارير» row carrying a note «تسجيل الحلقة» in link colour (`portal.app.history.recording`, `fm/child/HistoryRow.tsx:38`, `fm/report/ReportRow.tsx:28`) | `report/[id]?student=…&rec=…` (`fm/nav/hrefs.ts:26-32`) | «شاهد تسجيل الحلقة» (`portal.app.report.recording`) opens the file outside the app (`fm/report/ReportFiles.tsx:28-35`) |

**One rule for the report page's recording button.** It shows only when the opener passes a recording id (`ReportView.tsx:23-25`, `fm/report/ReportFiles.tsx:28`). The «حضرها» and «التقارير» rows pass one, on web and app. These openers pass none, so their report page has no recording button: bell and push alerts (`cc/people/portal/app/alerts.ts:16`, `fw/features/alerts/alert-link.ts:9`), the app's «ما المطلوب» card (`fm/lessons/PrepareCard.tsx:52`), and the web recordings card's «اقرأ التقرير كاملًا» (`wk/portal/recordings/LessonPanel.tsx:35`). When an id is passed, it is the lesson's **newest** part only (`api/people/portal/reports/portal-reports.mapper.ts:5-11`, `history/portal-history.mapper.ts:72`).

The web «حضرها» and «التقارير» rows show no recording mark (`wk/portal/history/HistoryRow.tsx:24-40`, `fw/features/reports/ReportRow.tsx:22-39`); the app rows do. Draw both as they are, or flag the gap (§6).

### Pill/tab order

القادمة · حضرها · غاب عنها · **التسجيلات** · الباقة · المحادثة (`cc/people/portal/viewer.ts:66`). «الباقة» is hidden for a child login. «المحادثة» shows only while `family_chat_enabled` is on. Every viewer sees the same «التسجيلات» word (`cc/people/portal/app/tab-word.ts:26`). On the app the pill never shows as selected, because it pushes a screen instead.

### Viewers

| Viewer (`portalViewer`, viewer.ts:22-27) | Sees the tab | Wording differences today |
| --- | --- | --- |
| Guardian (`kind: guardian`, `contact_is_self: false`) | yes | Tabs «حضرها / غاب عنها». Empty note names the child: «حلقات يوسف التي تُعقد على Google Meet لا تُسجَّل.» |
| Adult student (`contact_is_self: true`) | yes | Tabs «حضرتها / غبت عنها» (`portal.app.child.attendedSelf/absentSelf`). The empty note still uses the third person with their own name (`RecordingsPanel.tsx:38`, `fm/recordings/RecordingsList.tsx:19`). A gap, see §6 |
| Child's own login (`kind: student`) | yes | Same as adult, and no «الباقة» |

**Several children.** The recordings list is always for the one child in view. On web, a guardian of several children sees the picked child's name in the header (`fw/features/shell/ChildSwitch.tsx:10-24`; spoken «تبديل الطالب: يوسف», `portal.app.pick.open`). Tapping it opens «اختر الطالب» (`portal.app.pick.title`, `/children`). A child page `/children/<id>` has a «كل الأبناء» back button (`portal.allChildren`, `fw/features/children/ChildPage.tsx:20-24`). A new pick restarts the page (`fw/features/children/WithPick.tsx:23-24`).

**Not this login's child.** The API answers 404 for any student outside the login's scope (`PortalScopes`, `api/teaching/student-recordings/lesson-files/portal/portal-assets.service.ts:32`). See W8 and M6.

### Test accounts

The «تجريبي» chip (`MeTestChip` in `fw/features/shell/FamilyShell.tsx:24`) is in code. The watermark and the screen-capture block for recording screens are **not wired**. No `canSkip`, FLAG_SECURE or watermark code exists in fm, mk or wk (docs/56-test-accounts.md:64-66, lane `feat/lessons-course-recordings`). Once built, a check is skipped only when the signed-in profile **and** the recording's student are both test (docs/56:12,14). One capture guard is already in the app, with no UI and no test skip: on Android 10+ other apps cannot record the app's playback sound (`android:allowAudioPlaybackCapture="false"`, `apps/family-mobile/plugins/no-audio-capture/app.plugin.ts`, loaded at `app.json:32`; it needs a new APK). Nothing on today's recording screens changes for a test login.

## 2. Data (zod schemas = what a board may show)

`portalRecordingSchema`, `packages/shared/src/reports/lesson-files/lesson-assets.ts:50-59`. List = `GET /portal/students/:id/recordings` → `{ items }`: newest first, every visible part of every lesson, no paging (`api/teaching/student-recordings/lesson-files/portal/portal-assets.controller.ts:18`, service `:31-36`).

| Field | Type | Fake sample | Shown as |
| --- | --- | --- | --- |
| `id` | string | `rec-7a1` | (key of the saved stop) |
| `lesson_id` | string | `les-31c` | groups parts of one lesson |
| `report_id` | string \| null | `rep-90b` | «اقرأ التقرير كاملًا» target |
| `lesson_starts_at` | ISO UTC | `2026-11-15T14:00:00Z` | «حلقة الأحد 15 نوفمبر», and the time in `student.tz` (Asia/Riyadh): «17:00» on a 24 h clock, «5:00 م» on 12 h |
| `teacher` | `{ display_name_ar, display_name_en \| null }` \| null | `{ "أ. فاطمة", null }` | «مع أ. فاطمة» (web) / «أ. فاطمة» (app) |
| `duration_seconds` | number \| null | `2640` | «44 دقيقة». The server computes it from the start and end times (`portal-assets.mapper.ts:12`). null renders «0 دقيقة» today (`cc/teaching/lesson-files/recording-months.ts:19-20`) |
| `size_bytes` | number \| null | `21120000` | **not shown** to the family anywhere |
| `media` | `'audio' \| 'video'` | `'audio'` | **not shown**; does not change the in-app player |

Lesson page = `GET /portal/students/:id/lessons/:lessonId/files` → `portalLessonAssetsSchema` (`lesson-assets.ts:71-79`): `lesson_id`, `lesson_starts_at`, `lesson_ends_at` (`2026-11-15T14:45:00Z`), `teacher`, `report_id`, `recordings[]` (the parts, newest first), `files[]` (`portalLessonFileSchema`: `id, lesson_id, kind (homework|voice_note|whiteboard|material), title, mime, size, media (image|pdf|audio), created_at`). The API answers 404 `lesson_not_found` until the report is sent (service `:43`).

Report and history rows carry `recording_id` (string \| null). It is the newest visible part of that lesson (§1 rule).

Student context (`portalStudentSchema`): `name` «يوسف», `code` (use **AB-9907** on boards, never a real-range code like AB-0123 or AB-10xx), `tz` «Asia/Riyadh», `contact_is_self`.

**Kept on the device, not on the server:** the stop per recording id (`cc/teaching/audio-player/resume.ts`). Three listen states (`resume.ts:33-39`): new → «جديد»; partial → «توقفت عند 18:20»; done (within 5 s of the end) → «استمعت إليه كاملًا», and the next play starts from 0. A stop under 5 s is not kept. Web uses localStorage (a private window forgets); the app uses AsyncStorage. Another device shows «جديد» again. Speed is not kept: each player opens at 1× (`cc/teaching/audio-player/player-state.ts:27-32`).

**Parts.** A lesson whose room closed and reopened has several recordings. The list shows one row per lesson, and that row **is the newest part** (`RecordingsPanel.tsx:28-29`, `partsByLesson` recording-months.ts:12-16). Its minutes and listen state come from that part only (`RecordingRowButton.tsx:22,31`; app `RecordingRow.tsx:24,30`). The player opens the **oldest** part first, «الجزء 1 · 31 دقيقة» (`partChoices` :28-39, `LessonParts.tsx:16-17`). So a lesson of 31 + 13 minutes reads «13 دقيقة · جزءان» on its row, and listening to part 1 leaves the row on «جديد». Draw it that way (see §6).

## 3. Screens and states to draw

### Strings (all exist: `audioPlayer` at `ar:9485`, `lessonFiles` at `ar:9499`, the rest under `portal`, `common`, `mobile`)

| Key | Arabic |
| --- | --- |
| `lessonFiles.recordings` | التسجيلات |
| `lessonFiles.recordingsHint` | تسجيلات صوتية لحلقات غرفة الأكاديمية. تُفتح داخل التطبيق، وتتابع من حيث توقفت. |
| `lessonFiles.recording` | تسجيل الحلقة |
| `lessonFiles.lessonOf` | حلقة {when} |
| `lessonFiles.lessonPage` (app title while loading or failed) | صفحة الحلقة |
| `lessonFiles.isNew` / `stoppedAt` / `heard` | جديد / توقفت عند {at} / استمعت إليه كاملًا |
| `lessonFiles.partsCount.two` (web row) | جزءان |
| `lessonFiles.parts.two` (app row) | مسجّلة في جزأين |
| `lessonFiles.partsLabel` / `partOption` / `part` | أجزاء التسجيل / الجزء {n} · {minutes} دقيقة / الجزء {n} |
| `lessonFiles.rowMeta` (app row) | {teacher} · {time} · {minutes} دقيقة |
| `portal.withTeacher` + `portal.app.lesson.minutes` (web row) | مع {teacher} · {n} دقيقة |
| `lessonFiles.empty` | لا توجد تسجيلات بعد |
| `lessonFiles.emptyMeet` | حلقات {name} التي تُعقد على Google Meet لا تُسجَّل. |
| `lessonFiles.emptyRoom` | حين تُعقد الحلقة في غرفة الأكاديمية، يظهر تسجيلها هنا بعد إرسال تقريرها وإتاحته من الأكاديمية. ولا تُعرض تسجيلات الحلقات الجماعية. |
| `lessonFiles.reportSummary` / `openReport` (web card) | من تقرير هذه الحلقة / اقرأ التقرير كاملًا |
| `lessonFiles.report` (app section) | تقرير الحلقة |
| `lessonFiles.header` / `reportPdf` / `open` / `fileFailed` | ملفات الحلقة · {n} / تقرير الحلقة (PDF) / افتح / تعذّر فتح الملف، أعد المحاولة. |
| `lessonFiles.media.pdf` / `listen` (app file rows; `listen` is spoken only) | PDF / استمع |
| `portal.openPdf` (web PDF button) | افتح ملف PDF |
| `audioPlayer.play` / `pause` | تشغيل / إيقاف مؤقت |
| `audioPlayer.back` / `forward` (spoken; the button face shows «10») | رجوع 10 ثوانٍ / تقديم 10 ثوانٍ |
| `audioPlayer.speed` + chips | السرعة: 1× · 1.5× · 2× (`cc/teaching/audio-player/player-math.ts:8`) |
| `audioPlayer.resumeFrom` / `startOver` | من حيث توقفت: {at} / ابدأ من البداية |
| `audioPlayer.seek` / `position` (slider name/value, spoken) | موضع التشغيل / {at} من {total} |
| `audioPlayer.failed` | تعذّر تشغيل التسجيل، أعد المحاولة. |
| `portal.loadFailed` + `portal.retry` (web load error) | تعذّر تحميل البيانات. + أعد المحاولة |
| `common.error` + `mobile.retry` (app load error) | حدثت مشكلة، حاول مرة أخرى + حاول مرة أخرى |
| `portal.openRecording` (web report) / `portal.app.report.recording` (app report) | شاهد التسجيل / شاهد تسجيل الحلقة |
| `portal.backToLessons` / `portal.reportTitle` / `portal.app.report.pdf` | العودة إلى الحلقات / تقرير الحلقة / تحميل التقرير PDF |
| `portal.fileFailed` (report page) | تعذّر فتح الملف، أعد المحاولة. |
| `common.notFound` + `portal.allChildren` | لم نجد ما تبحث عنه + كل الأبناء |
| `portal.app.pick.title` / `open` | اختر الطالب / تبديل الطالب: {name} |

`audioPlayer.loading` («جارٍ تحميل التسجيل…»), `audioPlayer.audio` and `lessonFiles.teacher` exist, but no family screen renders them.

### Web (family-web, kit `wk/portal/recordings/`)

| # | Board | Purpose | Content (sample) | Actions | Code |
| --- | --- | --- | --- | --- | --- |
| W1 | Tab, filled | Hear the newest lesson at once, browse the rest | Hint line. Lesson card, with the newest lesson picked: h2 «حلقة الأحد 15 نوفمبر», line «يوسف · مع أ. فاطمة · 17:00 – 17:45». Then the player, a bordered card nested in the lesson card with no visible title. Then «من تقرير هذه الحلقة»: the report's first 5 filled lines, each label over value, in the report's order: الحضور / حضر في الموعد · البرنامج / القرآن الكريم · التسميع / سورة الملك · الآيات 1–5 · جيد جدًا · الحفظ الجديد / سورة الملك · الآيات 6–10 · ممتاز · المراجعة / سورة القلم · الآيات 1–20 · جيد. «التقدير العام» falls past the five here. Then a secondary «اقرأ التقرير كاملًا» and «ملفات الحلقة · 3» (the report PDF counts as one). After the card: month heads «نوفمبر 2026», «أكتوبر 2026», with no «كل التسجيلات» heading. Each month holds row buttons, e.g. «حلقة الأحد 15 نوفمبر» / «مع أ. فاطمة · 17:00 · 44 دقيقة» / «توقفت عند 18:20», and a two-part lesson «حلقة الأربعاء 11 نوفمبر» / «مع أ. فاطمة · 17:00 · 13 دقيقة · جزءان» / «جديد» | A row tap picks that lesson (pressed row: primary border, `lapis-wash` fill). «اقرأ التقرير كاملًا» → `/report/<id>`, which then shows **no** «شاهد التسجيل» (§1 rule). «افتح ملف PDF» (`portal.openPdf`) and «افتح» on each picture or PDF open a new tab. A voice note plays inline | RecordingsPanel.tsx:42-64, LessonPanel.tsx:19-43, ReportSummary.tsx:9-25, RecordingRowButton.tsx:23-33, PortalFileList.tsx:28-58, `cc/teaching/reports/v2-lines.ts:121-136` |
| W2 | Lesson in parts | Choose a part | Card for «حلقة الأربعاء 11 نوفمبر». Under the player, the visible legend «أجزاء التسجيل» and 48 px radio chips: «الجزء 1 · 31 دقيقة» (checked) · «الجزء 2 · 13 دقيقة». A chip swaps the player to that part. The picked list row still reads «13 دقيقة · جزءان» | Chip tap | LessonParts.tsx:15-33, `wk/components/ui/form/radio-chips.tsx` |
| W3 | Empty | Say why nothing is here | No hint line. Empty state «لا توجد تسجيلات بعد», then one paragraph: `emptyMeet` with «يوسف» + `emptyRoom` | none | RecordingsPanel.tsx:35-41 |
| W4 | Loading | | Skeleton rows (a circle and two shimmering bars) for the list; 2 rows inside the lesson card; 1 row in the player slot while its link is minted. The report summary shows nothing until it loads and stays hidden if it fails (ReportSummary.tsx:11) | | LoadState.tsx:27, `wk/components/ui/display/skeleton.tsx:5-7,21-36`, LessonPanel.tsx:50, RecordingPlayer.tsx:10 |
| W5 | Load error / offline | List, lesson card or link failed | Alert «تعذّر تحميل البيانات.» + secondary «أعد المحاولة». Data already on screen stays when a later re-read fails. Also draw it in the player slot: a family sees it when staff hid the recording or retention removed it after the list loaded (404 `recording_not_found`). Offline: web keeps nothing on disk and sets no `networkMode` (`fw/boot.tsx:9`), so TanStack's default pauses reads while the browser reports offline, and a fresh open shows the W4 skeleton until the connection returns. A request that fails while the browser thinks it is online ends here after TanStack's default retries. A link minted earlier in the visit is still in memory, so offline the player mounts and then shows W6e | Retry | LoadState.tsx:25-35 |
| W6 | Player states | One card, five faces | (a) Loading metadata: bar empty; «0:00 … —» on a new recording. With a saved stop it reads «18:20 … —» and the resume line already shows. (b) Paused at a saved stop: quiet top line «من حيث توقفت: 18:20» + ghost «ابدأ من البداية»; bar at 42 %; «18:20 … 44:00». (c) Playing: the centre button reads «إيقاف مؤقت»; under the visible legend «السرعة», 1.5× is checked. The resume line stays while playing and follows the latest save, every 5 s. A new recording shows «من حيث توقفت: 0:05» after 5 s of play (AudioPlayer.tsx:26,34; use-html-audio.ts:61). (d) Ended: bar full, «44:00 … 44:00», button back to «تشغيل», resume line gone, the row now «استمعت إليه كاملًا». (e) Failed: alert «تعذّر تشغيل التسجيل، أعد المحاولة.» under the controls, with no retry button inside the player | Play/pause; ±10 s (the chevron + «10» buttons); tap or drag the bar; arrows ±10 s; Home/End (RTL: left arrow = forward); speed chips | `wk/lesson-files/AudioPlayer.tsx:25-49`, SeekBar.tsx:27-68, PlayerButtons.tsx:25-47 |
| W7 | Report page with recording | Second way in | Secondary «العودة إلى الحلقات», h2 «تقرير الحلقة», the report with its PDF, then a secondary «شاهد التسجيل». The button is disabled while the link is minted. Failure: «تعذّر فتح الملف، أعد المحاولة.» (`portal.fileFailed`) above it. Openers with no recording id get the page without the button (§1 rule) | A blank tab opens inside the tap and is then pointed at the file; it closes again on failure | ReportView.tsx:22-41, FileButtons.tsx:23-47, open-file.ts:6-18 |
| W8 | Not found | A link to a child not on this login | `/children/<id>`: «لم نجد ما تبحث عنه» + «كل الأبناء» | Back to the children | `fw/features/children/ChildPage.tsx:19-25` |

The time format follows the viewer's clock setting (`useClock`), «17:00» or «5:00 م»; use one format per board. Times inside the seek bar are LTR islands (`Ltr`).

### App (family-mobile)

| # | Board | Purpose | Content (sample) | Actions | Code |
| --- | --- | --- | --- | --- | --- |
| M1 | Child page, pills | Way in | The pills fit one row. Tapping «التسجيلات» pushes M2; the pill never shows as selected | Tap | fm/child/ChildBody.tsx:56-72 |
| M2 | List | Browse by month | Header «التسجيلات», subtitle «يوسف», back; no bottom tab bar. Hint line. Month sections «نوفمبر 2026». Card rows (PressCard): date tile (الأحد / 15), title «تسجيل الحلقة», line «أ. فاطمة · 5:00 م · 44 دقيقة», note «توقفت عند 12:40» (quiet). A two-part row: «أ. فاطمة · 5:00 م · 13 دقيقة», notes «مسجّلة في جزأين» (quiet) · «جديد» (link colour). A heard row: «استمعت إليه كاملًا» (quiet) | Row → M4. Pull to refresh | RecordingsScreen.tsx:16-31, RecordingsList.tsx:29-54, RecordingRow.tsx:22-44, `fm/ui/PressCard.tsx:24-55`, `fm/root/FamilyRootLayout.tsx:62-69` |
| M3 | Empty | | Empty state «لا توجد تسجيلات بعد», then two centred quiet lines: `emptyMeet` (with «يوسف») and `emptyRoom`. No hint | Pull to refresh | RecordingsList.tsx:13-23,35 |
| M4 | Lesson screen | Listen, read, open files | Header «حلقة الأحد 15 نوفمبر», subtitle «يوسف · 5:00 م – 5:45 م», back; no tab bar. One section per part, oldest first, titled «تسجيل الحلقة» or «الجزء 1» / «الجزء 2», each with its own player (stacked, no chips). Section «تقرير الحلقة» with the **full** report. «ملفات الحلقة · 3»: «تقرير الحلقة (PDF)» / «PDF», then file rows (title + «ملف الواجب · صورة · 1.2 ميغابايت»). A voice-note row opens its player under it. Failure line «تعذّر فتح الملف، أعد المحاولة.» | Player controls. A PDF or picture opens in the phone's viewer. Pull to refresh | LessonScreen.tsx:19-47, LessonBody.tsx:14-35, LessonFiles.tsx:14-34, LessonFileRow.tsx:16-31 |
| M5 | Player states | Same five as W6 | Raised card. Resume line: quiet «من حيث توقفت: 12:40», then «ابدأ من البداية» in link colour. It behaves as on web: it shows while loading with a saved stop and follows the latest save while playing. 44 pt seek bar (6 pt track), «12:40 … 44:00». Icon buttons: back-10 · filled play/pause · forward-10. Speed pills 1× · 1.5× · 2×, with «السرعة» spoken only, not shown. Failed: error line «تعذّر تشغيل التسجيل، أعد المحاولة.» | Tap or drag the bar; a screen reader swipes ±10 s | `mk/ui/form/player/AudioPlayer.tsx:25-62`, ProgressBar.tsx:24-69, PlayerControls.tsx:19-53 |
| M6 | Loading / error / offline | | Loading: one raised skeleton card (a 44 pt circle and two bars, breathing). Error: struck nuqta glyph, «حدثت مشكلة، حاول مرة أخرى», ghost «حاول مرة أخرى». The lesson screen keeps the title «صفحة الحلقة» with no subtitle while loading or failed; a 404 (report not sent, or not this login's student) shows the same error. **Offline:** the shared top bar reads «جارٍ الاتصال…», then «تحقّق من اتصالك بالإنترنت» (`mobile.connection`). Reads try once and are not retried on a network error (`networkMode: 'offlineFirst'`). The list and lesson page come from the disk cache (up to a day) and stay on screen. Links never reach the disk: a link minted earlier in this run is still in memory, so its player mounts and then shows the failed face (M5); with no link in memory, the player section shows the error state. Unknown child id, or the family profile not loaded yet: header «التسجيلات» with an empty body | Retry | `fm/ui/LoadState.tsx`, `mk/ui/feedback/ErrorState.tsx:19-40`, `SkeletonCard.tsx:8,15-38`, `mk/lib/query/query-client.ts:19-23,45-54,78-90`, `mk/ui/connecting/BarCard.tsx:34-35`, `mk/root/RootFrame.tsx:24`, LessonScreen.tsx:26-30, RecordingsScreen.tsx:18,25-29 |
| M7 | Report screen | Second way in | Secondary «شاهد تسجيل الحلقة» above «تحميل التقرير PDF». It shows a busy spinner while the link is minted, then opens outside the app. Failure: «تعذّر فتح الملف، أعد المحاولة.» (`portal.fileFailed`, danger colour). No button when the opener passed no id (§1 rule) | Tap | fm/report/ReportFiles.tsx:17-43 |

Leaving M4 stops the sound: the source is released on unmount and the stop is saved (`mk/ui/form/player/use-audio-player.ts:93-97`). There is no background or lock-screen playback: `enableBackgroundPlayback: false` (`apps/family-mobile/app.json:68`). On M4, two parts (or a part and a voice note) can play at the same time, because nothing pauses the other player (§6).

### Web vs app at a glance

| | Web | App |
| --- | --- | --- |
| Where | Inline child tab | Two pushed screens, no tab bar |
| Lesson view | Card above the month list, swapped by row tap | Own screen |
| Parts | One player + radio chips «أجزاء التسجيل» | One player per part, stacked |
| Report | 5-line summary + «اقرأ التقرير كاملًا» | Full report inline |
| Row | Text button, no date tile | Card with date tile, title «تسجيل الحلقة» |
| Play/pause face | Text button «تشغيل» / «إيقاف مؤقت» | Filled icon button |
| «ابدأ من البداية» | Ghost button | Link-colour text |
| «السرعة» | Visible legend over the chips | Spoken only |
| Offline | Nothing on disk: skeleton until back online (W4/W5) | Connecting bar; cached list and lesson page; players fail |

## 4. Layout: web 1280 vs phone 390

- **Web 1280.** `FamilyShell` is a 14rem side rail plus one centred column, `max-w-[720px]`, `px-4` (`fw/features/shell/FamilyShell.tsx:15,29`). So the tab is one column: hint, lesson card, month list. The old RecXWebFamily* boards are 1200 wide; draw at the real column width. A two-pane layout (list beside the player) is a design proposal, not code.
- **Web at 390 (phone browser).** Bottom bar, `pb-24`. Row buttons wrap (`min-w-0`). The picked lesson sits above the list, and tapping a row far down does **not** scroll back to the player, so the family sees nothing change. Draw it as it is. Raise the fix (scroll to the card, or a sticky mini-player) with the owner before drawing it.
- **App 390.** Header with back, pull to refresh, safe-area bottom, and no tab bar on M2/M4. The seek bar's touch area is 44 pt tall (ProgressBar.tsx:50). Speed pills wrap.
- RTL throughout. The progress fill grows from the inline start (right). Player times stay LTR (web `Ltr`, app `ltr()`). Logical properties only.

## 5. Motion that does a job

| Moment | Motion | In code? |
| --- | --- | --- |
| Child tab panel appears (web) | `animate-fade-up` 200 ms, 6 px rise (`fw/features/children/ChildBody.tsx:55`, `wk/styles/motion.css:5,12-15`) | yes |
| Pill tap → list, row tap → lesson (app) | Stack push sliding in from the reading end (`fm/root/screen-animation.ts:10-17`) | yes |
| Loading | Web: `ab-skeleton` shimmer, 1.2 s (motion.css:10,44-46). App: the skeleton card breathes, 700 ms each way (`SkeletonCard.tsx:8`) | yes |
| Row tap → lesson card swaps (web) | Fade-up on the new card, so the eye sees what changed. Today the card remounts with no motion (`key={picked}`, RecordingsPanel.tsx:46) | not in code |
| Play ↔ pause | Icon/label cross-fade, about 120 ms | not in code |
| Playing row (web list) | Small live mark on the pressed row while its file plays, so a family that scrolled down knows what is sounding | not in code |
| Seek bar | Fill follows `timeupdate` / the status tick. No easing on the fill, which would make the scrub lag the finger | as is |
| «من حيث توقفت» line | Fade in on open; fade out after «ابدأ من البداية» | appears and disappears, no fade |
| Listen state change («جديد» → «توقفت عند») | none needed | |
| Press | App cards: lapis wash at once, spring to 98 % (`fm/ui/PressCard.tsx:24-55`). Web rows: `hover:bg-sunk`; the pressed state is colour only (RecordingRowButton.tsx:28) | yes |

Reduced motion turns it all off. Web: `wk/index.css:129`; skeleton bars stay still. App: `useA11yPref('reduceMotion')` (`fm/child/use-tab-motion.ts:15-19`); PressCard keeps the wash and drops the scale; the skeleton card stays still.

## 6. Not in code

| Item | Status | Draw it? |
| --- | --- | --- |
| Video recordings: picture player, fullscreen, «تسجيل مرئي · 44 دقيقة» | Owner asked 2026-11-17 («recorded session could be audio or video it depends on the config of the admin»). No setting; egress is audio-only | Yes, as variants beside audio (boards RecXFamilyVideoPlayer, RecXWebFamilyVideo) |
| Admin setting audio \| video in «القيم» | Owner asked, same date | Staff board, not this one |
| Type mark «مرئي» / «صوتي» on rows; mixed hint «تسجيلات صوتية ومرئية…»; «شاهدته كاملًا» for video | Follows from the above; no i18n keys yet | Yes, with the video variants |
| Student-code watermark on video (e.g. «AB-9907»), screen-capture block (FLAG_SECURE), test-account skip | docs/56:64-66 lane; owner chose these 2026-11-17 | Yes, marked as lane work |
| Processing, failed, expired rows for the family | Not built and not asked. The API hides them on purpose | No |
| Download button | Not in our players and not asked; it conflicts with the watermark/capture plan. The report-page button hands the raw file to the browser, whose own controls may offer a download (fact 4) | No |
| Separate app player screen (board RecXFamilyPlayer: «صفحة الحلقة» link, «تسجيل صوتي · 45 دقيقة», «ملخص التقرير», «كل الملفات») | Not built: the player lives on the lesson screen (M4) | No; draw M4 |
| Separate web lesson page with «العودة إلى التسجيلات» (board RecXWebFamilyLesson) | Not built: web uses the inline card (W1) and the report page (W7) | No |
| In-page player on the report screen (board Report «تسجيل الحلقة 12:40 / 42:10»; docs/50-family-app.md:123 says "recording player when visible") | Code shows a button that opens the file outside (W7/M7) | Raise with the owner, do not draw |
| App lesson screen extras from board RecXFamilyLesson: teacher line «المعلم/ة: أ. فاطمة», attendance chip «حضر الحلقة», «في غرفة الأكاديمية · 45 دقيقة», a collapsed «6 ملفات» summary | Not rendered | Raise with the owner, do not draw |
| «عرض المزيد» paging; a «كل التسجيلات · الأحدث أولًا» heading | Board RecXWebFamilyRecordings had both. The API returns every row (it scans up to 1000 sent reports, portal-reports.repo.ts:42) | Only if the owner asks |
| Size «21 ميغابايت» and «بتوقيتك (الرياض)» on the player header | Boards had them. Family code shows neither | Only if the owner asks |
| Push or bell alert «تسجيل جديد» | Not built, not asked | No |
| Background / lock-screen playback (app) | Off on purpose (`app.json:68`) | No |
| A row for a lesson in parts shows only the newest part's minutes and listen state | Code behaviour (§2) | Draw as is; raise the fix (total minutes, state of the whole lesson) with the owner |
| The report page's recording button opens the newest part only, and is missing when opened from alerts, «ما المطلوب» or the recordings card | Code behaviour (§1 rule) | Draw as is; raise with the owner |
| Only one player sounds at a time (app M4 parts and voice notes) | Not built: players do not pause each other | Raise with the owner, do not draw |
| The resume line shows only before play | Today it stays and tracks every 5 s save (W6c) | Raise with the owner; draw today's behaviour |
| Own-voice empty note for adult/child («حلقاتك التي تُعقد…») | Not built; today it uses their name in the third person | Raise with the owner, do not draw |
| Recording mark on web «حضرها» and «التقارير» rows | The app has it; web does not | Raise with the owner, do not draw |
| Retry inside a failed player; a link that expires mid-listen | Not built. Read from the code, not run: after 50 min a link refetch (web window refocus; app back to the foreground, `mk/lib/query/query-client.ts:38-41`) swaps the source, and the player reloads paused at the stop it opened with (`wk/lesson-files/use-html-audio.ts:38,55`; `mk/ui/form/player/use-audio-player.ts:30` + the effect on `url`). Once the old link has expired, a new range read fails with W6e | Raise with the owner, do not draw |
| Hide «0 دقيقة» when `duration_seconds` is null; drop the leading « · » of the app row when `teacher` is null (`RecordingRow.tsx:25-30`) | Not built | Raise with the owner, do not draw |
| A distinct spoken label per app row (today every row says «تسجيل الحلقة», `RecordingRow.tsx:38`) | Not built | Raise with the owner, do not draw |
| Recording consent notice (`recording_consent_notice`, public, admin-set) before a recorded lesson | The setting exists but nothing reads it. The join card shows only the fixed «تُسجَّل هذه الجلسة» (`classroom.recordedNotice`, `wk/classroom/recordings/RecordedNotice.tsx:4-10`, used at `wk/portal/lessons/LessonAction.tsx:52`) | Live-session spec, not this one |

## 7. Board hygiene

- Drop the dashed «خادم 1 … خادم 4» chips from the old RecX boards. Owner rule: no developer notes on boards.
- Fake data only: يوسف (guardian's child), مريم (adult student), أ. فاطمة (teacher), code AB-9907, Asia/Riyadh. The old boards used «مريم عبد الله» as the teacher, «سلمى أحمد» as the student and AB-0123: replace them.
- Use the code's wording, not the old boards': «من حيث توقفت: 18:20», not «يبدأ من 18:20، حيث توقفت في المرة السابقة.»; «اقرأ التقرير كاملًا», not «افتح صفحة الحلقة: التقرير كاملًا وملفاته»; the hint is `lessonFiles.recordingsHint`, not the boards' longer paragraph; «17:00 – 17:45», not «من 17:00 إلى 17:45 بتوقيتك (الرياض)»; the report summary's real labels (W1), not «الواجب المطلوب قبل الحلقة القادمة» in the first five.
- The owner's 2026-11-17 notes say egress was not installed on the server then, so nothing was recorded yet. If that still holds, most families see W3/M3, so the empty state deserves real care. This checkout cannot confirm the server state.

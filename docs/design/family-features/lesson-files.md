# Lesson files (ملفات الحلقة): family portal spec

Source: develop checkout `wt-ref` at 35fb46a2e. Board names (RecX…) refer to `canvas-ref/project/*.dc.html`. Boards supply wording and states only; the code decides what is built.

**Short path roots:**
- **`api/…/lesson-files/`** = apps/api/src/modules/teaching/student-recordings/lesson-files/ (its `portal/` holds the family controller and service).
- **`web-kit/src/…`** = packages/web-kit/src/…. A bare web file name (PortalFileList, LessonPanel, LessonParts, ReportSummary, RecordingPlayer, lesson-words, RecordingsPanel, RecordingRowButton, use-recordings) lives in packages/web-kit/src/portal/recordings/.
- **`family-mobile/src/…`** = apps/family-mobile/src/…. A bare phone file name (LessonScreen, LessonBody, LessonFiles, LessonFileRow, VoiceNote, use-assets, hrefs, RecordingRow, RecordingsList) lives in apps/family-mobile/src/recordings/; `ui/`, `child/`, `root/`, `nav/` are under apps/family-mobile/src/.
- **`family-web …`** = apps/family-web/src/…; `routes/_family/…` sits under it.
- **`index.css`, `motion.css`** = packages/web-kit/src/index.css and packages/web-kit/src/styles/motion.css.
- **mobile-kit `AudioPlayer.tsx`** = packages/mobile-kit/src/ui/form/player/AudioPlayer.tsx (with `PlayerControls.tsx`, `ProgressBar.tsx` beside it). The web player is web-kit/src/lesson-files/AudioPlayer.tsx (with `PlayerButtons.tsx`, `SeekBar.tsx`).
- **`portal-reports.repo.ts`** = apps/api/src/modules/people/portal/reports/portal-reports.repo.ts.

## 0. Three kinds of file the family can see

Board designers must keep these apart. They come from different tables, endpoints and screens.

| File | Data | Where the family sees it today | Opens how |
|---|---|---|---|
| **Report PDF** («تقرير الحلقة (PDF)») | `report_id` → `POST /portal/students/:id/reports/:reportId/url` (5 min link, `SIGNED_URL_SECONDS.portal`), or `reportPageViewSchema.pdf.url` (packages/shared/src/reports/page.ts:58) | Report page (web + app); first item of «ملفات الحلقة» on the lesson page | Outside: new tab (web) / phone viewer (app) |
| **Report attachments** («مرفقات المعلم/ة» `reportPage.files`, «مرفق {n}» `reportPage.file`) | `reportPageViewSchema.attachments[]` = `{id, mime, size, url}` (page.ts:40, :56) | **Web report page only** (web-kit/src/report/ReportPageFiles.tsx:10-25, mounted at ReportPageBody.tsx:47 through LessonReportView). The family app's report screen does not render them (family-mobile/src/report/ReportBody.tsx, ReportFiles.tsx) | New tab |
| **Lesson files** (this spec) | table `lesson_files` (migration 20261117150200_lesson_files.sql), family view `portalLessonFileSchema` | Only on the **lesson page**, which opens only from «التسجيلات» (§1) | Audio plays inline; image/PDF open outside |

## 1. Where it lives

### Data and rules (API)
- Family endpoints, permission `self.portal`, scoped by `PortalScopes` (404 for another family's student). Defined in api/…/lesson-files/portal/portal-assets.controller.ts:13-44:
  - `GET /portal/students/:id/lessons/:lessonId/files` → `PortalLessonAssets`.
  - `POST /portal/students/:id/lesson-files/:fileId/url` → `{url, expires_at}`, a 1-hour signed link (`SIGNED_URL_SECONDS.ui`).
- **When the family gets what** (portal-assets.service.ts:38-67):
  - **The page** opens when the student is on the lesson (`lessonOf`) and the student's report for it was **sent**. Sent means submitted, PDF ready and the report message gone out (`sentQuery`, portal-reports.repo.ts:131-138). The API checks the sent report, not the attendance outcome.
  - **A file** is listed and opens only when staff also left «يراه الطالب وولي الأمر» on (`visible_to_family`, default true; migration line 22).
  - Otherwise the API answers 404 `lesson_not_found` (page) or `lesson_file_not_found` (link).
- **Group lessons.** Files belong to the lesson, not to one report, so a group lesson's file reaches every student whose report was sent (migration header). Recordings of group lessons never reach the family (portal-reports.repo.ts:113, `lesson_students.length === 1`).
- **Allowed types** (packages/shared/src/reports/schema.ts:72-86): jpeg, png, webp, **heic**, pdf, mp3, m4a/mp4 audio, aac, ogg, webm, wav. Each file is 25 MiB at most.
  - There is **no video type**, so a lesson file is never a video, even when the recording media setting is video.
  - The API sets `media` from the type with `lessonFileMediaOf` (api/…/lesson-files/lesson-files.mapper.ts:35; packages/shared/src/reports/lesson-files/lesson-files.ts:18): `image | pdf | audio`. The clients only read it.
- **Order.** Newest first (`created_at desc`, lesson-files.repo.ts:52). The clients put the report PDF first, above all files.
- **Links** (phone use-assets.ts:7-10; web use-recordings.ts:5-6):
  - A link lasts 1 h and is minted again after 50 min.
  - On the phone it is never written to the disk cache (`noPersist`). The lesson page itself is cached on disk.
  - Images and PDFs get a fresh link on every tap; a voice note's link is fetched when its player mounts.

### Entry points (all that exist)

The lesson page has **one door on each platform: a recording.**

| Platform | Path to the files |
|---|---|
| Web (`apps/family-web`) | «الرئيسية» `/portal?tab=recordings` (routes/_family/portal.tsx:7) or `/children/$studentId?tab=recordings` (routes/_family/children/$studentId.tsx:9) → tab «التسجيلات» (web-kit/src/portal/ChildPanel.tsx:26) → `RecordingsPanel` mounts the picked lesson's `LessonPanel` **above** the month list (RecordingsPanel.tsx:45-47). The newest lesson is picked by default. Picking another row swaps the panel. The lesson has **no own URL** and no back link. |
| Phone (`apps/family-mobile`) | «الرئيسية» pills → «التسجيلات» pushes `/recordings/[id]` (child/ChildBody.tsx:61) → a recording card → `/lesson/[id]?student=` (RecordingRow.tsx:36, hrefs.ts:7) → `LessonScreen` (app/lesson/[id].tsx:1). |

**Gap (the main design question, «not in code»).**
- `visibleRecordings` keeps only finished, visible recordings of one-student lessons. The family therefore cannot reach the files of:
  - Google Meet lessons
  - group lessons
  - lessons whose recording staff hid
  - lessons that were not recorded at all
- The API would serve those files: `GET …/lessons/:lessonId/files` needs only a sent report of this student for the lesson.
- What exists today and does not lead to the files:
  - «حضرها» rows open the **report** (web-kit/src/portal/history/HistoryRow.tsx:24-31; family-mobile/src/child/HistoryRow.tsx:53-56).
  - `PortalHistoryRow` has no file count (packages/shared/src/people/students/portal-family.ts:30-42).
  - No alert or push target points at a lesson page (client-core/src/people/portal/app/alerts.ts:16-21).
- The staff hint `lessonFiles.familyNote` says «تظهر هذه الملفات للطالب وولي الأمر في صفحة تقرير الحلقة بعد إرساله.» Neither report screen renders lesson files: web-kit/src/portal/report/ReportView.tsx:38-39 and family-mobile/src/report/ReportScreen.tsx.
- **Recommended board** (owner to confirm): a «ملفات الحلقة · n» block on the report page and/or a file count on the «حضرها» row, both opening the lesson page. Such a lesson page may have **no recording**: draw that variant (§2 states).

### Who sees what
- **No feature switch for lesson files.**
  - «التسجيلات» shows for every login (client-core/src/people/portal/viewer.ts:82, `recordings: true`).
  - `family_chat_enabled` and `family_meetings_in_app` do not affect this feature.
  - The recording media setting (audio | video) changes only the recording player, not the files.
- **Guardian, student and adult student** (`contact_is_self`) get the **same data and the same screens**. Only the surrounding tab words change: «حضرها» vs «حضرتها» (`portal.app.child.attendedSelf`). The «التسجيلات» word (`lessonFiles.recordings`) is shared.
- A guardian of several children sees the child in view (the pick). `/children/$studentId` is never filtered by the pick. The phone lesson route carries its student in `?student=`.
- **Times** are written in the student's zone (`student.tz`), in the viewer's 12/24-hour setting: «6:30 م – 7:15 م» (12 h) or «18:30 – 19:15» (24 h). A browser whose setting is unknown reads as 24 h.
- The family is never shown hidden files, `visible_to_family`, `created_by` or storage paths (`portalLessonFileSchema` omits `visible_to_family`: lesson-assets.ts:67).
- The web `ChildPanel` and `RecordingsPanel` are also mounted by the staff portal pages (ChildPanel.tsx:16-21). A change to the web lesson panel shows there too.

## 2. Screens and states to draw

### Data on the page (`portalLessonAssetsSchema`, lesson-assets.ts:71)
```
lesson_id, lesson_starts_at, lesson_ends_at,
teacher: { display_name_ar, display_name_en } | null,
report_id (always set by this endpoint), recordings: PortalRecording[], files: PortalLessonFile[]
PortalLessonFile = { id, lesson_id, kind: homework|voice_note|whiteboard|material,
                     title: string|null (≤120), mime, size (bytes), media: image|pdf|audio, created_at }
```
**Row text** (client-core/src/teaching/lesson-files/file-size.ts:4-25):
- **Title** = `title`, or the kind's word when `title` is null.
- **Line** = `kind word · media word · «{n} ميغابايت»`. n has one decimal under 10 and is a whole number above. It is never below 0.1.

An untitled file repeats its kind word in both title and line. Designers may propose a shorter line («not in code»).

**Sample files** (fake: student يوسف, teacher أ. فاطمة, lesson الثلاثاء 17 نوفمبر 2026, 6:30 م – 7:15 م):

| title | kind | mime | size | shown title / line |
|---|---|---|---|---|
| «ورقة واجب سورة النبأ» | homework | image/jpeg | 838 861 | ورقة واجب سورة النبأ / ملف الواجب · صورة · 0.8 ميغابايت |
| null | voice_note | audio/mp4 | 1 153 434 | ملاحظة صوتية من المعلم/ة / ملاحظة صوتية من المعلم/ة · تسجيل صوتي · 1.1 ميغابايت |
| null | whiteboard | image/png | 412 000 | لقطة السبورة / لقطة السبورة · صورة · 0.4 ميغابايت |
| «خطة حفظ نوفمبر» | material | application/pdf | 1 363 149 | خطة حفظ نوفمبر / ملف من المعلم/ة · PDF · 1.3 ميغابايت |

Words come from `lessonFiles.kinds.*`, `lessonFiles.media.*` and `lessonFiles.sizeMb`.

### S1. Lesson page, phone app (`LessonScreen`, family-mobile/src/recordings/LessonScreen.tsx:19-46)
- **Header** (back arrow):
  - Title «حلقة الثلاثاء 17 نوفمبر» (`lessonFiles.lessonOf` + `dateText`). Intl may put «، » after the weekday («حلقة الثلاثاء، 17 نوفمبر»); browsers do, and LessonScreen.test.tsx:38 accepts both forms.
  - Subtitle «يوسف · 6:30 م – 7:15 م» (student name · time range).
  - While loading or after an error, the title is «صفحة الحلقة» (`lessonFiles.lessonPage`) and there is **no subtitle**.
  - The header has no teacher. The teacher appears only inside the report card: «المعلم/ة: أ. فاطمة» (`reportPage.teacher`).
- **Pull to refresh** re-reads the page.
- **Body, in order** (LessonBody.tsx:14-34):
  1. Recording section(s): «تسجيل الحلقة», or «الجزء 1», «الجزء 2» stacked, oldest first. The section is absent when the lesson has no visible recording. Covered by the recordings spec.
  2. «تقرير الحلقة» (`lessonFiles.report`): the full report body (grade, teacher, every line). It has its own skeleton and error.
  3. **«ملفات الحلقة · 5»** (`lessonFiles.header`, n = files + 1 for the PDF), as an inset group of rows (LessonFiles.tsx:14-33):
     - Row 1: «تقرير الحلقة (PDF)» (`lessonFiles.reportPdf`), subtitle «PDF» (`lessonFiles.media.pdf`). Tap opens the PDF outside. This row has no accessibility hint.
     - Then one row per file, title plus line.
       - Tap on **image/PDF** gets a fresh link and opens the phone's viewer or browser. Accessibility hint «افتح» (`lessonFiles.open`).
       - Tap on **audio** expands the in-app player **under the row**; a second tap collapses it. Hint «استمع» (`lessonFiles.listen`). See LessonFileRow.tsx:16-30.
     - Rows have no leading icon and no trailing chevron.
- **Voice-note player** (mobile-kit AudioPlayer.tsx:46-61, PlayerControls.tsx:19-52), a raised card:
  - Resume line «من حيث توقفت: 0:40» with the link «ابدأ من البداية» (`audioPlayer.resumeFrom`, `audioPlayer.startOver`). It shows only once a saved stop exists and playback has a position.
  - Seek bar with «0:40 … 1:12» under it. The total is «—» until the length is known.
  - Controls are **icon buttons**: back-10 (icon + small «10») · a filled play/pause · forward-10. Their words are accessibility labels only: «رجوع 10 ثوانٍ» · «تشغيل»/«إيقاف مؤقت» · «تقديم 10 ثوانٍ» (`audioPlayer.*`).
  - «السرعة» pills 1× · 1.5× · 2×.
  - The stop is saved per file id on this device.

### S2. Lesson panel, web (`LessonPanel`, web-kit/src/portal/recordings/LessonPanel.tsx:19-55)
A raised, bordered card inside the «التسجيلات» tab, above the month list:
1. h2 «حلقة الثلاثاء، 17 نوفمبر» (same words and comma rule as S1), then «يوسف · مع أ. فاطمة · 6:30 م – 7:15 م» (lesson-words.ts:23-30, `portal.withTeacher`). The «مع …» part is left out when `teacher` is null.
2. One player for the recording, plus «أجزاء التسجيل» chips («الجزء 1 · 31 دقيقة») when it was recorded in parts (`lessonFiles.partsLabel`, `lessonFiles.partOption`). Absent when the lesson has no visible recording (LessonParts.tsx:18).
3. «من تقرير هذه الحلقة» (`lessonFiles.reportSummary`): the first 5 filled lines (ReportSummary.tsx:6-25). Then the button «اقرأ التقرير كاملًا» (`lessonFiles.openReport`), which goes to `/report/$reportId` (family-web ChildBody.tsx:38-43).
4. **«ملفات الحلقة · 5»** list (PortalFileList.tsx:23-60). Items are stacked text blocks, not bordered rows:
   - Report item: «تقرير الحلقة (PDF)» + small secondary button «افتح ملف PDF» (`portal.openPdf`; FileButtons.tsx:14-16).
   - Each file: title, line, then:
     - audio: the full voice player, **always open inline**. It is a bordered card inside the lesson card (label `lessonFiles.kinds.voice_note`).
     - image/PDF: small secondary button «افتح» (`lessonFiles.open`). It opens in a new tab created inside the click (portal/open-file.ts:6-18).
- **Web player** (web AudioPlayer.tsx:25-49, PlayerButtons.tsx:25-47):
  - Same resume line and seek bar as the phone.
  - Controls: a **text** button «تشغيل»/«إيقاف مؤقت» between two ghost buttons, a chevron with «10» (`aria-label` «رجوع 10 ثوانٍ» / «تقديم 10 ثوانٍ»).
  - «السرعة» radio chips 1× · 1.5× · 2×.
  - The stop is saved per id in this browser.

### Web vs phone: what differs today

| Topic | Web | Phone |
|---|---|---|
| Report on the page | 5-line summary + «اقرأ التقرير كاملًا» | Full report body |
| Teacher name | In the line under the title: «مع أ. فاطمة» | Only inside the report card: «المعلم/ة: أ. فاطمة» |
| Recording parts | One player + part chips | One stacked player per part |
| Voice note | Player always open | Row; tap to expand the player |
| Player controls | Text play/pause button, chevron «10» buttons, radio chips | Icon buttons (words are accessibility labels), pills |
| File item | Title + line + its own button | Whole row is the tap target |
| Long title or line | Wraps | One line each, cut with «…» |
| Report-PDF action word | «افتح ملف PDF» (`portal.openPdf`) | Row titled «تقرير الحلقة (PDF)» |
| Open failed | Files: alert under the list. Report PDF: line above its button | One line under the group for both |
| Lesson page | Panel above the list, no URL | Own pushed screen |
| Offline | No disk cache: page error | Page from disk cache; links fail |

### States (draw each)

| State | Web | Phone |
|---|---|---|
| Loading page | 2 shimmering skeleton rows in the card (`LoadState rows={2}`) | `SkeletonCard` (opacity pulse). Header «صفحة الحلقة», no subtitle |
| Page error / 404 | «تعذّر تحميل البيانات.» + «أعد المحاولة» (`portal.loadFailed`, `portal.retry`; web-kit/src/portal/LoadState.tsx:25-35) | `ErrorState`: glyph + «حدثت مشكلة، حاول مرة أخرى» + «حاول مرة أخرى» (`common.error`, `mobile.retry`). Header stays «صفحة الحلقة». Cached data stays on screen offline |
| Report block loading / failed | The summary is **absent** (no skeleton, no error); «اقرأ التقرير كاملًا» still shows | Skeleton, then `ErrorState` inside «تقرير الحلقة»; the files below still work |
| Voice-note link loading | 1 skeleton row in place of the player | `SkeletonCard` under the row |
| Voice-note link failed | «تعذّر تحميل البيانات.» + «أعد المحاولة» in place of the player | Full `ErrorState` (glyph, `common.error`, «حاول مرة أخرى») under the row |
| Opening a file failed | Files: alert «تعذّر فتح الملف، أعد المحاولة.» (`lessonFiles.fileFailed`) under the list, kept until the next open. Report PDF: `portal.fileFailed` (same words) above its button. The blank tab closes | `ErrorLine` with `lessonFiles.fileFailed` under the group, for the PDF row and the files |
| Pop-ups blocked (web) | The portal tab itself goes to the file (open-file.ts:13) | n/a |
| File hidden or removed after the page loaded | Open fails as above; a voice note shows the link error. Reloading drops the item | Same; pull to refresh drops the row |
| Offline | No disk cache: page error state | Page and report from the disk cache. Players show `ErrorState` and taps show the open error, because links are never cached |
| Audio failed | «تعذّر تشغيل التسجيل، أعد المحاولة.» (`audioPlayer.failed`; says «التسجيل» even for a voice note) under the controls | Same |
| Length not known yet | Seek total «—» | Same |
| Report PDF not ready | Cannot happen here. A report counts as sent only with `pdf_status = 'ready'` (portal-reports.repo.ts:137), so the PDF item always opens | Same |
| Opening in progress | «افتح ملف PDF» disabled while pending (FileButtons.tsx:39); «افتح» has no busy state | No busy state on rows |
| **No staff files** | List shows only the report PDF: «ملفات الحلقة · 1» | Same. `lessonFiles.noFiles` is used by staff screens only (staff-web LessonFilesSection, staff-mobile LessonFilesBody) |
| **No recording on this lesson** | Recording block absent: title, line, summary, button, files. Unreachable today; needed for the §1 recommended entry | Recording section absent: report, then files |
| No recordings at all | Recordings tab empty state: «لا توجد تسجيلات بعد» + `lessonFiles.emptyMeet` / `emptyRoom`. The files are unreachable (§1 gap) | Same (RecordingsList.tsx:13-23) |
| HEIC image | Opens in a tab; most non-Safari browsers download it instead of showing it | Depends on the phone viewer |

## 3. Layout: web 1280 vs phone 390
- **Web 1280** (FamilyShell.tsx:15, :29):
  - From 900 px (`--breakpoint-shell: 56.25rem`, index.css:44) the shell has a 14 rem side rail.
  - Content is one centred column, `max-w-[720px]`, 16 px gutters.
  - The lesson card and the file list are a single column inside it. Buttons are start-aligned (`justify-self-start`).
  - Each voice note is a bordered player card nested in the lesson card.
  - A two-pane «list | lesson» layout would need a wider main column («not in code»; owner rule: short pages, compact rows).
- **Web 390**:
  - Bottom tab bar, the same column at full width minus 16 px gutters.
  - Rows and file titles wrap (RecordingRowButton is a wrapping grid).
  - The player's speed chips sit on their own line under the buttons.
- **Phone app 390**:
  - Pushed screen, no tab bar under it.
  - Inset group rows (`ListRow`, 56 pt minimum). Title and line are one line each, cut with «…», so a long `title` (up to 120 characters) is cut.
  - The expanded voice player sits between rows inside the group.
  - Pull to refresh.
- **RTL.** Use logical start/end only. Times and sizes are LTR islands (`Ltr`/`ltr()`), e.g. «0:40», «1.1».

## 4. Motion (what each move tells the user)
Use what exists and add nothing for decoration. Items marked «not in code» are proposals.
- **Arrive.**
  - Web: the tab panel fades up 200 ms when the tab changes (`animate-fade-up`; family-web ChildBody.tsx:54-55; motion.css:5).
  - App: the pushed lesson screen slides in from the reading end (root/screen-animation.ts:16).
  - Staggered card rise with `Rise` (ui/Rise.tsx:41) exists but is used only on the child picker. On the lesson page it is «not in code».
- **Press.**
  - App recording cards (`PressCard`): lapis wash at once, scale to 98 % on a spring (ui/PressCard.tsx:18-33).
  - App file rows (`ListRow`): a `sunk` fill at 85 % opacity while pressed, no scale.
  - Web: recording row `hover:bg-sunk`; the picked row is `aria-pressed` with a lapis wash. File items use the standard button press.
- **Swap lesson (web).** Picking another lesson re-mounts the panel (`key={picked}`). Today it shows 2 skeleton rows and then the content, with no fade and no scroll. The panel sits **above** the list and the click happens lower down. A short fade-up plus scrolling the panel into view would show what changed («not in code»).
- **Voice note expand/collapse (app).** Height and opacity in about 180 ms (`pop-in` feel), so it reads as "this row opened". Today it appears with no motion: «not in code».
- **Progress.**
  - The seek bar fill grows with playback.
  - While links load: shimmer on web (`animate-shimmer` 1.2 s), an opacity pulse on the phone's `SkeletonCard`.
  - An «opening…» pulse on «افتح» or a file row while the link is minted would fill the busy gap («not in code»).
- **Reduce motion.** Web `prefers-reduced-motion` turns all of it off (index.css:129). The app keeps the wash only, with no scale, rise or pulse.

## 5. Not in code (draw only if the owner asks; several are the RecX boards' «خادم» items)
- **Entry to the files without a recording**: from a «حضرها» row, from the report page, or from a push or alert. See the §1 gap; this is the most useful addition.
- A web lesson page with its own URL and «العودة إلى التسجيلات» (board RecXWebFamilyLesson).
- **In-app viewer** for images (lightbox, pinch/zoom) and for PDFs (page thumbnails, page count «صفحتان», first-page preview).
  - The only PDF page renderer is the staff chat inbox's (apps/api/src/modules/messaging/inbox/files/pdf/pdf-preview.service.ts, staff `inbox.*` permissions, per chat message). The portal cannot reuse it as is.
- A separate «تنزيل» (download) button. Today «افتح» opens the signed link and the browser decides.
- «كل الملفات» (RecXFamilyPlayer), grouping by kind («ملفات الواجب»), sorting or filters.
- The added date on a family row. `created_at` is in the data and `lessonFiles.addedAt` «أُضيف {when}» exists, but no family UI renders them.
- Voice-note length on the row («تسجيل صوتي · 1:12» on the boards): the schema has size only; the length is known after the player loads.
- A compact voice-note row with a «استمع» button that opens the player (RecXWebFamilyRecordings). Web code shows the full player, always open.
- A media icon or thumbnail on each file row.
- «جديد» marker or a count for new files, and a push when staff add a file after the report was sent.
- Report attachments («مرفقات المعلم/ة») on the family **app** report screen.
- Board content with no field in `portalLessonAssetsSchema` or no code:
  - Lesson header chips «حضر الحلقة» / «حضر في الموعد» and «في غرفة الأكاديمية · 45 دقيقة» (RecXFamilyLesson, RecXWebFamilyLesson). The page has no outcome or venue.
  - «بتوقيتك (الرياض)» after the time (RecXWebFamilyLesson). The code writes the student's zone with no zone name.
  - A file subtitle such as «شاركه المعلم/ة قبل الحلقة» (RecXLessonFiles). There is no note field.
  - Report-PDF row with pages and size («صفحتان · PDF · 180 كيلوبايت»). The phone row's subtitle is «PDF» only, and the web item shows the title and its button.
  - The phone boards' separate «ملفات الحلقة» screen (RecXLessonFiles), with sections «تسجيل الحلقة» / «تقرير الحلقة» / «من المعلم/ة · 5», reached from a summary card («6 ملفات» plus the kinds) on the lesson page (RecXFamilyLesson). The code has one flat inline list on the lesson page.
  - The phone board's report **summary** with «اقرأ التقرير كاملًا» (RecXFamilyLesson, RecXFamilyPlayer). Phone code shows the full report inline.
  - The web board's button «افتح صفحة الحلقة: التقرير كاملًا وملفاته» (RecXWebFamilyRecordings). The code's button is «اقرأ التقرير كاملًا».
  - The web board's order: full report → recording → files (RecXWebFamilyLesson). The code's order is recording → 5-line summary → files.
- Any family upload, comment or reply on a file. The family is read-only; uploads are staff-only (`recordings.manage`).

Boards must show only the screen: no «خادم» or developer chips (owner rule). Keep this list in the plan, not on a board.

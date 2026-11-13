# 48 — Teacher «اليوم» / «الطلاب» / «جدولي» refine (web + mobile)

Owner 2026-11-13: «enhance and refine the today/students/schedule screens, remove useless content, make it more reactive and interactive».

Spec from the read-only design workflow wf_34904d61-61e (6 screens × audit → skeptic → design, live-update map, integrate, completeness critic; 21 gaps checked, 20 folded in). Checked against origin/develop 8537d7286 plus docs/47 (5b2e63668). The student file itself is docs/47; this doc owns today, the students LIST and the schedule.

## Owner calls (defaults applied 2026-11-13; the owner may override)

1. Home «طلابي» tab (docs/46 C1, 2026-11-11): after this work /teacher/students renders the identical TeacherBoard, so the home tab is a duplicate. Recommended default: keep it as the home's first tab per C1. If you say drop it, the home becomes the hero + pending reports + «اليوم» with no tabs: one TABS entry and the ?tab default, plus edits to the specs that click /teacher tabs.
2. Home «الأسبوع» tab:
   - What it does today: R-TCH-03 (docs/03-requirements.md:87) promises the web dashboard «today / this week». docs/46 C1 (:135-141) assumes the home tabs. TeacherDashboard.test.tsx:105-112 pins a rolling «next 7 days» on purpose, Fridays included.
   - What changes: «جدولي» runs Saturday to Friday. On a Thursday or Friday the teacher sees only 1–2 days ahead before pressing «الأسبوع القادم», and on a phone she sees one day at a time.
   - Recommended default: remove the tab. «اليوم» shows the next lesson within two weeks with «افتح جدولي», and «جدولي» has the arrows. Reword R-TCH-03 to «today + «جدولي»». If you keep it, the web-schedule PR leaves the tab, LessonDayList and the week-tab e2e alone.
3. Lessons on a teacher's fixed Meet link:
   - On a lesson that has its own link and is not platform, the family never gets the classroom link (roomFor, apps/api/src/modules/messaging/reminders/plan/reminders.links.ts:29). Yet web offers the classroom, «افتح الحلقة الآن» and «انسخ رابط الطالب» there, and the mobile «جدولي» sheet offers the classroom join.
   - Recommended default: hide those three on such lessons on web and in the mobile sheet; her link stays as «ادخل الحلقة».
   - A static lesson with NO link of its own keeps today's behaviour (classroom, plus her profile link as a secondary on web). Whether the family gets the classroom there depends on LiveKit being configured and the lesson_join_link template being approved, and no client can see either. If you want both apps to follow roomFor exactly, the API can add one LessonView flag computed by roomFor.
4. Pre-start «اعتذر مسبقًا» on the teacher's web card: it records a STUDENT cancel that can be charged under late_cancel_hours, sitting next to her free «إلغاء الحلقة» (docs/46 §5). Mobile never offered it. Recommended default: remove it for teachers; admins and assistants record a family's excuse. The «تسجيل الحضور» outcomes after the start stay.
5. Cancel message and D3:
   - D3 says the screen suggests «اقترح موعدًا آخر» after a teacher cancel. But the API refuses a proposal on a cancelled lesson (lesson-proposals.service.ts:28), so today's «أُلغيت الحلقة. اقترح موعدًا آخر إن أمكن.» points at a dead end.
   - Recommended default: offer «اقترح موعدًا آخر» inside the cancel dialog/form before she confirms, only when no proposal is already pending (409 proposal_pending otherwise), and make the message just «أُلغيت الحلقة.»

## Summary

One spec for the teacher's «اليوم», «الطلاب» and «جدولي» screens on web and mobile. It is based on origin/develop 8537d7286 plus docs/47 (5b2e63668) in the wtp checkout. Nothing was edited or run.

**Critic pass.** All 21 gaps were checked in code. 20 hold and are folded in. One part of gap 4 was wrong: the JoinLink assertion is at teacher-week-history.spec.ts:61, not :59, and :61 was already listed. The real fix there is the expected href. The hero links to the lesson's own seeded link (e2e/support/core/schedule.ts:108-109), not LINK.

The folds that change the design:
- **Join ends at ends_at.** Join leads only until ends_at. The join window closes at ends_at + join_closes_after_min, which defaults to 120 (packages/schedule/src/classroom/join-window.ts:46-58). After the end, the report leads and join becomes a peer.
- **wayIn is what a client can see of roomFor.** The classroom controls hide only on a non-platform lesson that has its own link. A static lesson with no link of its own keeps today's behaviour, because the livekit and joinOk flags reach no client payload (owner Q3).
- **«بقية اليوم».** It holds only today's lessons that are not closed and not ended, with the hero excluded. Web now filters closed lessons too, as mobile lessonsOn already does. A due report shows once, in the pending block, which excludes the hero.
- **Lighter refresh.**
  - Web teacher actions no longer invalidate ['teachers','me'].
  - The mobile push map is scoped to the teacher tree and drops the two admin-only kinds.
  - Mobile students are not polled.
  - Mobile «اليوم» reads one padded 14-day query.
- **One report button in the mobile sheet.** DetailsStudents keeps it, and a tab-relative onReport sets where it goes.
- **PR1 is pure.** It adds the core without rewiring the mobile card.
- **The home «الأسبوع» tab.** Removing it is now its own owner question (R-TCH-03 says «this week»). The removal moves to the web-schedule PR, together with a shared e2e helper openMyLesson.

**The lesson model, used everywhere:**
- **Pure core.** packages/client-core/src/teaching/lessons/teacher-lesson-plan.ts holds:
  - reportStage: derived from students[].report.
  - teacherLessonState: the teacher's own word for a lesson.
  - joinPhase: live until ends_at, after, or off.
  - lessonPlan: one lead plus the other actions.
  - wayIn: room or link.
  - teacherCanPropose.
- **pickHero** moves next to it as pick-hero.ts.
- **Every surface follows the same pattern:**
  - A row shows time · names · the word, plus ONE lead action.
  - Tapping the row opens the full lesson: the web Drawer with TeacherLessonCard, or the mobile LessonDetailsSheet.
  - The hero shows the same lead, filled, plus «التفاصيل».

**Reactivity:**
- **Web:** a 30 s refetchInterval on the lessons and pending-reports queries only, with data-first consumers.
- **Mobile:**
  - a 30 s poll, gated on screen focus, on lessons and pending reports only
  - a push-kind → query-key map for the teacher tree
  - usePullRefresh
- **Both:**
  - «سأحضر» is optimistic.
  - Cancel is write-through.
  - Every clock-driven line comes from useNow, with no new useEffect.

**Removed as useless:**
- the home «الأسبوع» tab (owner Q2, default remove) and the «المواعيد المتاحة» tab, which moves to «جدولي»
- «بتوقيتك (city)» on every card
- the board caption
- on mobile: LiveSessions, PendingBanner, the per-lesson card stack, and the availability line on «جدولي»
- the «المعلم/ة» column and the conflict line on the teacher's week grid
- duplicate name, notice, confirm and report signals
- the web /teacher/students endpoint table with its filter dialog. That page now renders the same TeacherBoard, and rows open the docs/47 student file.

**Sequencing:**
1. PR1 is the shared core plus reactivity. It needs neither neighbour.
2. Then #711, the switches branch.
3. Then docs/47 PR1, the student file.
4. Then the web screen PRs (today, then schedule, then students), and mobile today, then mobile schedule.
5. Mobile students comes after docs/47 PR2.
6. Mobile «اقترح موعدًا آخر» is last and optional.

Five owner questions remain, each with a default.

## Build split (PR order)

- PR1 «teacher live core» (~28 files; needs neither neighbour and can merge first):
  - client-core teacher-lesson-plan.ts (reportStage, teacherLessonState, joinPhase, lessonPlan, wayIn, teacherCanPropose) and pick-hero.ts + tests.
  - Only mobile today-plan.ts re-imports pickHero, a pure move. Mobile TeacherLessonActions/TeacherLessonCard are NOT rewired; PR5 deletes them.
  - Web: TEACHER_REFRESH_MS on myLessonsQuery + pendingReportsQuery, with the data-first fixes in DashboardPanel, MyWeek Body and PendingReports.
  - patch-my-lesson.ts, optimistic use-teacher-confirm, write-through use-teacher-cancel. No ['teachers','me'] invalidation on web.
  - The LessonActions:43 and LessonReportLinks:19 clocks + clock tests.
  - Mobile:
    - queries.ts live flags on lessons and pending only
    - teacher-lesson-api.ts: optimistic confirm, write-through cancel that also invalidates ['teachers','me'], offline text
    - push-refresh.ts for the teacher tree + the listener line + tests
  - usePullRefresh on the 3 mobile screens.
  - i18n: cancelledOk, teacherBoard.offline.
- #711 (effort a), then docs/47 PR1 (effort b): merged by their owners.
- PR2 «web today» (~30 files; after #711 and docs/47 PR1):
  - the home ?tab, TodayHero, TodayPanel and split-today
  - TeacherLessonRow, Lead, Drawer, teacher-word
  - the TeacherLessonCard rework (wayIn, fallback peer) + Peers
  - the TeacherConfirm variant, TeacherCancelDialog propose with canPropose, the TeacherProposal Dialog
  - the LessonActions `teacher` prop + AdminButtons.tsx + the renamed hide-confirm test
  - compact PendingReports (studentId kept, except, no skeleton)
  - i18n, unit tests, the TeacherDashboard.test.tsx :120-141 rewrite
  - e2e: journey-2 and teacher-isolation via the hero, teacher-week-history :61-65, meeting-link-auto card → drawer
  The week tab stays in this PR.
- PR3 «web schedule» (~26 files):
  - ?week/?view, MyWeekHead, MyDayList, MyWeek on TeacherLessonDrawer
  - WeekGrid single + chipWord, the LessonChip `word` prop
  - removal of the home «الأسبوع» (owner Q2) and «المواعيد المتاحة» tabs, LessonDayList and weekLessons
  - TeacherDashboard.test.tsx :95-112 deleted
  - the openMyLesson e2e helper and the moves of journey-5, teacher-week-history :67-86, proposals, proposals-reject and meeting-link-auto
  - the R-TCH-03 and docs/46 C1 rewording
  - tests
- PR4 «web students» (~20 files; after docs/47 PR1):
  - TeacherStudents thin page, student-facts, board-rows sort+search
  - TeacherBoard head/search/row → file, board-columns + StudentCell
  - delete the endpoint table files and drawer/, and the teacher/index.ts TeacherLessonCard export
  - i18n; tests
- PR5 «mobile today» (~38 files including deletions; OTA-only, no native change):
  - the TeacherTodayScreen rewrite on one aheadWindow query
  - teacher/today/* (DueReports, TeacherHero, TeacherDayEnd, due-reports)
  - teacher/lessons/* (TeacherLessonRow, TeacherRowAction, teacher-word)
  - TeacherLessonSheet, TeacherLessonTools onDone, the lesson-actions barrel trim
  - LessonDetailsSheet onReport + DetailsStudents reportStage
  - AgendaLessonRow props (join boolean), HeroFrame, EndedFold rows, TodayHeader
  - day.ts aheadWindow
  - the LiveSessions/live-filter/card deletions
  - docs/46 C7
  - tests
- PR6 «mobile schedule» (~22 files; after PR5): the TeacherScheduleScreen rewrite, schedule/* (week-days, WeekStrip, WeekNav, ScheduleDayList), PeriodSwitcher exports, DetailsHead/DetailsAbout teacher variants, weekdayShort, delete useMyAvailability (queries.ts:44-48), the optional schedule report stack, tests.
- PR7 «mobile students» (~10 files; after docs/47 PR2): student-list.ts, useStudentLists (no poll; countByKind over both lists), TeacherStudentsScreen, StudentRow, i18n, tests.
- PR8 «mobile propose» (optional, last, ~10 files):
  - teacherLessonPaths.propose and useTeacherPropose (lessonProposalRequestSchema; ERROR_TEXT date_in_past and proposal_pending)
  - TeacherProposeForm (DatePickerField + TimePickerField on her clock + note)
  - use-teacher-acts form: 'cancel'|'propose'|null, with canPropose = teacherCanPropose (open and no pending proposal, the same rule as web)
  - TeacherLessonTools: a FORMS lookup, the pending line «اقترحت {when}، بانتظار رد الإدارة», and «اقترح موعدًا آخر» inside the cancel form when canPropose
  - tests
- Every PR:
  - rules 1–4: 150 lines, ≤3 params, strict TS, tests next to code
  - lookup maps over if-chains, no new useEffect, MSA strings in ar.json + en.json
  - the design-review stage
  - `pnpm turbo lint typecheck test` + e2e in GitHub Actions only, never locally (owner rule)

## Delivery waves (cloud routines; the owner session merges)

1. Now: PR1 «teacher live core» (base develop, which already has #711). #712 (docs/47 PR 1) is still open, so on a GitHub conflict, merge origin/develop.
2. After PR1 and #712 merge, in parallel: PR2 web today, PR4 web students and PR5 mobile today. They only clash in ar/en.json.
3. Then PR3 web schedule (after PR2), PR6 mobile schedule (after PR5) and docs/47 PR 2 (after PR4 + PR5; it sets PENDING_REPORTS_HREF and adds the paused list as a board segment).
4. Last: PR7 mobile students (after docs/47 PR 2) and the optional PR8 mobile propose.

## Cross-screen model

- ONE pure lesson model (PR1, packages/client-core/src/teaching/lessons/teacher-lesson-plan.ts, about 110 lines + test, exported from lessons/index.ts):
  - reportStage(lesson, now) returns 'write' | 'resume' | 'window' | 'done' | null.
    - null while reportBlock holds: before the start, or a cancelled or moved lesson.
    - Otherwise it aggregates students[].report (packages/schedule/src/lessons/views.ts:27-32) through an ordered table:
      - a missing or undefined report → write
      - a draft → resume
      - submitted with reportSendState === 'window' (packages/client-core/src/teaching/reports/send-state.ts:33) → window
      - else done
    - It replaces mobile reportAction (apps/mobile/src/teacher/lib/day.ts:28-45, built on the pending list, which has no edit_until: packages/shared/src/reports/views.ts:128-134) and teacherReport (apps/mobile/src/calendar/details/DetailsStudents.tsx:25-30).
  - teacherLessonState(lesson, now) returns 'awaiting' | 'confirmed' | 'running' | 'write' | 'resume' | 'window' | 'status' from an ordered [state, holds][] .find.
    - Tests in order: teacherCanConfirm → teacherCanAct && teacherConfirmed → open && started && not ended → reportStage.
    - Reuses packages/client-core/src/teaching/lessons/teacher-actions.ts:18-40.
  - joinPhase(lesson, now, win) returns 'live' | 'after' | 'off':
    - live = isOpenLesson && canJoinNow && now < ends_at
    - after = isOpenLesson && canJoinNow && now >= ends_at
    - else off
    The ends_at cut is needed because the window stays open until ends_at + join_closes_after_min, which defaults to 120 (packages/schedule/src/classroom/join-window.ts:46-58; packages/shared/src/settings/exports.test.ts:66). Without it, join would lead for 2 h after the lesson while the word says «اكتب التقرير». Today's mobile cardPlan has this flaw (apps/mobile/src/teacher/components/TeacherLessonActions.tsx:47-58).
  - lessonPlan({ join, wayIn, canConfirm, canCancel, stage }) returns { lead, peers }. It is the mobile cardPlan idea (TeacherLessonActions.tsx:47-66) rebuilt on these inputs.
    - Lead order: join (phase live) > confirm > report (write | resume) > null.
    - Peers, in reading order:
      - 'join' when the phase is after, or when wayIn is 'link' on an open lesson that is not live (her fixed link stays one tap away)
      - 'confirm' when it is not the lead
      - 'report' when the stage is not null and it is not the lead
      - 'cancel' when she can cancel
    - PR1 does NOT rewire mobile TeacherLessonActions/TeacherLessonCard. Their inputs differ: the pending-list report, joinLive in room mode only, and a link boolean. That card and its tests (TeacherLessonActions.test.ts, TeacherLessonCard.buttons.test.tsx) stay unchanged until PR5 deletes them.
  - wayIn({ platform, ownLink }) returns platform || !ownLink ? 'room' : 'link', with ownLink = lesson.meeting_link ONLY (never me.meeting_link).
    - This is the part of roomFor (apps/api/src/modules/messaging/reminders/plan/reminders.links.ts:29) a client can know. Platform lessons and lessons with their own link match it exactly.
    - For a static lesson without its own link, roomFor also needs ctx.livekit and ctx.joinOk. No client payload carries them (PublicSettings via apps/web/src/lib/settings/public-config.ts; LessonView has no such field). That case keeps today's behaviour, owner Q3.
    - Lessons normally carry the teacher's link, copied at booking and generation (apps/api/src/modules/teaching/booking/core/booking.mapper.ts:22,80, issue B8), so the case is rare.
  - teacherCanPropose(lesson) = isOpenLesson(status) && !pending_proposal. This is the API rule: 409 on a closed lesson or proposal_pending (lesson-proposals.service.ts:28, apps/web/src/features/teaching/teacher/proposals/TeacherProposal.tsx:26-31). The web card, the web cancel dialog and mobile PR8 all use it.
  - packages/client-core/src/teaching/lessons/pick-hero.ts:
    - pickHero is moved from apps/mobile/src/today/lib/today-plan.ts:28-47 (a pure move: today-plan.ts re-imports it with no behaviour change). It is generic over Pick<LessonView,'status'|'starts_at'|'ends_at'>.
    - nextOpenLesson(lessons, now) returns the first open lesson starting after now.
- Filled-button rule (docs/07 §6, at most one primary per sheet or section):
  - The lead is FILLED on the hero, the web drawer card and the mobile sheet.
  - On list rows the lead is drawn secondary, except a live join («ادخل الحلقة», phase live), which is filled. A day with five unconfirmed lessons therefore never shows five green buttons.
- State word lookup, one per app: web apps/web/src/features/teaching/teacher/lessons/teacher-word.ts and mobile apps/mobile/src/teacher/lessons/teacher-word.ts.
  - TEACHER_WORD: Record<state, { label, tone, glyph }>. The glyph is there so every chip shows a nuqta AND the word (docs/07-design-system.md:27).
    - awaiting: «بانتظار تأكيدك», tone act
    - confirmed: teacherBoard.confirmedChip «حضورك مؤكَّد», tone ok
    - running: today.running «جارية الآن», tone ok
    - write: reports.open, tone act
    - resume: reports.resume, tone act
    - window: the EXISTING reports.familySend.sendsIn «سيُرسل إلى الأسرة بعد {when}» (docs/46 B5 copy, already produced by packages/client-core/src/teaching/reports/send-lines.ts:28-29) with counted minutes (minutesLeft, send-state.ts:38), tone neutral
    - status: the lesson-status chip, which covers excused, late, no_show and completed
  - Rows, chips and the hero read the same word in both apps.
- Web lesson surfaces, owned by web-today and consumed by web-schedule:
  - TeacherLessonLead (NEW) uses a LEAD lookup:
    - join → StaffJoinButton (room) or <a href> t.teacherDash.join «ادخل الحلقة» (link)
    - confirm → TeacherConfirm
    - report → ReportLink labelled by stage
  - TeacherLessonRow (NEW) is one compact line: time in her zone · names · «عند الطالب …» · word chip · trial/makeup/unpaid tags · lead.
    - The row button opens the drawer. Its label is the EXISTING lessons.sheet.openRow «تفاصيل الحلقة — {names}».
    - It is used by the home «اليوم» panel and the phone «جدولي» day list.
  - TodayHero is the hero variant: a <section> labelled by its lead line («جارية الآن» / «الحلقة التالية»).
  - TeacherLessonDrawer (NEW) is extracted from apps/web/src/features/teaching/teacher/lessons/MyWeek.tsx:65-80.
    - The open lesson is found by id in the UNFILTERED query data (MyWeek.tsx:39), so polls update it in place and a moved lesson shows its closed state.
    - It holds TeacherLessonCard with every action and a role=status notice line. The Toast shows only while no drawer is open.
  - There is no per-card «⋯» menu. «انسخ رابط الطالب» is the only item in the card's MoreMenu (apps/web/src/components/ui/overlay/more-menu.tsx), in room mode only.
- Mobile lesson surfaces, owned by mobile-today and consumed by mobile-schedule:
  - TeacherLessonRow (NEW, apps/mobile/src/teacher/lessons/TeacherLessonRow.tsx) is AgendaLessonRow (apps/mobile/src/calendar/agenda/AgendaLessonRow.tsx) with three optional props:
    - meta: student clocks
    - chip: the TEACHER_WORD chip
    - join?: boolean, default true, meaning JoinAround as today. The teacher row passes false and draws its own lead through actions={<TeacherRowAction/>}.
    This matters because JoinAround's live join (AgendaLessonRow.tsx:87-89; apps/mobile/src/classroom/links/JoinClassroomButton.tsx:63-71) stays live until ends_at + 120 min. JoinClassroomButton itself is unchanged; its only="open" prop already exists (:21,40).
  - TeacherRowAction (NEW, a LEAD Record lookup) handles the join lead:
    - JoinClassroomButton only="open" in room mode
    - Linking.openURL(lesson.meeting_link) in link mode
  - TeacherLessonSheet (NEW) is LessonDetailsSheet role='teacher'.
    - Its actions: JoinClassroomButton only when wayIn==='room', and TeacherLessonTools (confirm/cancel, plus propose in PR8).
    - It has NO report button of its own. The report button is the one DetailsStudents already draws for role 'teacher' (apps/mobile/src/calendar/details/DetailsStudents.tsx:45-67):
      - its label comes from reportStage, replacing teacherReport in place (details-text.ts is 137/150, so nothing moves there)
      - LessonDetailsSheet gains an optional onReport?: (lessonId) => void, passed to DetailsStudents
      - onReport keeps the target inside the current tab: «اليوم» → /teacher/today/report/:id; «جدولي» → /teacher/reports/:id, or the optional schedule stack
      - without onReport, today's reportHref + pushInTab (details-text.ts:132-137) stays the default for other callers
  - TeacherHero (NEW) is HeroFrame, extracted verbatim from apps/mobile/src/today/hero/HeroCard.tsx:33-63. It shows the lead filled, one outlined peer and «التفاصيل».
  - The same row and sheet serve «اليوم» and «جدولي».
- Day rows rule, both apps:
  - «بقية اليوم» = today's lessons that are NOT closed and NOT ended, with the hero excluded.
    - isClosedLesson drops cancelled and moved lessons; excused stays because its report is due.
    - Web lessonsOnDay (apps/web/src/features/teaching/schedule/lesson/lessons.ts:65-69) keeps closed lessons, unlike mobile lessonsOn (apps/mobile/src/teacher/lib/day.ts:22-26), so the web split filters isClosedLesson itself.
  - Ended lessons go to the «انتهت n حلقات اليوم» fold (today.endedFold), muted.
  - Due reports live only in the pending block. The hero excludes its own lesson there. So one report shows once, never in a row, the hero and the block together.
  - The «اليوم n» count = today's not-closed, not-ended lessons, hero included.
  - «Empty» means no lessons today at all. Then show «لا توجد حلقات اليوم» + the next-lesson pointer.
  - When lessons exist but nothing is left besides the hero and nothing ended, show one line «لا توجد حلقات أخرى اليوم». When everything ended, show today.quietTitle «انتهت حلقات اليوم» + the pointer.
- Next-lesson pointer:
  - nextOpenLesson over a window of about 14 days ahead, stable for the day.
  - Web uses the board window it already loads (apps/web/src/features/teaching/teacher/TeacherDashboard.tsx:57).
  - Mobile uses aheadWindow(date) = { from: dayWindow(date).from, to: from + 15 days } in apps/mobile/src/teacher/lib/day.ts.
    - It keeps dayWindow's padded, tz-less −14 h start, so lessonsOn still finds every lesson of the viewer's day.
    - It stays under the 31-day API cap.
    - It is the ONLY lessons query on mobile «اليوم»: today's rows are lessonsOn(ahead.data, today, tz). The separate dayWindow query goes.
  - Text: «حلقتك القادمة: {when} · {names}», or «لا توجد حلقات في الأسبوعين القادمين», plus the action «افتح جدولي».
- Pending-reports block:
  - Title t.reports.pending «تقارير لم تُكتب بعد» · n, oldest first, 3 rows.
  - Overflow:
    - Web: a native <details><summary>«عرض الباقي (n)»</summary>.
    - Mobile: one row «عرض الباقي (n)» pushing PENDING_REPORTS_HREF. It is '/teacher/reports' (today's pending pill) until docs/47 PR2 changes this one constant to '/teacher/reports/pending'.
  - Web PendingReports keeps docs/47 PR1's props { tz; studentId? } (docs/47-teacher-student-file.md:264) and adds except?: string, the hero's lesson id. Mobile due-reports skips the hero the same way.
  - No skeleton: it renders nothing while loading, as today (PendingReports.tsx:17-18). The block is usually empty, and docs/47 renders it inside every student file (docs/47:250).
  - Error + retry only when nothing is cached.
  - Each row opens that lesson's report form: web /teacher/report/$lessonId, mobile /teacher/today/report/:id.
- Students list model, the same on both apps (docs/46 D4):
  - Segments «مشترك n · تجريبي n · الكل n», default «الكل»; docs/47 PR2 may add «موقوفون مؤقتًا».
  - Counted and split with countByKind / boardStudents over ONE list (packages/shared/src/people/students/student-lists.ts:36-48; board-students.ts:9-17). «مشترك» is therefore active only, and pending_renewal and expired show under «الكل» with their chips.
    - Mobile concatenates the two ?kind lists first. ?kind=subscribed returns active + pending_renewal + expired (packages/shared/src/people/schemas/teacher-students.ts:14-17), so pills keyed on ?kind would count different students than the web.
  - Soonest next lesson first, no lesson last, ties by Arabic name.
  - A quiet facts line: program · level · age through the plural teacherStudents.ageYears.
  - A status chip for every status except active.
  - One tap opens the student file: web /teacher/students/$studentId (docs/47:109), mobile /teacher/reports/student/:id (docs/47:110).
- Load-state order on every teacher screen:
  - Data first, dimmed with aria-busy while isPlaceholderData.
  - Else an error with retry only when nothing is cached, using t.teacherStudents.retry «حاول مرة أخرى».
  - Else a skeleton.
  - Error codes go through a lookup map { teacher_not_linked: { text: notLinked, retry: false } } with the fallback { loadError, retry: true }, replacing the ternary at TeacherDashboard.tsx:42.
- Teacher lesson mutations, one hook pair per app:
  - Patch scope is ONLY the [...lessons,'mine'] prefix, because other keys live under ['lessons'], for example docs/47:257's teacher-student head.
  - Web: patch-my-lesson.ts (setQueriesData, plus snapshot and restore).
  - Mobile: the existing patchCached (apps/mobile/src/core/lib/query/paging.ts:51).
  - «سأحضر» is optimistic: onMutate patches, onError restores with teacherActionError.
  - Cancel is write-through: on success the returned LessonView replaces the row.
  - Both invalidate ['lessons'] onSettled, as today.
  - Web adds NOTHING under ['teachers','me']:
    - confirm changes nothing there
    - the board's next and last lessons come from the lessons window
    - the facts (program · level · age) do not change
    - teacherMeQuery has retry:false (apps/web/src/features/teaching/teacher/api.ts:14-18) and TeacherDashboard.tsx:41-44 is isError-first, so a refetch failure would blank the home
  - Mobile cancel ALSO invalidates pathKey('/teachers/me'). pathKey splits on '/' only, so that prefix ['teachers','me'] covers ['teachers','me','students?kind=…'] and next_lesson_at stays fresh. Mobile retries 5xx (apps/mobile/src/core/lib/query/query-client.ts:16,51).

## Reactivity plan

- WEB POLL (PR1): apps/web/src/features/teaching/teacher/api.ts exports TEACHER_REFRESH_MS = 30_000. Two queries get it:
  - myLessonsQuery (api.ts:21-28)
  - pendingReportsQuery (apps/web/src/features/reporting/reports/api.ts:42-45)
  There is no document.hasFocus gate:
  - TanStack's default refetchIntervalInBackground=false already pauses it on a hidden tab, and a visible side-by-side window keeps updating. This is the family portal pattern (apps/web/src/features/people/portal/api.ts:9,20).
  - The pending poll also runs inside a docs/47 student file. It is the same key and one request.
- teacherMeQuery is NEITHER polled NOR invalidated by teacher actions:
  - It is shared with the inbox ThreadPane (apps/web/src/features/messaging/inbox/threads/pane/ThreadPane.tsx:62).
  - It has retry:false (api.ts:17).
  - It feeds isError-first screens (TeacherDashboard.tsx:41-44; MyReports.tsx:32-34).
  A reassignment arrives on the visibility refetch.
- DATA-FIRST before the poll ships (PR1, same commit). One failed 30 s poll must never blank a good screen. Consumers checked by grep:
  - DashboardPanel.tsx:58: isError is checked first.
  - MyWeek.tsx:88: isError is checked first.
  - PendingReports.tsx:17-18: hides on error.
  All three become data → error+retry (only when no data) → skeleton. PendingReports renders nothing while loading.
- WEB CLOCKS (PR1, also fixes admin):
  - apps/web/src/features/teaching/schedule/lesson/LessonActions.tsx:43 drops the frozen useState(() => Date.now()) and uses the useNow already read at :58.
  - apps/web/src/features/reporting/reports/history/LessonReportLinks.tsx:19 swaps useState(() => new Date()) for useNow().
  The outcomes and the report link then appear by themselves at the start minute.
- WEB MUTATIONS (PR1):
  - use-teacher-confirm.ts:
    - onMutate: cancelQueries + snapshot + patchMyLesson teacher_confirmed_at=now
    - onError: restore
    - onSettled: invalidate LESSONS_KEY, as today
  - use-teacher-cancel.ts:
    - onSuccess: patchMyLesson with the returned LessonView
    - onSettled: the same LESSONS_KEY invalidation
  - No ['teachers','me'] invalidation.
  - Outcomes keep LessonActions' await-invalidate. They get no write-through, because it already awaits before onDone.
- MOBILE POLL (PR1): apps/mobile/src/teacher/lib/queries.ts.
  - useMyLessons(window, live = false) and usePendingReports(live = false) gain `refetchInterval: live ? TEACHER_REFRESH_MS : false`, with one constant TEACHER_REFRESH_MS = 30_000.
  - Screens pass live = useScreenFocused() (existing hook, apps/mobile/src/core/ui/connecting/use-screen-focus.ts:9; no new effect). «اليوم» and «جدولي» poll only while in front, and the AppState focusManager stops it in the background (query-client.ts:38-41).
  - useMyStudents is NOT polled. Each call reads every lesson of hers since 60 days ago with no upper bound, plus two student reads (apps/api/src/modules/people/teacher-students/teacher-students.service.ts:26-38), and the web refuses to poll the same endpoint. Students refresh through:
    - the pull
    - the teacher push map
    - the cancel invalidation
  - Mobile «اليوم» polls two GETs: the one aheadWindow lessons query and pending reports.
  - OPTIONAL in the same hooks: `enabled: live`, so a stale query refetches at once on tab return. Keep it only if the CI test of a false→true flip passes.
  - Cut: usePrefetchQuery of the next week.
- MOBILE PUSH MAP (PR1): NEW apps/mobile/src/core/push/push-refresh.ts, used ONLY for the teacher tree.
  - pushRefreshKeys(tree, kind) returns [] for any other tree or a null kind (pushKind can return null: apps/mobile/src/core/push/push-data.ts:8-11).
  - TEACHER_REFRESH: Partial<Record<PushKind, readonly QueryKey[]>>:
    - lesson_rescheduled, lesson_cancelled, course_paused, course_resumed → [pathKey('/lessons'), pathKey('/teachers/me')]
    - new_student → [pathKey('/teachers/me')]
  - lesson_needs_confirmation and report_submitted are left out. They go only to admins: reminders.job.ts:144-146 notifyAdmins, one push per lesson, and apps/api/src/modules/reporting/reports/submit/report-follow-up.ts:27. useNotificationHandling(tree) also runs in the admin, sales and assistant trees (useNotificationHandling.ts:39), where an unscoped map would refetch the all-teachers overview in bursts.
  - The received listener (useNotificationHandling.ts:50-60) gets one loop line: `for (const queryKey of pushRefreshKeys(tree, kind)) void client.invalidateQueries({ queryKey })`. The effect deps become [client, tree]. No new effect, no if-chain. notification-route.ts (150/150) is untouched.
- MOBILE MUTATIONS (PR1): apps/mobile/src/teacher/lesson-actions/teacher-lesson-api.ts.
  - useRefreshLessons (:31-34) stays ['lessons'].
  - useTeacherConfirm:
    - onMutate: cancelQueries + a getQueriesData snapshot + setQueriesData patchCached teacher_confirmed_at on [...pathKey('/lessons'),'mine']
    - onError: restore
    - the confirmedNow bridge stays
  - useTeacherCancel:
    - onSuccess: patchCached with the returned LessonView, so the row leaves before the refetch and a refused cancel never flashes
    - also invalidates pathKey('/teachers/me'), for the students' next_lesson_at
  - codeOf maps isNetworkError to 'network' → t.teacherBoard.offline.
- PULL SPINNERS (PR1, one line each): usePullRefresh (apps/mobile/src/core/lib/query/pull-refresh.ts:8) replaces `refreshing={x.isRefetching}` at:
  - TeacherTodayScreen.tsx:89
  - TeacherScheduleScreen.tsx:75
  - TeacherStudentsScreen.tsx:63
  Otherwise every poll or push refetch would spin the spinner.
- DERIVED, NO FETCH, NO NEW useEffect: all of the following come from useNow (60 s and on visibility or foreground; web lib/time/use-now.ts:8, mobile core/lib/time/use-now.ts:11):
  - the hero line «بعد n دقيقة» → «جارية الآن» (pickHero)
  - every row word (teacherLessonState)
  - the lead: «سأحضر» until the join window opens, then «ادخل الحلقة» (joinPhase live) until ends_at, then «اكتب التقرير» with join as a peer while the window stays open
  - «سيُرسل إلى الأسرة بعد n دقيقة» counting down to edit_until (minutesLeft)
  - rows folding into «انتهت» at ends_at
  - «اليوم/غدًا» on student rows
- Query keys stay stable per day: board window, aheadWindow and weekWindow change only at midnight. Web home and «جدولي» share the ['lessons','mine',…] prefix, so one confirm patch updates both.
- NOT BUILT (the 30 s poll and the push map cover them):
  - the teacher Broadcast topic (it needs a migration with a lessons trigger and a policy; lessons is not in supabase_realtime)
  - useBellSignal wiring
  - the next-week prefetch
  - «سأحضر جميع الحلقات»
  - a students poll
  Add the Broadcast topic only if the owner wants updates within seconds on web.

## Web / mobile parity

- Lead and word:
  - Web and mobile both use lessonPlan, joinPhase, teacherLessonState and reportStage from client-core.
  - Today mobile derives the report from the pending list and web from reportOpen plus links. Afterwards both derive it from students[].report.
  - A lesson that just started leads with «ادخل الحلقة» and offers «اكتب التقرير» as a peer. At ends_at the report leads on both.
- The way in is gated the same way (owner Q3):
  - Room = platform || no link of its own (lesson.meeting_link only).
  - On a non-platform lesson WITH its own link:
    - web stops offering the classroom, «افتح الحلقة الآن» and «انسخ رابط الطالب» (apps/web/src/features/teaching/teacher/lessons/TeacherLessonCard.tsx:83-84)
    - the mobile sheet stops rendering its unconditional JoinClassroomButton (apps/mobile/src/teacher/screens/TeacherScheduleScreen.tsx:90)
    - her link leads only while live and is a secondary «ادخل الحلقة» otherwise
  - A static lesson with no link of its own keeps today's behaviour on both. On web: the classroom plus her fallback link as a peer (TeacherLessonCard.tsx:41). On mobile: the classroom only.
  - Mobile adds NO me.meeting_link fallback. It keeps reading lesson.meeting_link (TeacherLessonActions.tsx:108), so mobile «جدولي» needs no /teachers/me. Accepted gap: only web shows that fallback peer.
- Hero:
  - Today's lessons only on both, via pickHero. Before, web showed none, and mobile showed none for the teacher.
  - When there is no hero, both show the next-lesson pointer and «افتح جدولي». It reads a 14-day window: the web board window, or the mobile aheadWindow.
- Day rows: the same rule on both. Open and not-ended rows; ended rows fold; closed lessons out; due reports only in the pending block; the hero is excluded from rows and from that block.
- Pending reports:
  - Both show 3 rows, then overflow. Web unfolds a <details>; mobile pushes PENDING_REPORTS_HREF.
  - Web keeps its home block (docs/47:118) and the docs/47 studentId filter.
  - Mobile replaces PendingBanner.
- Confirm, cancel, propose:
  - «سأحضر» is optimistic on both. Cancel is write-through on both.
  - Both cancel messages read «أُلغيت الحلقة.» (owner Q5).
  - «اقترح موعدًا آخر» is offered inside the cancel step only when teacherCanPropose holds, meaning no pending proposal. Web gets it in TeacherCancelDialog now; mobile gets it in PR8.
  - Propose follows one rule on both: open and no pending proposal. Web keeps its behaviour after the start (the API has no start guard), and mobile PR8 uses the same rule instead of teacherCanAct.
- Propose: web already has it (ProposeForm). Mobile gains «اقترح موعدًا آخر» in the sheet, with the pending line «اقترحت {when}، بانتظار رد الإدارة», in PR8 (optional, own PR).
- Students: both get «مشترك · تجريبي · الكل» with «الكل» as the default. docs/46 D4 already decided one list; mobile pinned «never mixed» at TeacherStudentsScreen.tsx:39. Both also share:
  - the same counting through countByKind / boardStudents, so «مشترك» = active only on both
  - the same sort
  - the same facts line and plural age (mobile «9 سنة» becomes ageYears)
  - the chip for every status except active
  - the row opening the student file
  Accepted difference: membership. Web uses me.students with isCurrentStudent. Mobile uses GET /teachers/me/students?kind=, which looks back 60 days (teacher-students.service.ts:11). A follow-up can move mobile to me.students plus aheadWindow.
- Schedule on a phone: one day at a time on both. Web uses a sticky Tabs day strip; mobile uses WeekStrip.
  - Shared: the head line «3 – 9 أكتوبر · 5 حلقات · الأوقات بتوقيتك (القاهرة)», the ± week arrows, «اليوم/هذا الأسبوع» shown only away from the current week, a single empty line per day, and moved lessons dropped from rows and counts.
  - Web keeps the week in ?week=; mobile keeps it in state.
- Outcomes: web keeps the post-start «تسجيل الحضور» buttons in the drawer card (journey 2, R-SCH-08); mobile has none. That gap is accepted, because mobile teachers record through the report. The pre-start «اعتذر مسبقًا» goes from web teachers (owner Q4), matching mobile.
- Availability: web «جدولي» gains the «المواعيد المتاحة» view, which is the only editor. Mobile keeps the read-only «أوقاتي» in «المزيد» and drops the line from «جدولي».
- Zone line:
  - Mobile «اليوم» shows «الأوقات بتوقيتك (…)» only when useViewerTz() ≠ deviceTimeZone(). The viewer zone is the profile tz, else the device's (packages/client-core/src/core/auth/viewer-tz.ts:13-32), and every time renders in it.
  - Web «جدولي» always names the zone in its one meta line.
- Live updates: web uses the 30 s poll. Mobile uses the focused 30 s poll on lessons and pending reports, plus the teacher push map, so a foreground push lands within seconds. Web has no push-to-page path (apps/web/public/sw.js:30-43).

## Screen — web-today: /teacher home (apps/web/src/routes/teacher/index.tsx → features/teaching/teacher/TeacherDashboard.tsx)

### Layout

1) PageHead with the cartouche «اليوم» and the meeting button. These are TeacherDashboard.tsx:33-40, left byte-for-byte for #711.
2) TodayHero (today's lessons, pickHero), a <section> labelled by its lead line:
   - Lead line: «جارية الآن», or «الحلقة التالية · بعد 12 دقيقة» (60 min or less, today.inMinutes), or «الحلقة التالية · 4:00 م».
   - The time large in her zone, the names and «عند الطالب …».
   - [lead, filled] then [«التفاصيل» → drawer], plus «تُفتح الساعة …» while early in room mode.
   - With no hero: JoinLink «رابط الحلقة» in Meet mode (R-TCH-03), nothing on the platform.
3) PendingReports «تقارير لم تُكتب بعد · n» with except = hero id: 3 rows, then <details> «عرض الباقي (n)», and an error with retry when nothing is cached. Nothing while loading.
4) Tabs, with the tab in ?tab= and «طلابي» as the default (C1):
   - In this PR: «طلابي | اليوم n | الأسبوع | المواعيد المتاحة».
   - «الأسبوع» and «المواعيد المتاحة» leave in the web-schedule PR (owner Q2 for the week tab).
   - n = today's not-closed, not-ended lessons, hero included.
5a) «طلابي»: TeacherBoard (content owned by web-students).
5b) «اليوم», per the day rows rule:
   - «بقية اليوم»: TeacherLessonRow for today's lessons that are not closed and not ended, the hero excluded.
   - Then <details> today.endedFold «انتهت 3 حلقات اليوم» with muted rows.
   - No lessons today at all: «لا توجد حلقات اليوم», then «حلقتك القادمة: الأحد 16 نوفمبر 4:00 م · يوسف» and the link «افتح جدولي».
   - Only the hero left: «لا توجد حلقات أخرى اليوم».
   - All ended: «انتهت حلقات اليوم» + the pointer.
6) TeacherLessonDrawer for the opened lesson. The card shows:
   - when + student times + unpaid + status + «حضورك مؤكَّد»
   - lead (filled) | peers ButtonRow [«ادخل الحلقة» after the end or her link | «سأحضر» | report | «اقترح موعدًا آخر»] | «إلغاء الحلقة» danger-quiet
   - the way in by wayIn:
     - room: StaffJoinButton with «افتح الحلقة الآن» while early, plus her fallback link as a peer on a static lesson with no link of its own
     - link: her link only
   - «تسجيل الحضور» outcomes only after the start
   - «المزيد» → «انسخ رابط الطالب» (room mode)
7) Toast only while no drawer is open.
8) InternalMeetingsList is untouched (#711).
Row: [time] [names / «عند الطالب 15:00»] [word chip · تجريبية · unpaid] [lead]. The row line is a 48px button labelled lessons.sheet.openRow «تفاصيل الحلقة — {names}».

### Remove

- «بتوقيتك (city)» on every card (TeacherLessonCard.tsx:56). The zone is her own (docs/07 principle 7).
- The always-on action column on list surfaces (TeacherLessonCard.tsx:75-88). A list row now carries one lead; everything else is one tap away in the drawer.
- The «لا يوجد رابط» line on the teacher card (TeacherLessonCard.tsx:81). With no link of its own, the classroom is the way in.
- The classroom, «افتح الحلقة الآن» and «انسخ رابط الطالب» on non-platform lessons with their own link (TeacherLessonCard.tsx:83-84; owner Q3).
- The inline propose form branch (TeacherProposal.tsx:32-44, usePhone). Propose always opens the Dialog. On phones it already opens over the drawer today, as TeacherCancelDialog does.
- The pre-start «اعتذر مسبقًا» on the teacher card (LessonActions.tsx:30-33, owner Q4). It is a charged STUDENT cancel (docs/46 §5).
- The label «رابط الاجتماع (Meet/Jitsi)»: the link reads t.teacherDash.join «ادخل الحلقة», as on mobile.
- JoinLink whenever a hero exists (TeacherDashboard.tsx:63). The hero lead is the way in.
- The old «اليوم» panel's LessonDayList use (DashboardPanel today branch). LessonDayList itself and the week tab stay until the web-schedule PR.

### Merge

- JoinLink banner, card Meet link (TeacherLessonCard.tsx:76-79) and StaffJoinButton (:83) become ONE «ادخل الحلقة» chosen by wayIn. It is the lead while the phase is live and a peer otherwise. The banner is kept only as the no-hero fallback.
- «سأحضر», the report links and the join become one lead from lessonPlan, drawn by TeacherLessonLead on the row, the hero and the drawer card.
- TeacherLessonActions.tsx (confirm + cancel) folds into the card's peers (NEW TeacherLessonPeers.tsx).
- «اقترح موعدًا آخر» is added to the cancel dialog as a secondary, only when teacherCanPropose holds. It closes the dialog and opens the propose Dialog for the same lesson (owner Q5, D3).
- Home and «جدولي» drawers become one TeacherLessonDrawer.
- Due reports appear once: the pending block (hero excluded) instead of the block plus ended rows plus the hero.

### Interactions

- One tap from the landing tab: the hero's filled lead (join, «سأحضر» or «اكتب التقرير»).
- Each row has one inline lead (secondary; a live join is filled), and the row opens the drawer with every action.
- Optimistic «سأحضر»: the chip and the word flip before the POST returns. A 409 lesson_started rolls back with an inline FormAlert.
- Cancel dialog: a required reason, «تراجع», «تأكيد الإلغاء», and «اقترح موعدًا آخر» when no proposal is pending. Cancel is write-through, so the row closes on success with no refetch wait.
- ?tab= keeps the tab across refresh and back from /teacher/report/$id; the arrow keys work as before.
- Native <details> folds with no JS: «انتهت n حلقات اليوم» and «عرض الباقي (n)».
- Retry buttons on the lessons error, the pending-reports error and the me error. teacher_not_linked offers no retry.
- An empty day points to the next lesson with «افتح جدولي» → /teacher/calendar.

### Reactivity

- Consumes PR1: myLessonsQuery and pendingReportsQuery poll every 30 s. Board, hero and rows update from admin moves and cancels within 30 s.
- Hero, words, leads, the join hint and «يمكنك تعديل التقرير حتى …» all derive from useNow. No new useEffect.
- On the midnight window change, placeholder data is dimmed with aria-busy (pattern MyWeek.tsx:92).
- Drawer content is re-derived by id from the polled list, so it never goes stale while open.
- Her actions never refetch teacherMeQuery, so the home cannot blank after «سأحضر» or a cancel.

### Files

- apps/web/src/routes/teacher/index.tsx: add validateSearch: parseTeacherHomeSearch; pass tab={Route.useSearch().tab} and onTab={(tab) => navigate({ search: { tab } })}.
- apps/web/src/features/teaching/teacher/home-search.ts (NEW) + test: a zod enum of the current tab values with .catch('students'). The web-schedule PR drops week and availability.
- apps/web/src/features/teaching/teacher/TeacherDashboard.tsx:
  - Take {tab, onTab}.
  - TABS: the «اليوم» entry gets its count.
  - Mount TodayHero and PendingReports above Tabs; JoinLink only with no hero (:63-64).
  - Add tabIds to the tabpanel.
  - Use an error lookup map with retry, data-first (!me.data && me.isError).
  - Lines 33-40 and 46 stay untouched.
- apps/web/src/features/teaching/teacher/DashboardPanel.tsx: the PANELS map gets today → TodayPanel. Data-first order and aria-busy. week and availability are unchanged in this PR.
- apps/web/src/features/teaching/teacher/today/TodayHero.tsx (NEW, under 70 lines): a HERO_TEXT Record<Hero['kind'], fn> lookup, plus the hero row, plus the JoinLink fallback.
- apps/web/src/features/teaching/teacher/today/TodayPanel.tsx (NEW) and today/split-today.ts (NEW, pure):
  - splitToday(lessons, { now, heroId }) returns { rest, done, open }:
    - closed lessons dropped (isClosedLesson; excused kept)
    - rest = not ended and not the hero
    - done = ended
    - open = the not-ended count, hero included, for the tab
  - nextOpenLesson comes from client-core.
- apps/web/src/features/teaching/teacher/lessons/TeacherLessonRow.tsx (NEW), TeacherLessonLead.tsx (NEW, LEAD lookup), teacher-word.ts (NEW, TEACHER_WORD lookup) and TeacherLessonDrawer.tsx (NEW, moved from MyWeek.tsx:65-80, with the in-drawer role=status notice).
- apps/web/src/features/teaching/teacher/lessons/TeacherLessonCard.tsx:
  - Header uses lessonWhenAt; drop «بتوقيتك».
  - Lead first, then TeacherLessonPeers (NEW).
  - The way in by wayIn(platform, lesson.meeting_link). fallbackLink renders only as a peer when room mode comes from no link of its own and the lesson is not platform.
  - CopyLinkButton goes inside MoreMenu, room mode only.
  - `teacher` is passed to LessonActions.
  - Under 150 lines.
- apps/web/src/features/teaching/teacher/lessons/TeacherConfirm.tsx: a `variant` prop (primary when it leads, secondary as a peer) and the chip read from the optimistic cache.
- apps/web/src/features/teaching/teacher/lessons/TeacherLessonActions.tsx: delete; its tests move to TeacherLessonPeers.cancel.test.tsx and .confirm.test.tsx.
- apps/web/src/features/teaching/teacher/lessons/TeacherCancelDialog.tsx: props gain canPropose and onPropose (:12-17 has only lessonId). The secondary «اقترح موعدًا آخر» renders only when canPropose.
- apps/web/src/features/teaching/teacher/proposals/TeacherProposal.tsx: a Dialog on every width (drop usePhone and the inline branch); ghost → secondary; offered when teacherCanPropose; an `open` state the card can drive from the cancel dialog.
- apps/web/src/features/teaching/schedule/lesson/LessonActions.tsx (SHARED with admin):
  - Rename hideConfirm → `teacher`. Its only caller is TeacherLessonCard.tsx:87.
  - `teacher` hides the family confirm and the pre-start excuse via `started || (e === 'excuse' && !teacher)`.
  - Move AdminButtons to AdminButtons.tsx; the file is at 144/150.
  - Rename LessonActions.hide-confirm.test.tsx → LessonActions.teacher.test.tsx; its :15-23 pass hideConfirm and would fail typecheck.
- apps/web/src/features/reporting/reports/history/PendingReports.tsx:
  - Props { tz; studentId?; except? }, building on docs/47 PR1's studentId.
  - 3 rows + <details>.
  - Error + retry only with no data; nothing while loading.
  - Keep aria-label t.reports.pending and the listitem/link roles.
- packages/shared/i18n/ar.json + en.json: the keys below.

### Tests

- home-search.test.ts: none or junk → students; known tabs are kept.
- split-today.test.ts:
  - cancelled and rescheduled lessons dropped
  - excused kept
  - ended → done
  - the hero excluded from rest
  - `open` counts the not-ended lessons, hero included
- TeacherDashboard.test.tsx (141/150):
  - REWRITE :120-141: card links are found in the drawer, and classroom.joinMeeting → teacherDash.join.
  - :95-112 (week tab and rolling 7 days) stay until the web-schedule PR.
  - New cases go in TeacherDashboard.tabs.test.tsx:
    - the hero sits above the tabs
    - JoinLink only with no hero in Meet mode
    - the «اليوم» count
    - tab='today' renders TodayPanel; onTab fires
    - retry on the lessons error
    - a failed refetch after data keeps the panel
    - «سأحضر» never refetches /teachers/me
- TeacherLessonRow.test.tsx (fake timers): exactly one lead per state.
  - Before the window → «سأحضر» (secondary).
  - In the window before ends_at → «ادخل الحلقة» (filled).
  - After ends_at with the window still open → «اكتب التقرير» lead, with join only in the drawer peers.
  - A sent report → no lead.
  - The row opens the drawer.
- TeacherLessonCard.join.test.tsx (update):
  - A non-platform lesson with its own link → one «ادخل الحلقة» link and no classroom or copy.
  - No own link → the classroom plus the fallback link as a peer.
  - A platform lesson → the classroom only.
  - The label is t.teacherDash.join; 'one filled control'.
- TeacherLessonCard.propose(.phone).test.tsx: propose opens a Dialog on every width; the cancel dialog's «اقترح موعدًا آخر» opens it; it is hidden while a proposal is pending.
- LessonActions.teacher.test.tsx (renamed from .hide-confirm): `teacher` hides the family confirm and «اعتذر مسبقًا» before the start; the outcomes appear at starts_at with no remount. LessonDrawer.actions.test.tsx:59-63 (admin early excuse) is unchanged.
- PendingReports.test.tsx:
  - 5 rows → 3 + «عرض الباقي (2)».
  - `except` hides the hero's lesson.
  - `studentId` filters.
  - Loading renders nothing.
  - An error with no data shows the alert and a retry that refetches.
- e2e (same PR, CI only):
  - journey-2-report.spec.ts:21-26. The seeded lesson is the running hero: seedPackageStudent starts it at now−30 min for 90 min (e2e/support/finance/money.ts:45-47,89). So: no tab click; hero «التفاصيل» → drawer «الحلقة تمت» → the drawer's ar.reports.open link.
  - teacher-isolation.spec.ts:110-111: no tab click; assert the hero region contains «سدرة {tag}». It is the hero, not an article in the panel.
  - teacher-week-history.spec.ts:61: JoinLink is hidden while a hero exists, so assert the hero's «ادخل الحلقة» href = the lesson's own seeded link https://meet.jit.si/ayat-e2e-abrar (e2e/support/core/schedule.ts:108-109), not LINK.
  - teacher-week-history.spec.ts:62-65: hero «التفاصيل» → drawer; «الحلقة تمت» visible, no family «تأكيد».
  - teacher-week-history.spec.ts :68-83 (week tab) are unchanged until the web-schedule PR.
  - proposals.spec.ts and proposals-reject.spec.ts keep the week tab in this PR; propose now opens a Dialog everywhere, and the form is found by name as today.
  - meeting-link-auto.spec.ts:86-97: card(...) assertions move into the drawer opened from the week-tab row; classroom.joinMeeting → teacherDash.join.

### i18n

- NEW teacherDash.nextOn «حلقتك القادمة: {when} · {names}» / en «Your next lesson: {when} · {names}».
- NEW teacherDash.noneSoon «لا توجد حلقات في الأسبوعين القادمين» / en «No lessons in the next two weeks».
- NEW teacherDash.noMoreToday «لا توجد حلقات أخرى اليوم» / en «No other lessons today».
- NEW teacherDash.openSchedule «افتح جدولي» / en «Open my schedule» (mobile reuses it).
- NEW teacherDash.awaiting «بانتظار تأكيدك» / en «Awaiting your confirmation» (both apps).
- NEW reports.pendingMore «عرض الباقي ({n})» / en «Show the rest ({n})» (both apps).
- NEW reports.pendingError «تعذّر تحميل التقارير المعلّقة» / en «Could not load pending reports». No existing key fits; teacherDash.loadError names lessons.
- CHANGED teacherBoard.cancelledOk «أُلغيت الحلقة. اقترح موعدًا آخر إن أمكن.» → «أُلغيت الحلقة.» / en «Lesson cancelled.» (owner Q5; mobile shares it).
- CHANGED teacherDash.propose.date «اليوم» → «التاريخ» / en «Date» (it read as 'today').
- Reused instead of new keys:
  - reports.familySend.sendsIn for the window word (not a new reports.sendsIn)
  - lessons.sheet.openRow for the row button (not a new teacherDash.openLesson)
  - today.running, today.next, today.inMinutes, today.endedFold, today.quietTitle
  - teacherDash.join, teacherDash.noLessonsToday
  - teacherBoard.suggestOther, teacherDash.proposeReschedule
  - reports.open/resume/view/editUntil/pending, teacherStudents.retry
- REMOVED (ar + en), each after a final grep: teacherDash.yourTime, classroom.joinMeeting (users TeacherLessonCard.tsx:78, MyWeek.test.tsx:52, TeacherDashboard.test.tsx:129,140, meeting-link-auto spec). teacherDash.week and weekRange go in the web-schedule PR.

### Risks

- #711 rewrites the TeacherDashboard.tsx head and :46 (docs/47:515-518; not in this checkout, so the line overlap is unverified). Merge #711 first and keep lines 33-40 and 46 byte-identical.
- PendingReports is also edited by docs/47 PR1 (studentId) and rendered in every student file. This PR lands after it, keeps the prop, and shows no skeleton.
- Outcomes move into the drawer: one extra tap on journey 2, and every e2e that clicks card buttons must open the drawer first.
- TeacherLessonCard is shared with the board's StudentDrawer until web-students deletes it. Every new prop defaults to today's behaviour.
- The wayIn rule leaves a static lesson with no link of its own on today's dual offer (classroom + fallback link). Whether the family gets the classroom there depends on LiveKit and the lesson_join_link template, which no client can see (owner Q3).
- Toast versus drawer stacking (z-50 in both) has not been verified in a browser. The in-drawer status line avoids it.
- File budgets: TeacherDashboard.test.tsx is 141/150, so new tests go in new files. TeacherLessonCard is split into Lead and Peers so it stays under 150.


## Screen — web-students: /teacher/students «الطلاب» (docs/47 PR1 renames the route to apps/web/src/routes/teacher/students.index.tsx → features/teaching/teacher-students/TeacherStudents.tsx)

### Layout

1) PageHead with the cartouche «الطلاب».
2) Head row: SegmentedControl «مشترك n · تجريبي n · الكل n» (countByKind; default «الكل»), then the search box «ابحث بالاسم أو الكود». One row from 640px; at 390px the search takes the full width. No window caption.
3) Table «طلابي» (TeacherBoard columns):
   - الطالب: the name as a Link to the file, the LTR AB code, and the status chip (not for active). Under it the facts line «القرآن الكريم · جزء عمّ · 9 سنوات» in xs ink-3, nulls dropped.
   - آخر حلقة, الحلقة القادمة, آخر تقرير, الحضور.
   - Soonest next lesson first.
   - At 390px each row stacks into labelled lines (PhoneLabel).
4) States:
   - Skeleton until me arrives.
   - FormAlert only when there is no data: not-linked with no retry, otherwise loadError + «حاول مرة أخرى».
   - An empty segment shows EmptyState with its title + one hint sentence.
   - A search with no match shows «لا يوجد طالب بهذا الاسم أو الكود».
The same TeacherBoard renders on the home «طلابي» tab, so both lists are identical.

### Remove

- The separate endpoint table: columns.tsx (6 columns; docs/47 PR1's :37 link edit dies with it), next-lesson.ts and its test, TeacherStudents.sort.test.tsx, TeacherStudents.en.test.tsx and teacher-students/api.ts (its query moves to student-facts.ts).
- The «مشتركون | تجريبي» tabs with one fetch per kind (TeacherStudents.tsx:16-19, 27-28, 34), and the «تصفية» dialog with its chips. DataTableToolbar no longer renders without clientFilter (DataTable.tsx:101).
- The board's StudentDrawer and StudentLessonsTab (teacher-board/drawer/), once rows open the docs/47 file. The caption at StudentLessonsTab.tsx:22 goes with it, and so do docs/47 PR1's «ملف الطالب» link and TeacherBoard.drawer.test.tsx. The attendance/ folder stays, because the file reuses it.
- The TeacherLessonCard export from apps/web/src/features/teaching/teacher/index.ts:9. Its only outside consumer was StudentLessonsTab (knip); TeacherLessonDrawer imports the card directly.
- The board caption «آخر 14 يومًا و14 يومًا قادمة» (TeacherBoard.tsx:47).
- The server's next_lesson_at as a second «الحلقة القادمة» source. The next and last lessons come from the window plus useNow.

### Merge

- /teacher/students and the home «طلابي» tab render ONE TeacherBoard: same membership (me.students + isCurrentStudent), zone me.tz, columns and row target. Whether to drop the home tab is owner Q1.
- program + level + age (skeptic: keep) become one facts line in StudentCell. It is joined by id from the existing GET /teachers/me/students?kind=subscribed|trial with no API change; TeacherMe and views.ts (150 lines) are not widened.
- Code + program filter fold into one search box that matches the name, the code (case-insensitive «ab-0183») and the facts line («تجويد»).
- Empty and error ternaries become lookup maps (EMPTY: Record<StudentListKind,string>, ERRORS by code).

### Interactions

- Segments with live counts from one dataset (countByKind, TeacherBoard.tsx:29-36): «مشترك» = active only; pending_renewal and expired appear under «الكل» with chips.
- Search: ColumnFilterText (300 ms debounce, matchesQuery Arabic-normalised). It sits in the board head, so the home tab gets it too.
- Row or name → /teacher/students/$studentId (the student file, docs/47 PR1). No drawer.
- Pre-sorted rows (boardRows), so DataTable.tsx (143 lines) gets no new prop. Header sort keeps working on desktop.
- No mutations here, so no optimistic updates.

### Reactivity

- Board lessons come from myLessonsQuery(boardWindow) and share the key with the home tab. The PR1 30 s poll covers both.
- Facts queries [...teacherMeQuery.queryKey, 'students', kind] use staleTime 5 min with no poll and no invalidation. They rarely change, each call scans 60 days, and her actions do not change program, level or age.
- useQueries combine is a module-level function (a stable reference), so the facts Map is rebuilt only when the results change.
- Last and next lessons move by themselves with useNow; a started lesson shifts to «آخر حلقة» with its chip.
- A failed background refetch never shows the alert over a good table (me.isError && !me.data).

### Files

- apps/web/src/features/teaching/teacher-students/TeacherStudents.tsx: rewrite as a thin page (~60 lines). PageHead + Cartouche; useQuery(teacherMeQuery) with the ERRORS lookup; ListSkeleton; inner: useNow → today in me.tz → myLessonsQuery(boardWindow(today, me.tz)) → <TeacherBoard/>. Mirrors TeacherDashboard.tsx:53-71 without the tabs.
- apps/web/src/routes/teacher/students.index.tsx (docs/47 PR1 name): the doc comment only.
- NEW apps/web/src/features/teaching/teacher-board/student-facts.ts (~40 lines): factsLine(s), and useStudentFacts() as useQueries over TEACHER_STUDENT_KINDS with staleTime 300_000 and a module-level combine → Map(id → line). A failed kind only drops its lines.
- apps/web/src/features/teaching/teacher-board/board-rows.ts:
  - Rows sorted by compareValues(next?.starts_at) || compareValues(name), using components/data-table/client-sort.ts.
  - NEW searchRows(rows, { q, facts }).
- apps/web/src/features/teaching/teacher-board/TeacherBoard.tsx: q state, useStudentFacts, searchRows; the SegmentedControl + ColumnFilterText head; the EMPTY lookup + emptyHint; noMatch; onRowClick → navigate({ to: '/teacher/students/$studentId', params }); delete the drawer, openId and the caption. Under 100 lines.
- apps/web/src/features/teaching/teacher-board/cells/board-columns.tsx: a `facts` map input; the name cell becomes a Link.
- apps/web/src/features/teaching/teacher-board/cells/StudentCell.tsx: an optional facts line; no chip for 'active'.
- apps/web/src/features/teaching/teacher/index.ts: drop the TeacherLessonCard export (:9).
- DELETE apps/web/src/features/teaching/teacher-board/drawer/StudentDrawer.tsx, StudentLessonsTab.tsx and TeacherBoard.drawer.test.tsx; the teacher-students files listed under remove.
- packages/shared/i18n/ar.json + en.json: the keys below.

### Tests

- student-facts.test.ts: line order; nulls dropped (no «—»); age plural 1 «سنة واحدة», 2 «سنتان», 9 «9 سنوات», 11 «11 سنة»; both ?kind calls; a failing kind keeps the other's facts.
- board-rows.test.ts: soonest first, none last, ties by name; searchRows by name, code (case-insensitive) and program.
- TeacherBoard.test.tsx:
  - mock the facts paths
  - facts under the name
  - search narrows rows, and a miss shows noMatch
  - an empty segment shows title + hint
  - «مشترك» counts only active
  - «الكل» keeps pending_renewal and expired with chips (carried over from TeacherStudents.test.tsx:60)
  - a row click navigates to /teacher/students/s1
  - no active chip
- TeacherStudents.test.tsx (rewrite): the cartouche; the table named t.teacherBoard.tab; /teachers/me and the window are fetched once; teacher_not_linked → notLinked with no retry; other errors show retry; no phone pattern (keeps :41).
- e2e: teacher-week-history.spec.ts:94-99 (the board on /teacher) clicks a row and expects the file URL instead of the drawer. Run in CI only.

### i18n

- NEW teacherBoard.search «ابحث بالاسم أو الكود» / «Search by name or code».
- NEW teacherBoard.searchLabel «البحث في الطلاب» / «Search students».
- NEW teacherBoard.noMatch «لا يوجد طالب بهذا الاسم أو الكود» / «No student matches this name or code».
- NEW teacherBoard.emptyHint «يظهر هنا كل طالب تُسنده إليك الإدارة، مع حلقاته في آخر 14 يومًا و14 يومًا قادمة.» / en equivalent.
- NEW teacherStudents.ageYears (plural): one «سنة واحدة», two «سنتان», few «{n} سنوات», other «{n} سنة» (mobile reuses it).
- Reused: studentLists.active/trial/all/emptyActive/emptyTrial, teacherBoard.kinds/tab/noStudents/openFile (docs/47 adds openFile), teacherDash.notLinked/loadError, teacherStudents.title/retry.
- REMOVED: teacherBoard.window, and teacherStudents.levelCol/ageCol/nextLessonCol/openReports/list/subscribed/age once mobile has switched (final grep).

### Risks

- Order: this PR goes AFTER docs/47 PR1. It deletes columns.tsx and the drawer that PR1 edits, and routes rows to PR1's file route.
- docs/47 PR2's paused list: if this lands first, PR2 adds «موقوفون مؤقتًا» as a fourth SegmentedControl option on the board (me.students with status 'paused' and empty lesson cells) instead of a TeacherStudents tab.
- Membership narrows here: students reachable only through the endpoint's 60-day lookback no longer show. This is docs/46 D4 «current», and the owner should be told.
- A next lesson more than 14 days ahead reads «لا يوجد». Rare with weekly rules.
- Per-student lesson actions leave the board with the drawer. They stay on «اليوم» and «جدولي».
- Two facts requests, each scanning 60 days, bounded by staleTime 5 min and never polled.


## Screen — web-schedule: /teacher/calendar «جدولي» (apps/web/src/routes/teacher/calendar.tsx → features/teaching/teacher/lessons/MyWeek.tsx)

### Layout

1) Head (MyWeekHead):
   - Cartouche «جدولي».
   - A SegmentedControl «الحلقات | المواعيد المتاحة» (?view=lessons|availability).
   - One meta line «3 – 9 أكتوبر · 5 حلقات · الأوقات بتوقيتك (القاهرة)»: calendar.range + schedule.lessonCount counting lessons that are not closed + schedule.zoneNote.
2) Week bar:
   - IconButton ‹ «الأسبوع الماضي» (size-11 sm:size-12), the aria-live range, IconButton › «الأسبوع القادم».
   - A «هذا الأسبوع» chip, only on another week.
   - ?week=YYYY-MM-DD is snapped to Saturday; the current week stays out of the URL.
3a) Desktop (≥768px): WeekGrid single-teacher with 7 day columns, no «المعلم/ة» column, min-w 720px and the today wash. Teacher chips show:
   - the time and the names
   - the TEACHER_WORD nuqta AND its word, visible (docs/07:27), in place of the status word
   - trial/makeup, unpaid and proposal flags
   - closed lessons dimmed and struck through; old slots of moved lessons hidden
   A chip opens TeacherLessonDrawer.
3b) Phone: a sticky Tabs day strip «السبت 3» with open counts, today selected. Below it, the picked day's TeacherLessonRows (lead + open drawer), or «لا توجد حلقات».
4) Empty week: EmptyState with the action «الأسبوع القادم». A first-load error: FormAlert + retry. A failed refetch keeps the grid.
5) view=availability: TeacherAvailability (moved from the home), the only web editor.
The home loses its «الأسبوع» tab (owner Q2, default remove) and its «المواعيد المتاحة» tab in this PR.

### Remove

- The «المعلم/ة» row header and min-w-[920px] on the teacher path only (WeekGrid.tsx:59, 62-64, 83-85; admin always passes `teachers`).
- On teacher chips: the conflict line (LessonChip.tsx:100-105) and the «عند الطالب» line (LessonChip.tsx:95-99; the drawer keeps studentTimes). The family status word (LessonChip.tsx:88-92) is REPLACED by her TEACHER_WORD, still visible.
- Rescheduled old slots from the grid and the count; they appeared twice (MyWeek.tsx:45-46, 93).
- «أسبوع {date}» (MyWeek.tsx:61), the bare «بتوقيتك» (:62) and the disabled «هذا الأسبوع» (:54).
- On phones, the 7 stacked day sections with an empty line under each (the WeekGrid/agenda path). Admin keeps WeekAgenda.
- The home «الأسبوع» tab (owner Q2): TeacherDashboard.tsx:26, the week panel and weekRange at DashboardPanel.tsx:25-28 and 41-52, weekLessons in teacher-board/board-window.ts:20-27, index.ts:1 and its test, and LessonDayList.tsx (its only user is DashboardPanel). That last one removes the admin hint «تظهر الحلقات هنا فور حجزها من الإدارة» on the web Today; the key stays for MyWeek.
- The home «المواعيد المتاحة» tab and DashboardPanel's availability branch (DashboardPanel.tsx:57).

### Merge

- Week label, count and zone become one meta line.
- One zone for the screen: the card uses useViewerTz like the grid, replacing `me.data?.tz ?? tz` (MyWeek.tsx:69).
- The drawer is the shared TeacherLessonDrawer (from web-today), with a role=status notice inside it and the Toast only when no drawer is open.
- Availability joins «جدولي» as a second view in the same head.
- The home's «الأسبوع» moves here: «جدولي» with ?week is the one week view.

### Interactions

- ?week and ?view in the URL (pattern routes/admin/(ops)/schedule.tsx:9-18). Reload, Back and shared links keep them; `search.week ?? thisWeek` follows the clock with no useFollowingDay.
- Phone day strip: the existing Tabs (role=tablist, RTL arrow keys, count, 44px). The picked day is useState initialised to today, else the first day with lessons, else Saturday; key={week} resets it, with no effect.
- One-tap lead on each phone row (TeacherLessonLead), and the drawer for everything else.
- The empty week offers «الأسبوع القادم»; a load error with no cache offers «حاول مرة أخرى».
- Skipped: swipe between weeks, a jump to the nearest lesson, bulk confirm, filters and search (a week holds few lessons).

### Reactivity

- Consumes PR1's 30 s myLessonsQuery poll; an admin move, cancel or approval lands within 30 s.
- Data-first Body from PR1: data → grid (dimmed with aria-busy when isPlaceholderData) → error + retry → skeleton.
- The drawer lesson is derived by id from the UNFILTERED data (MyWeek.tsx:39), so it updates in place and shows the closed state if an admin moves it.
- The fallback link is me.data?.meeting_link ?? null. It is only a peer on static lessons with no link of its own, and «لا يوجد رابط» is gone, so nothing flashes while me loads.

### Files

- apps/web/src/routes/teacher/calendar.tsx: validateSearch: parseMyWeekSearch; pass search and onSearch to MyWeek.
- apps/web/src/features/teaching/teacher/lessons/my-week-search.ts (NEW, ~20 lines) + test: week snapped to Saturday via weekStart, junk dropped; view ∈ lessons|availability, default lessons. Reuses dateOf (export it from apps/web/src/features/teaching/schedule/filters/search.ts:29).
- apps/web/src/features/teaching/teacher/lessons/MyWeek.tsx: props {search, onSearch}; shown = data without 'rescheduled'; useNarrow() ? <MyDayList key={week}/> : <WeekGrid chipWord={…}/>; the VIEWS lookup {lessons, availability}; the drawer via TeacherLessonDrawer; under 150 lines.
- apps/web/src/features/teaching/teacher/lessons/week/MyWeekHead.tsx (NEW) and week/MyDayList.tsx (NEW: sticky Tabs + TeacherLessonRow list).
- apps/web/src/features/teaching/schedule/grid/WeekGrid.tsx (SHARED with admin): no row header and min-w-[720px] when !teachers; a new optional chipWord?: (lesson: LessonView) => { label; tone; glyph } passed through LessonChipList to LessonChip.
- apps/web/src/features/teaching/schedule/lesson/LessonChip.tsx (SHARED, 120 lines): an optional `word` prop.
  - When set, the word and its nuqta replace the status word at :88-92 (still visible), the student-time (:95-99) and conflict (:100-105) lines are dropped, and the chip is struck through when closed.
  - Unpaid and proposal flags stay.
  - ChipLesson (:29-34) is NOT widened. It has no ends_at or students[].report, so MyWeek computes the word from the full LessonView with teacherLessonState + TEACHER_WORD and passes it in.
  - Admin and sales callers pass nothing and render as today.
- apps/web/src/features/teaching/teacher/DashboardPanel.tsx and TeacherDashboard.tsx: drop the week and availability tabs and panels; home-search.ts keeps students|today; delete LessonDayList.tsx, weekLessons and its test.
- NEW e2e/support/teaching/my-lesson.ts: openMyLesson(page, { at, name }).
  - goto /teacher/calendar?week=<Saturday of the lesson's Cairo date>.
  - When the day-strip tablist is visible (the Pixel 7 'mobile' project runs every spec, e2e/playwright.config.ts:76-79), click the lesson's day tab.
  - Click the row/chip named lessons.sheet.openRow and return the drawer dialog.
  - It is needed because «جدولي» runs Saturday–Friday: lessons 2 or 4 days ahead cross into next week on Thursday or Friday.
- docs/03-requirements.md:87 (R-TCH-03 «today / this week» → «today + «جدولي» (week)») and docs/46-teacher-portal.md:135-141 (C1 home tabs): reword in this PR, per owner Q2.
- packages/shared/i18n/ar.json + en.json: the keys below.

### Tests

- my-week-search.test.ts: a mid-week date snaps to Saturday; junk is dropped; an empty search gives {}; the view default.
- MyWeek.test.tsx (update):
  - A stateful {search, onSearch} wrapper.
  - No «هذا الأسبوع» on the current week; it appears after «الأسبوع القادم».
  - The range «3 – 9 أكتوبر».
  - The empty-week action moves the week.
  - An error before data shows a retry that refetches; an error after data keeps the grid.
  - A rescheduled lesson is neither drawn nor counted.
  - view=availability renders the editor.
  - :52 switches to teacherDash.join.
- MyWeek.phone.test.tsx (NEW, narrow matchMedia): 7 tabs with today selected and counts; picking a day shows only its rows; the inline «سأحضر» flips the word before the response (optimistic).
- LessonChip.word.test.tsx (NEW):
  - With `word`, the conflict and student-time lines are hidden.
  - Unpaid and proposal stay.
  - The word and its nuqta are visible; struck when closed.
  - Without `word`, the admin chip is unchanged (unpaid-flag.test.tsx stays green).
- WeekGrid.single.test.tsx (NEW): no rowheader without `teachers`; the rowheader stays with `teachers`.
- TeacherDashboard.test.tsx: delete :95-112 (the week tab and the 'next 7 days on a Friday' test) and the availability tab case; two tabs remain.
- e2e (same PR, CI only):
  - journey-5-availability-wizard.spec.ts:21 → /teacher/calendar?view=availability.
  - teacher-week-history.spec.ts:67-83 → openMyLesson for each of the three days; «سأحضر» in the drawer.
  - teacher-week-history.spec.ts:86: drop the tab click.
  - proposals.spec.ts:60-64,100-103, proposals-reject.spec.ts:36-40,58-60 and meeting-link-auto.spec.ts:86-97 → openMyLesson. :40 and :60 would otherwise pass vacuously on an empty card locator.
  - teacher-mode.spec.ts:94-97 stays green: the lessons are today (:64-65), the default day.

### i18n

- NEW schedule.dayStrip «أيام الأسبوع» / «Days of the week» (Tabs aria-label).
- NEW teacherDash.views «عرض جدولي» / «My schedule views» (SegmentedControl label).
- Reused: calendar.range, schedule.zoneNote/lessonCount/prevWeek/nextWeek/thisWeek/noLessons, availability.title, teacherBoard.confirmedChip, teacherDash.noLessonsWeek/emptyHint, lessons.sheet.openRow, common.more.
- REMOVED (ar + en) after a grep: teacherDash.week, teacherDash.weekRange, and schedule.weekOf / schedule.viewerTime if admin no longer uses them.

### Risks

- The week-tab and availability-tab removal, the journey-5 move and the openMyLesson e2e moves must ship in this ONE PR. Teachers must never be left without an availability editor, because mobile is read-only.
- Removing «الأسبوع» depends on owner Q2. If the owner keeps it, drop those removals and the e2e moves, and keep LessonDayList.
- WeekGrid and LessonChip are shared with admin and sales: only the !teachers and `word` branches change, and the defaults keep today's render.
- The unpaid flag stays on teacher chips (skeptic keep, R-SUB-02).
- Stacking (toast versus drawer, the Dialog over a full-screen phone drawer) is unverified in a browser. The propose and cancel Dialogs already stack over the drawer on phones today.
- The mobile counterpart does not change web files.


## Screen — mobile-today: teacher «اليوم» (apps/mobile/app/teacher/today/index.tsx → apps/mobile/src/teacher/screens/TeacherTodayScreen.tsx)

### Layout

One ScrollView with RefreshControl (usePullRefresh), a 16pt gutter and gap 16.
1) TodayHeader tree="teacher":
   - The greeting.
   - The short date without the year.
   - «الأوقات بتوقيتك (القاهرة)» only when useViewerTz() ≠ deviceTimeZone().
   - «آخر تحديث 16:20» when stale.
   - A round 44pt bell, and HeaderConnectingBar.
2) An inverse Notice for 5 s after an action lands.
3) TeacherHero (HeroFrame on the lapis wash, key=lesson.id):
   - Lead line «جارية الآن» or «الحلقة التالية · بعد 12 دقيقة».
   - An end chip (next only, from TEACHER_WORD): «بانتظار تأكيدك» or «حضورك مؤكَّد».
   - The time at 34pt, the names, and the subtitle «تجريبية · 45 دقيقة · 21:00 بتوقيت مسقط».
   - ButtonRow: the lead filled, one outlined peer (the fixed link or the report), «التفاصيل».
   - A Note «تُفتح الساعة 19:45» while early in room mode.
4) «تقارير لم تُكتب بعد · N» in one raisedCard:
   - Today's due lessons first, from students[].report with the hero excluded. Then the older pending rows, grouped per lesson, oldest first.
   - 3 rows, then one row «عرض الباقي (N)» → PENDING_REPORTS_HREF.
   - Each row: names, when, and an act chip «اكتب/أكمل التقرير» → /teacher/today/report/:id.
5) «بقية اليوم · N» (today.rest): TeacherLessonRows for today's not-closed, not-ended lessons, the hero excluded, in one InsetGroup. Each row shows time · names · «عند الطالب 15:00» · word chip and one inline lead. A tap opens TeacherLessonSheet.
6) EndedFold «انتهت 3 حلقات اليوم» unfolds the ended rows, with no join and no lead.
7) Day end (nothing open left, or no lessons): one raisedCard with:
   - «انتهت حلقات اليوم» or «لا توجد حلقات اليوم»
   - then «حلقتك القادمة: الأحد 16:00 · يوسف أحمد» or «لا توجد حلقات في الأسبوعين القادمين»
   - then the outlined «افتح جدولي»
No cache and a failed fetch: ErrorState with retry.
Overlay: TeacherLessonSheet with onReport → /teacher/today/report/:id.

### Remove

- LiveSessions «جلسات مباشرة» (TeacherTodayScreen.tsx:4,72): it duplicates the join and ignores platform_classroom. Delete:
  - apps/mobile/src/live/LiveSessions.tsx
  - LiveSessions.test.tsx and LiveSessions.en.test.tsx
  - liveLessons/LiveLesson from live-filter.ts:3-7,17-25 (keep livePhase)
  - the liveLessons cases at live-filter.test.ts:27-36
- PendingBanner (TeacherTodayScreen.tsx:27-41,73), replaced by the inline block. The banner push that docs/47 PR2 plans is replaced by the PENDING_REPORTS_HREF constant.
- The per-lesson card stack: apps/mobile/src/teacher/components/TeacherLessonCard.tsx, TeacherLessonActions.tsx (cardPlan) and their 3 tests (Today is the only consumer). Gone with it per lesson: the saffron edge, N filled «سأحضر», a danger «إلغاء الحلقة» on every card, and the disabled waiting join.
- The TeacherCancelForm and ConfirmedChip exports from apps/mobile/src/teacher/lesson-actions/index.ts:1-2. Their only outside consumer was TeacherLessonCard.tsx:13 (knip).
- The separate dayWindow lessons query (TeacherTodayScreen.tsx:53): today's rows come from the aheadWindow data.
- The family-status chip on open lessons ahead, replaced by her own word. The status word stays for excused, late, no_show and completed.
- The year and the always-on zone sentence (TeacherTodayScreen.tsx:25,60), and the empty hint «تظهر الحلقات هنا فور حجزها من الإدارة» (:100; the key stays for web).
- reportAction / ReportAction (apps/mobile/src/teacher/lib/day.ts:28-45) and their cases.
- «سأحضر جميع الحلقات» from the draft: not built.

### Merge

- Four join paths become one:
  - the hero lead from lessonPlan with joinPhase and wayIn
  - in rows, the lead drawn by TeacherRowAction (AgendaLessonRow join={false})
  Rows never show JoinAround's join, which stays live until ends_at + 120 min.
- «سأحضر»: the filled hero lead; secondary on rows; in the sheet. Rows otherwise read «بانتظار تأكيدك».
- Cancel lives in TeacherLessonSheet only (TeacherLessonTools with onCancelled).
- The report word and button come from reportStage, not the pending list. «سيُرسل إلى الأسرة بعد N دقيقة» is shown while in the window (docs/46 B5). The sheet's one report button is DetailsStudents' own.
- Two lessons queries (day + ahead) become one aheadWindow query.
- The header, banner, notice and LiveSessions, fixed above a FlatList, become one scroll with one pull.

### Interactions

- Hero: one tap on the filled lead. Join uses useJoinClassroom (busy «جارٍ إدخالك الحلقة…», ErrorLine) or Linking.openURL(lesson.meeting_link). «سأحضر» is optimistic. A 409 shows «بدأت الحلقة…» under the hero, and key=id stops an error leaking to the next lesson.
- Row inline lead (secondary; a live join is filled), and a row tap opens the sheet (useLessonDetails(ahead.data) keeps it fresh).
- Sheet:
  - JoinClassroomButton (room mode, live or waiting with its hint)
  - «سأحضر»
  - «إلغاء الحلقة» (the reason form inline; write-through)
  - the DetailsStudents report button «اكتب/أكمل/عرض التقرير» once started, opening /teacher/today/report/:id in this tab
  - A landed action closes the sheet and the screen Notice reports it once.
- Due row → the report form; «عرض الباقي (N)» → the pending list.
- Day end «افتح جدولي» → router.navigate('/teacher/schedule'). Bell → notifications (unchanged).
- Pull to refresh spins only for her own pull and refetches the ahead lessons and the pending reports.

### Reactivity

- useMyLessons(aheadWindow(today), focused) and usePendingReports(focused), with focused = useScreenFocused(). Two GETs every 30 s, only while «اليوم» is in front; the poll stops under the report form.
- PR1's teacher push map refreshes «اليوم» within seconds of an admin's move or cancel push while the app is open.
- Optimistic «سأحضر»; write-through cancel. The row leaves when the API answers, and the sheet (still holding the unfiltered lesson) closes via onCancelled.
- All words, the hero, the lead switch at ends_at and the day end are derived from useNow; rows fold at ends_at with no fetch.
- aheadWindow(today) is stable all day, so no key churn.

### Files

- apps/mobile/src/teacher/screens/TeacherTodayScreen.tsx: REWRITE (~110 lines).
  - Hooks: useNow, useViewerTz, useClockCycle, useScreenFocused, useMyLessons(aheadWindow(today), focused), usePendingReports(focused), useTimedNotice, useLessonDetails, usePullRefresh.
  - today = lessonsOn(ahead.data, today, tz); plan = todayPlan(today, 'all', now); due = dueReports(...).
  - No useTeacherMe: the zone line compares viewer and device.
- apps/mobile/src/teacher/today/due-reports.ts (NEW, pure, ~45 lines): today's write/resume first (hero excluded), then pending rows not in today grouped per lesson, oldest first. Plus apps/mobile/src/teacher/today/DueReports.tsx (NEW, ~55 lines) and PENDING_REPORTS_HREF.
- apps/mobile/src/teacher/today/TeacherHero.tsx (NEW, ~85 lines): HeroFrame + lessonPlan lead/peer + «التفاصيل».
- apps/mobile/src/teacher/today/TeacherDayEnd.tsx (NEW, ~55 lines).
- apps/mobile/src/teacher/lessons/TeacherLessonRow.tsx (NEW), TeacherRowAction.tsx (NEW, a LEAD Record lookup) and teacher-word.ts (NEW). Shared with mobile-schedule.
- apps/mobile/src/teacher/lesson-actions/TeacherLessonSheet.tsx (NEW, ~55 lines, exported from lesson-actions/index.ts): LessonDetailsSheet role='teacher', actions = room-only JoinClassroomButton + TeacherLessonTools, and an onReport prop passed through. No own report button. Shared with mobile-schedule.
- apps/mobile/src/calendar/details/LessonDetailsSheet.tsx: an optional onReport?: (lessonId: string) => void passed to DetailsStudents (:66).
- apps/mobile/src/calendar/details/DetailsStudents.tsx: TEACHER_LABEL keyed by reportStage (client-core) instead of teacherReport (:18-30, replaced in place); the press calls onReport when given, else today's reportHref + pushInTab. details-text.ts (137/150) is untouched.
- apps/mobile/src/teacher/lesson-actions/TeacherLessonTools.tsx: the prop notice → onDone(text) and an optional onCancelled; remove the in-sheet Notice (:52).
- apps/mobile/src/teacher/lesson-actions/index.ts: drop the TeacherCancelForm and ConfirmedChip exports (:1-2); add TeacherLessonSheet.
- apps/mobile/src/calendar/agenda/AgendaLessonRow.tsx (SHARED with admin and sales): optional meta and chip, and join?: boolean (default true = JoinAround as today, :87-89). It stays at about 100 lines. JoinClassroomButton.tsx is unchanged.
- apps/mobile/src/today/hero/HeroFrame.tsx (NEW, extracted from HeroCard.tsx:33-63); HeroCard renders identically for admin and sales.
- apps/mobile/src/today/components/EndedFold.tsx: an optional `rows?: ReactNode` in place of RowsCard (default unchanged).
- apps/mobile/src/today/components/TodayHeader.tsx: tree 'teacher' + an optional dateLine; shortDate(now) in today/lib/lesson-text.ts.
- apps/mobile/src/teacher/lib/day.ts: delete reportAction; add aheadWindow(date) = { from: dayWindow(date).from, to: from + 15 days } (keeps dayWindow's −14 h pad, :15).
- DELETE the TeacherLessonCard/TeacherLessonActions/LiveSessions files and tests listed under remove. apps/mobile/src/live/Today.live.test.tsx:32-46: teacher case = exactly one «ادخل الحلقة» on the hero.
- docs/46-teacher-portal.md:164-168 (C7): reword to «confirm + cancel in the sheet opened from the «اليوم» row and the hero's lead, and in the «جدولي» sheet».
- packages/shared/i18n ar/en: the keys below.

### Tests

- teacher-lesson-plan.test.ts (PR1, client-core):
  - States: awaiting, confirmed, running, write, resume, window (+12 min), back to status at edit_until.
  - An old cache (no report) → write.
  - joinPhase: live in the window before ends_at, after from ends_at to closes_at, off after.
  - Lead order. After ends_at the report leads and join is a peer. A fixed link leads only while live.
  - wayIn: own link → link; none or platform → room.
  - teacherCanPropose false with a pending proposal.
- due-reports.test.ts: a lesson that started after the pending fetch still appears; the hero is skipped; two pending students of one lesson → one row, 'resume' if any draft; ordering; pending undefined → today only.
- TeacherHero.test.tsx:
  - A running platform lesson → exactly one «ادخل الحلقة» lead + «اكتب التقرير» peer.
  - After ends_at it is no longer the hero (pickHero).
  - «سأحضر» flips the chip before the response.
  - A 409 → «بدأت الحلقة…».
  - A remount with another id clears the error.
- DueReports.test.tsx: 5 rows → 3 + «عرض الباقي (2)» pushing PENDING_REPORTS_HREF; a row → /teacher/today/report/<id>.
- TeacherDayEnd.test.tsx: no lessons → «لا توجد حلقات اليوم» + the next pointer; nothing ahead → noneSoon; «افتح جدولي» navigates.
- TeacherLessonSheet.test.tsx:
  - Room-mode join present, link-mode join absent.
  - Exactly ONE report button after the start, and it calls onReport.
  - A landed cancel calls onClose once.
- TeacherTodayScreen.test.tsx (rewrite, ≤150 lines):
  - The short date.
  - No zone sentence when the viewer tz equals the device tz.
  - The hero and the pending block.
  - No «جلسات مباشرة», no per-row «إلغاء الحلقة».
  - ONE lessons GET, with the aheadWindow URL. This replaces the dayWindow URL pin at :86-88.
- TeacherTodayScreen.sheet.test.tsx and .live.test.tsx (NEW):
  - row → sheet → cancel POSTs {reason}, and the notice «أُلغيت الحلقة.» shows once
  - the 30 s refetch only while focused
  - a background refetch never sets refreshing
  - an ended lesson sits in the fold with no join
- AgendaLessonRow.teacher.test.tsx: meta, chip and join={false}; the defaults render as before (the DayScheduleScreen and TeacherCalendarScreen suites stay green).
- DetailsStudents.test.tsx: teacher labels from reportStage; onReport is called instead of pushInTab when given.
- TodayHeader.test.tsx: dateLine overrides «بتوقيت الرياض». HeroCard.test.tsx and Today*.test.tsx are unchanged as the regression guard.

### i18n

- NEW teacherBoard.offline «انقطع الاتصال قبل وصول الرد. حاول مرة أخرى عند عودة الإنترنت.» / en equivalent (PR1).
- Reused from web-today/PR1: teacherDash.awaiting, nextOn, noneSoon, openSchedule; reports.familySend.sendsIn, pendingMore, pending; teacherBoard.cancelledOk (changed).
- Reused: today.running, next, inMinutes, details, rest, endedFold, quietTitle; teacherDash.noLessonsToday, join; reports.open/resume/view; classroom.enter/joining/opensAt; schedule.zoneNote; mobile.lastUpdated.
- REMOVED: live.title, live.startsAt, live.teacher (keep live.now for LiveBadge). Keep teacherDash.emptyHint (web).

### Risks

- docs/47 PR2 coordination: PR2 drops its planned PendingBanner edit (the banner is gone) and instead sets PENDING_REPORTS_HREF = '/teacher/reports/pending'. Until then the row lands on today's «التقارير» pending pill.
- docs/47 PR1 makes the reports tab the student file. The sheet's report button must keep using onReport so it never jumps into that tab from «اليوم».
- Shared admin and sales leaves (AgendaLessonRow, LessonDetailsSheet, DetailsStudents, HeroCard → HeroFrame, EndedFold, TodayHeader) get only optional props with byte-identical defaults; the existing suites are the guard.
- Gating the sheet's JoinClassroomButton by wayIn depends on owner Q3. If the owner keeps it, the sheet keeps the unconditional join (TeacherScheduleScreen.tsx:90).
- An old persisted cache has no students[].report, so rows read «اكتب التقرير» until the first refetch, seconds after mount.
- The row word in the end slot («سيُرسل إلى الأسرة بعد 12 دقيقة») wraps; check at 390pt and at 200% font.
- File budgets: TeacherTodayScreen about 110 and TeacherLessonTools about 75; logic lives in pure files at 80% or more.


## Screen — mobile-schedule: teacher «جدولي» (apps/mobile/app/teacher/schedule.tsx → apps/mobile/src/teacher/screens/TeacherScheduleScreen.tsx)

### Layout

1) ONE ScreenHeader h1 (the header role and the connecting bar are kept):
   - Title: the week range «3 أكتوبر – 9 أكتوبر» (weekLabel).
   - Trailing: [«اليوم» pill, only on another week] [‹] [›], 44pt each.
   - Subtitle: «الأوقات بتوقيتك (القاهرة)» + «آخر تحديث HH:MM» when stale.
   - No Mark and no separate PeriodSwitcher row.
2) WeekStrip: 7 equal cells السبت→الجمعة with no scroll at 390px. Each cell shows the short weekday (12pt), the day number (18pt tabular) and the count of lessons that take place.
   - A saffron nuqta marks a day with a lesson awaiting «سأحضر».
   - Today has a gold-soft underline; the picked day has the lapis wash.
   - It is a tablist.
3) The screen Notice for 5 s after an action lands.
4) The picked day's lessons in ONE inset card as TeacherLessonRows (shared with «اليوم»): time | names / «45 دقيقة · عند الطالب 15:00» | «مباشر الآن», تجريبية/تعويضية, the word chip, and one inline lead.
   - Empty day: «لا توجد حلقات في هذا اليوم», or «لا توجد حلقات هذا الأسبوع» when the whole week is empty.
   - Pull to refresh.
5) Row tap → TeacherLessonSheet with onReport → /teacher/reports/:id (or the schedule stack):
   - head chips (no third-person «أكّد المعلم الحضور»)
   - the live join → «سأحضر» | «إلغاء الحلقة» → the waiting join (room mode)
   - «الموعد»
   - «الطلاب», with the one report button
   - «بيانات الحلقة» only when a fixed URL, the no-link line or a cancel reason exists
   A landed action closes the sheet and the screen Notice reports it.

### Remove

- Header title «جدولي» and the Mark (TeacherScheduleScreen.tsx:49); the tab bar already says it.
- The separate PeriodSwitcher row (:50-58), moved into the header.
- The availability line and its two requests on this screen:
  - useMyAvailability (apps/mobile/src/teacher/lib/queries.ts:44-48, its only caller; delete for knip)
  - useTeacherMe (:37, used only for that tz; no meeting-link fallback is added, see parity)
  - grid.refetch
  - RIYADH_TZ (:39,70,78)
  AgendaDayView keeps `available` for the admin TeacherCalendarScreen. «أوقاتي» in «المزيد» keeps the data.
- The 7 stacked AgendaDayView groups and their repeated «لا توجد حلقات» (:59-74), on the teacher screen only.
- The waiting and closed joins on rows (JoinAround via AgendaLessonRow.tsx:87-89; the teacher row passes join={false}) and the pre-start status chip. Rows keep the live lead and the word.
- The in-sheet timed notice (TeacherLessonTools.tsx:52; :42,91), done in mobile-today.
- «أكّد المعلم الحضور» in the teacher's sheet head (DetailsHead.tsx:27-29), plus her own name and the platform sentence in DetailsAbout for role 'teacher' (DetailsAbout.tsx:27; DetailsLink.tsx:36-42).
- RefreshControl bound to isRefetching (:75), done in PR1.

### Merge

- Title + week switcher → one ScreenHeader with WeekNav (PeriodArrow and TodayPill exported from PeriodSwitcher, whose default render is unchanged).
- Week view + day groups → WeekStrip + one day: useFollowingDay(today) and start = weekStart(date), the same model as DayScheduleScreen.tsx:56,63. Days are bucketed with lessonsOn (apps/mobile/src/teacher/lib/day.ts:22), so excused lessons with a report due show, as on «اليوم».
- Three confirm signals → the screen Notice + the word/chip.
- «بيانات الحلقة» → returns null when it has no rows, which drops one card from most platform sheets.
- Rows and the sheet are the «اليوم» components: TeacherLessonRow and TeacherLessonSheet. The sheet has one report button, DetailsStudents'.

### Interactions

- Tap a strip cell to pick a day with no request; each cell's a11y label reads «الخميس 1 أكتوبر، 3 حلقات، حلقة واحدة بانتظار تأكيد حضورك». Today is the default and follows midnight and the return to the foreground.
- ‹ › move ±7 days on the same weekday; «اليوم» jumps back.
- Inline actions:
  - «سأحضر»: optimistic; the row, «اليوم» and the sheet flip together, with an ErrorLine on rollback.
  - «ادخل الحلقة» (filled): while live, until ends_at.
  - «اكتب/أكمل التقرير»: after the end.
- Report presses go to onReport(id) → /teacher/reports/:id. Optional: a schedule stack, so back returns here (below).
- Sheet cancel keeps the required-reason form (write-through) and closes on success.
- Skipped:
  - a day swipe (it fights the tab and back gestures in RTL)
  - search and filters
  - a «الملغاة» toggle (cancelled lessons leave via lessonsOn, as on «اليوم»)
  - the next-week prefetch

### Reactivity

- useMyLessons(weekWindow(start, tz), focused) with focused = useScreenFocused(): a 30 s poll while in front; optionally `enabled: focused` refetches at once on tab return (keep only if its CI test passes).
- The teacher push map and the cancel invalidation come from PR1.
- Optimistic confirm patches every [...lessons,'mine'] cache. This also fixes confirmedNow bridging only the hook instance that fired; the row and the sheet are separate instances.
- The useNow tick drives the join window, «مباشر الآن», the «سأحضر» cutoff and the report lead at ends_at.

### Files

- apps/mobile/src/teacher/screens/TeacherScheduleScreen.tsx: rewrite (~85 lines): useFollowingDay, useMyLessons(…, focused), weekDays(), ScreenHeader + WeekNav, WeekStrip, Notice, ScheduleDayList, and TeacherLessonSheet with onDone = (text) => { details.close(); notice.show(text) } and onReport.
- apps/mobile/src/teacher/schedule/week-days.ts (NEW, pure, ~35 lines): 7 × { date, lessons: lessonsOn(...), awaiting: count of teacherCanConfirm }.
- apps/mobile/src/teacher/schedule/WeekStrip.tsx (NEW, ~75 lines). It uses FilterPills tokens but not FilterPills itself, because FilterPills.tsx:107-119 scrolls the picked pill off screen.
- apps/mobile/src/teacher/schedule/WeekNav.tsx (NEW, ~30 lines).
- apps/mobile/src/teacher/schedule/ScheduleDayList.tsx (NEW, ~60 lines): a body lookup loading|error|empty|rows; an InsetGroup of TeacherLessonRow.
- apps/mobile/src/calendar/overview/PeriodSwitcher.tsx: export the Arrow as PeriodArrow and extract TodayPill (:39-49); identical render.
- apps/mobile/src/calendar/lib/week.ts: weekdayShort(date).
- apps/mobile/src/calendar/details/LessonDetailsSheet.tsx:61 passes role to DetailsHead; DetailsHead.tsx hides the teacherConfirmed chip for 'teacher'; DetailsAbout.tsx for 'teacher' drops her own name and the platform sentence, keeps the URL, noLink and cancel_reason rows, and returns null when empty.
- apps/mobile/src/teacher/lib/queries.ts: delete useMyAvailability (:44-48) and the AvailabilityRow import.
- OPTIONAL: apps/mobile/app/teacher/schedule.tsx → schedule/_layout.tsx (TabStack) + schedule/index.tsx + schedule/report/[lessonId].tsx, mirroring app/teacher/today/. onReport then targets /teacher/schedule/report/:id, so back from a report returns to «جدولي» instead of the «الطلاب» tab that docs/47 PR2 makes of the reports folder.
- packages/shared/i18n ar/en: the keys below.

### Tests

- week-days.test.ts: 7 dates from Saturday; a Cairo 23:30 lesson buckets on Cairo's day; excused kept; cancelled and rescheduled dropped; awaiting counts only open, not-started, unconfirmed lessons.
- WeekStrip.test.tsx: 7 tabs with the picked one selected; the a11y label holds the count and the awaiting phrase; a press calls onPick(date).
- TeacherScheduleScreen.test.tsx:
  - Update the pins at :25,31 (no availability and no /teachers/me call), :33 (title = weekLabel) and :42 (noLessonsWeek).
  - Add: today picked shows only today; another cell shows its day with no fetch; an empty day reads calendar.emptyDay.
- TeacherScheduleScreen.details.test.tsx:
  - :36 still has 2 «ادخل الحلقة» for a live room lesson (row + sheet).
  - An early lesson has 0 on the row and 1 disabled in the sheet.
  - A lesson with its own link and no platform has no classroom join (owner Q3).
  - The sheet shows exactly one report button after the start.
- TeacherScheduleScreen.actions.test.tsx: «سأحضر» is on the row and in the sheet, so query within(sheet); after confirm or cancel the sheet closes and the notice is on the screen.
- TeacherLessonTools.test.tsx: onDone jest.fn receives confirmedOk and cancelledOk; no Notice is rendered.
- DetailsHead.test.tsx and DetailsAbout.link.test.tsx: teacher variants; admin and sales unchanged.
- details-text.test.ts: unchanged except :74 with the optional stack and :68 when docs/47 lands. CI only.

### i18n

- NEW teacherBoard.awaitingCount (plural): one «حلقة واحدة بانتظار تأكيد حضورك», two «حلقتان بانتظار تأكيد حضورك», few «{n} حلقات بانتظار تأكيد حضورك», other «{n} حلقة بانتظار تأكيد حضورك» / en «{n} awaiting your confirmation».
- Reused: calendar.emptyDay, teacherDash.noLessonsWeek, teacherDash.studentTime, schedule.today/prevWeek/nextWeek/week/lessonCount/zoneNote, teacherBoard.confirm/confirmedChip/confirmedOk/cancel/cancelledOk, reports.open/resume, classroom.enter.
- Western digits and MSA throughout; every key mirrored in en.json (i18n-parity.test.ts).

### Risks

- It consumes TeacherLessonRow, TeacherLessonSheet, the AgendaLessonRow props, the LessonDetailsSheet onReport and the TeacherLessonTools onDone from mobile-today, so it lands AFTER mobile-today.
- Shared admin leaves (PeriodSwitcher, DetailsHead, DetailsAbout, LessonDetailsSheet) get optional changes only; the DayScheduleScreen, TeacherCalendarScreen and SalesStudentScreen sheet suites must stay green.
- WeekStrip at 390px: «الأربعاء» at 12pt is about 42px in a 50px cell (numberOfLines 1); check at 200% font.
- The `enabled: focused` refetch relies on TanStack refetching a stale query when enabled turns true. It is unverified with no node_modules here, so it is optional.
- docs/47 owner call 3: the sheet still shows raw cancel_reason, including series-end text, until the API follow-up at lessons.mapper.ts:80. That change is API-only and outside this PR.
- TeacherScheduleScreen.tsx is at 97 lines and must stay ≤150; the bulk lives in the new schedule/ files.


## Screen — mobile-students: teacher «الطلاب» list (apps/mobile/src/teacher/screens/TeacherStudentsScreen.tsx; today under «المزيد», and after docs/47 PR2 the root of the «الطلاب» tab at app/teacher/reports/index.tsx)

### Layout

1) ScreenHeader h2 «الطلاب» with the connecting bar. No total count, since the pills carry the counts. No back button: after docs/47 PR2 this is a tab root.
2) FilterPills (36pt) «مشترك 12 · تجريبي 3 · الكل 17», default «الكل». docs/47 PR2 may add «موقوفون مؤقتًا».
   - Counted with countByKind over the concatenation of both ?kind lists. «مشترك» = active only; pending_renewal and expired count only under «الكل».
   - Counts show only once both kinds have loaded; both load when the screen opens.
3) One inset card in the 16pt gutter, soonest next lesson first (none last, then Arabic name). Each row has three lines:
   - name 15/600 + the AB code as quiet LTR meta, and a status chip for every status except active
   - the next lesson «اليوم 5:00 م» / «غدًا 18:30» / «الأحد 16 نوفمبر 17:00» / «لا توجد حلقة قادمة», with an ink hollow nuqta on today's rows
   - the facts tags line «القرآن الكريم · جزء عمّ · 9 سنوات»
4) A row tap opens the student file /teacher/reports/student/:id (docs/47 PR1 screen).
5) Pull to refresh.
Empty: EmptyState title + one hint Note. Error: ErrorState with retry only when nothing is cached. First load: «جاري التحميل».

### Remove

- The clipped '\n'-joined subtitle (StudentRow.tsx:30 against ListRow numberOfLines 1). The next lesson becomes the subtitle, and the facts move to ListRow's existing `tags` slot.
- The visible «الحلقة القادمة:» prefix; the full sentence goes to subtitleLabel for screen readers.
- The header total count (TeacherStudentsScreen.tsx:56).
- The `never mixed` two-list rule (:39) and the subscribed default (docs/46 D4 decided one list).
- refreshing={list.isRefetching} (:63), done in PR1.
- The dialect doc comment (StudentRow.tsx:8, «الحلقة الجاية… مفيش»).

### Merge

- Two lazy per-kind loads → useStudentLists() calls useMyStudents('subscribed') and useMyStudents('trial') together and concatenates them. The two status sets are disjoint, so no dedupe is needed. Pills and rows come from boardStudents(all, kind) and countByKind(boardStudents(all, 'all')), so switching pills never blanks the list.
- Pill labels → studentLists.active/trial/all «مشترك · تجريبي · الكل», the same words AND the same counting as the web board.

### Interactions

- Pills with counts: undefined while loading or failed, never a 0 placeholder.
- Instant pill switching from the cache.
- Row → router.push(studentFileHref(id)) with studentFileHref = (id) => `/teacher/reports/student/${id}` (the docs/47 file; exported as the one seam). Row a11y hint t.teacherBoard.openFile.
- «اليوم/غدًا» relabel at midnight from the useNow tick, with no fetch.
- Skipped:
  - search: about 10–30 students per teacher; SearchField and normalizeArabic are ready if a teacher passes about 20
  - inline lesson actions: the student view has no lesson id
  - optimistic updates: no mutation

### Reactivity

- No poll on this screen. Each ?kind call reads 60 days of lessons with no upper bound (teacher-students.service.ts:26-38). Freshness comes from:
  - the pull
  - PR1's teacher push map (lesson kinds and new_student invalidate the ['teachers','me'] prefix, which covers both ?kind keys)
  - her cancel anywhere invalidating the same prefix
  - the default stale-on-mount refetch when the screen opens
- usePullRefresh(() => Promise.all([sub.refetch(), trial.refetch()])).
- The persisted offlineFirst cache keeps the list offline (unchanged).

### Files

- apps/mobile/src/teacher/lib/student-list.ts (NEW, pure, ~45 lines):
  - currentStudents(rows, kind) = boardStudents(rows, kind) sorted by next_lesson_at ascending, null last, then localeCompare 'ar', returning a new array.
  - nextLessonText(startsAt, { now, tz, cycle }) → { text, label, today } via a DAY_WORD {0: todayAt, 1: tomorrowAt} lookup over calendarDaysBetween, else whenIn.
- apps/mobile/src/teacher/lib/students-queries.ts: useStudentLists() → { all, counts, pull }. useMyStudents keeps no refetchInterval.
- apps/mobile/src/teacher/screens/TeacherStudentsScreen.tsx: pills from a lookup including 'all' (default); the EMPTY lookup (studentLists.emptyActive/emptyTrial/emptyAll) + the emptyHint Note; {...pull}; renderRow { student, tz, now }. About 85 lines.
- apps/mobile/src/teacher/components/StudentRow.tsx: props { student, tz, now }; subtitle and subtitleLabel; the today nuqta; tags facts with teacherStudents.ageYears; the chip for every status except active; studentFileHref; MSA comment. About 50 lines.
- packages/shared/i18n ar/en: the keys below.

### Tests

- student-list.test.ts:
  - With now 2026-11-13T09:00Z and tz Africa/Cairo: 15:00Z → «اليوم 17:00» with today=true; next day → «غدًا …»; +3 days → whenIn; null → noNextLesson.
  - Zone boundary: 22:30Z is غدًا in Cairo and اليوم in UTC.
  - Sort: null last, name tie-break, input not mutated.
  - kind 'active' drops pending_renewal and expired.
- TeacherStudentsScreen.test.tsx (update):
  - Both ?kind fetched on open.
  - With one active, one pending_renewal and one trial student, the pills read «مشترك 1 · تجريبي 1 · الكل 3».
  - «الكل» is the default and mixes both; this replaces the 'never mixed' pin at :49.
  - Switching pills makes no fetch and shows no loading.
  - A row press → '/teacher/reports/student/s1'.
- TeacherStudentsScreen.row.test.tsx (NEW): facts inside list-row-tags, not in the subtitle; rows ordered; the openFile hint; the active row has no chip; the empty hint.
- TeacherStudentsScreen.refresh.test.tsx (NEW): no refetch on a 30 s timer advance; refreshing stays false during a background refetch; onRefresh refetches both kinds.

### i18n

- NEW teacherStudents.todayAt «اليوم {time}» / «Today {time}»; teacherStudents.tomorrowAt «غدًا {time}» / «Tomorrow {time}».
- NEW teacherStudents.emptyHint «يظهر طلابك هنا عندما تُسندهم الأكاديمية إليك.» / en equivalent.
- Reused: studentLists.active/trial/all/emptyActive/emptyTrial/emptyAll, teacherStudents.ageYears (web-students), teacherStudents.nextLesson/noNextLesson (screen-reader label and the no-lesson row), teacherBoard.openFile (docs/47).
- REMOVED after a grep: teacherStudents.age, subscribed, emptySubscribed, emptyTrial.

### Risks

- Order: lands AFTER docs/47 PR2, which moves this screen to the «الطلاب» tab root, turns more/students.tsx into a redirect and adds the paused pill. The draft's /teacher/more/students/[id] route and back-to-More button are dropped, because they conflict with docs/47:110, 318 and 335.
- Membership differs from web: the 60-day endpoint lookback (teacher-students.service.ts:9-11) versus D4 me.students. It is listed as an accepted parity gap with a follow-up. Counting and labels now match the web.
- Package-ended chips stay saffron 'act' (status-style.ts:63-64), although a teacher cannot act on renewal; neutral would be a one-prop change.
- The tags line adds about 18pt per row.
- No poll: a lesson an admin adds while the list is open shows on the next pull, push, or screen return.

## Conflicts with #711 and docs/47

- PR #711 feat/teacher-page-switches (OPEN, owned by effort a). Footprint per docs/47:515-518: TeacherNav(+tests), TeacherTabs, TeacherMoreScreen(+tests), TeacherDashboard.tsx, the teacher barrels and ar/en.json. It is not in this checkout (feat/teacher-feature-switches has no diff vs 8537d7286), so line overlap is unverified.
  - Rules: never touch TeacherNav, TeacherTabs or TeacherMoreScreen. Keep TeacherDashboard.tsx:33-40 (head and meeting buttons) and :46 (InternalMeetingsList) byte-identical.
  - Sequence: merge #711 before the web-today PR, and rebase ar/en.json.
  - Ask (a) to render nothing for an empty internal-meetings list on the teacher home, and a skeleton instead of «جارٍ التحميل».
- docs/47 PR1 (student file, effort b):
  - It renames routes/teacher/students.tsx → students.index.tsx and adds students.$studentId.tsx.
  - It edits teacher-students/columns.tsx:37 (name link) and teacher-board/drawer/StudentDrawer.tsx (a «ملف الطالب» link).
  - It edits PendingReports.tsx (props { tz; studentId? }, docs/47-teacher-student-file.md:264) and renders it in every student file (docs/47:250).
  - On mobile it makes /teacher/reports/student/[id] the file and deletes teacher/board/{TeacherAttendanceScreen,StudentLessonsPanel,BoardLessonRow}.
  Sequence: the web-today and web-students PRs go AFTER PR1.
  - web-today keeps the studentId prop, adds `except`, and adds no skeleton, so the 3-row/<details> block and the error line are harmless inside a file.
  - web-students deletes columns.tsx and the drawer (PR1's two small edits and TeacherBoard.drawer.test go with them) and routes board rows to /teacher/students/$studentId.
  - Mobile row targets are already /teacher/reports/student/:id (StudentRow.tsx:31), so nothing changes there.
  - The mobile sheet's report button uses onReport so it never lands in the reports tab, which becomes the student file.
- docs/47 PR2:
  - It retitles the mobile reports tab «الطلاب» with TeacherStudentsScreen as its index and turns more/students.tsx into a redirect.
  - It adds the paused third pill (mobile) or tab (web).
  - It adds /teacher/reports/pending and edits PendingBanner.
  Resolution:
  - mobile-today deletes PendingBanner and exposes PENDING_REPORTS_HREF. PR2 sets it to '/teacher/reports/pending' instead of editing the banner.
  - mobile-students lands after PR2 and keeps the paused pill.
  - If web-students lands first, PR2's web paused list becomes a fourth board segment (me.students status 'paused') instead of a TeacherStudents tab.
- docs/47 mobile board-window.ts loses its only consumer (StudentLessonsPanel) in PR1. mobile-today adds aheadWindow in teacher/lib/day.ts, built on dayWindow, so PR1 may delete board-window.ts freely (knip). Whoever lands second reconciles.
- docs/47 owner call 3 (series-end text hidden from teachers): an API follow-up at lessons.mapper.ts:80. Our DetailsAbout teacher tweak keeps the cancel_reason row and picks the change up automatically.
- Internal overlaps between our own plans, resolved by assigning one owner per file:
  - PR1 owns:
    - client-core teacher-lesson-plan.ts and pick-hero.ts
    - web teacher/api.ts and reports/api.ts polls, use-teacher-confirm/cancel and patch-my-lesson
    - the LessonActions.tsx:43 and LessonReportLinks.tsx:19 clocks
    - mobile queries.ts, teacher-lesson-api.ts, push-refresh.ts and useNotificationHandling
    - the three usePullRefresh swaps
    - teacherBoard.cancelledOk
  - web-today owns: TeacherLessonCard, Lead, Row, Drawer, TeacherConfirm, TeacherProposal, TeacherCancelDialog, the LessonActions `teacher` prop and AdminButtons split, PendingReports, TodayPanel/split-today.
  - web-students owns: TeacherBoard, board-rows, cells, StudentCell (including the caption removal), the teacher/index.ts export.
  - web-schedule owns: WeekGrid, LessonChip, MyWeek, the home week and availability tab removal (DashboardPanel, LessonDayList, weekLessons), openMyLesson, and the docs/03 R-TCH-03 and docs/46 C1 rewording.
  - mobile-today owns: the AgendaLessonRow props, LessonDetailsSheet onReport, DetailsStudents reportStage, HeroFrame, EndedFold rows, TodayHeader, TeacherLessonRow/Sheet, TeacherLessonTools onDone, and the lesson-actions barrel.
  - mobile-schedule owns: PeriodSwitcher, DetailsHead/DetailsAbout, week.ts.
- Dropped draft and critic choices that contradicted each other:
  - the per-card «⋯» MoreMenu (web-today) versus outcomes one-tap (web-schedule) → outcomes in the drawer card
  - relabelled versus removed pre-start excuse → removed (owner Q4)
  - propose inline prop versus Dialog → Dialog
  - optimistic versus server cancel on mobile → write-through
  - 30 versus 60 s → 30 s
  - push-data.ts versus push-refresh.ts → push-refresh.ts, teacher tree only
  - classroom.joinMeeting reworded versus deleted → deleted, with teacherDash.join used everywhere
  - board caption kept versus removed → removed
  - doneCount → today.endedFold
  - dueMore and pendingMore → reports.pendingMore
  - two openSchedule keys → teacherDash.openSchedule
  - reports.sendsIn → reports.familySend.sendsIn
  - teacherDash.openLesson → lessons.sheet.openRow
  - a mobile me.meeting_link fallback → not added
  - a sheet report button of its own → DetailsStudents' button with onReport
  - JoinAround `waiting` prop → AgendaLessonRow join={false}
  - «سأحضر جميع الحلقات», usePrefetchQuery, a students poll and the /teacher/more/students/[id] route → cut

## Gap check (completeness critic)

- [confirmed] The lead never becomes «اكتب التقرير» when the spec says it does. lessonPlan orders join > confirm > report with joinLive = isOpenLesson && canJoinNow, but the join window stays open until ends_at + join_closes_after_min, which defaults to 120 (packages/schedule/src/classroom/join-window.ts:46-58; packages/shared/src/settings/exports.test.ts:66). A teacher's lesson stays open until her report sets the outcome, so join leads for the whole lesson and for 2 h after it. In that span the filled «ادخل الحلقة» is the row and hero lead while the word chip says «اكتب التقرير», and mobile EndedFold rows (join='open') also show a filled join. This breaks the spec's TeacherLessonRow test ('After the start → «اكتب التقرير»') and its reactivity claim that the lead switches at the start. Fix: joinLive && now < ends_at, with join as a peer after the end. Today's cardPlan has the same flaw (apps/mobile/src/teacher/components/TeacherLessonActions.tsx:47-58; use-join-classroom.ts:46-50).
- [confirmed] wayIn does not mirror roomFor. The spec computes wayIn = platform || !link with link = lesson.meeting_link ?? me.meeting_link. roomFor (apps/api/src/modules/messaging/reminders/plan/reminders.links.ts:29) reads only lesson.meeting_link and also needs ctx.livekit and ctx.joinOk. Take a static teacher's lesson with no link of its own, for example one created before she had a link: the family is sent the classroom, but her UI leads to her Meet link, so they end up in different rooms. wayIn must use lesson.meeting_link without the fallback. Needs-check: whether the client can see the livekit/joinOk flags.
- [confirmed] Web splitToday keeps closed lessons in view. Web lessonsOnDay (apps/web/src/features/teaching/schedule/lesson/lessons.ts:65-69) does NOT drop cancelled or rescheduled lessons, unlike mobile lessonsOn (apps/mobile/src/teacher/lib/day.ts:22-26). With rest = 'not ended OR stage ∈ write|resume', a cancelled lesson that has not ended stays in «بقية اليوم», and a moved lesson's old slot shows next to its new one. This contradicts the split-today test ('cancelled → done') and the claim that write-through cancel closes the row. Filter with isClosedLesson, and count «اليوم n» the same way.
- [confirmed] Excluding the hero from the «اليوم» rows breaks the empty state and several e2e specs:
  - If the only lesson today is the hero, TodayPanel shows «لا توجد حلقات اليوم» plus the next-lesson pointer under a hero showing that same lesson. «Empty» must mean no lessons today at all.
  - seedPackageStudent lessons start at now−30 min and last 90 min (e2e/support/finance/money.ts:45-47,89), so they are the hero, not rows. journey-2-report.spec.ts:22-26 cannot 'open the row' and must use the hero's «التفاصيل».
  - teacher-isolation.spec.ts:111 asserts role=article in the today panel. It is not listed (the spec only says :110 keeps its tab click), and the new rows are not articles.
  - teacher-week-history.spec.ts:59 asserts the JoinLink region on /teacher. That breaks because startedToday() gives a running hero, and the spec lists only :61-81.
- [confirmed] Removing the home «الأسبوع» tab loses its rolling 7 days. TeacherDashboard.test.tsx:105-112 pins it deliberately ('on a Friday too'). «جدولي» is Saturday to Friday, so on Thursday or Friday the teacher sees only 1–2 days ahead without paging, and on a phone she sees one day at a time.
  The e2e moves are under-specified, because the Pixel 7 project runs these specs (playwright.config.ts:76-79) and gets the day strip:
  - teacher-week-history.spec.ts:68-76 (today, +2 and +4 days) breaks whenever those days cross Friday→Saturday.
  - proposals.spec.ts:55-62,102, proposals-reject.spec.ts:27-37,58 and meeting-link-auto.spec.ts:80-97 (lessons 2 days ahead) have no home surface left.
  They need /teacher/calendar?week=<weekStart(lessonDay)> plus a day-tab pick on mobile, not just 'open the drawer first'.
- [confirmed] PR1's ['teachers','me'] invalidation can blank the web home. teacherMeQuery has retry:false (apps/web/src/features/teaching/teacher/api.ts:14-18), and TeacherDashboard.tsx:41-44 checks isError before data. So one failed refetch after «سأحضر» or a cancel replaces the whole home with a FormAlert, and MyReports.tsx:32-34 shows the alert over good data too. The spec deliberately leaves :41 alone in PR1. Either make :41 data-first in PR1, or drop the web invalidation: confirm changes nothing under ['teachers','me'], and cancel only changes the facts query's next_lesson_at.
- [confirmed] The mobile push map is not scoped to the teacher tree. useNotificationHandling(tree) (apps/mobile/src/core/push/useNotificationHandling.ts:39-60) runs in the admin, sales and assistant trees as well. lesson_needs_confirmation goes only to admins, one push per lesson (apps/api/src/modules/messaging/reminders/reminders.job.ts:144-146). With an unscoped map, every such push would invalidate all of an admin's ['lessons'] queries, including the all-teachers overview, and a reminder run would trigger a burst of refetches. Teachers never receive that kind, and report_submitted is admin-facing too. Key the map by PushTree, or gate it on tree==='teacher', and drop those two kinds. pushKind can also return null (push-data.ts:8).
- [confirmed] Two mobile polls are heavier than needed:
  - Students: useMyStudents(kind, focused) issues two GET /teachers/me/students every 30 s while the screen is focused. Each call runs assigned + lessons since 60 days ago with no upper bound + byIds (apps/api/src/modules/people/teacher-students/teacher-students.service.ts:26-38). The web section refuses to poll this same endpoint for that reason (staleTime 5 min), and PR1's push map plus the ['teachers','me'] invalidation already refresh it. Drop this poll.
  - Today: it polls 3 GETs every 30 s (dayWindow, aheadWindow and pending). aheadWindow [local midnight, +14 d) already contains today, so lessonsOn can run on the ahead data and the day query can go (or at least do not poll ahead).
- [confirmed] The mobile «مشترك» pill counts different students from the web one. On mobile «مشترك» is ?kind=subscribed, which returns active + pending_renewal + expired (packages/shared/src/people/schemas/teacher-students.ts:14-17). On the web board «مشترك» is active only, and package-ended students appear only under «الكل» (packages/shared/src/people/students/student-lists.ts:17-23,36-48). Same word, different counts. Build the mobile pills with countByKind/splitByStatus over the concatenated lists.
- [confirmed] Mobile «جدولي» contradicts itself on /teachers/me. The spec removes useTeacherMe (TeacherScheduleScreen.tsx:37) and pins 'no /teachers/me call' in the test. Its parity item, however, makes the sheet's fixed link fall back to me.meeting_link, because the lesson mapper does not coalesce the teacher's link. Keep the cached useTeacherMe and drop the test pin, or do the coalescing in the API mapper.
- [confirmed] The mobile teacher sheet would get two report buttons. LessonDetailsSheet always renders DetailsStudents (LessonDetailsSheet.tsx:66), which for role 'teacher' already draws a report button (apps/mobile/src/calendar/details/DetailsStudents.tsx:45-67). That button goes to reportHref('teacher') = /teacher/reports/:id (details-text.ts:134) via pushInTab, i.e. into the reports tab, which becomes «الطلاب» after docs/47 PR2. TeacherLessonSheet then adds its own 'report button by stage'. From «اليوم», a tap would also jump tabs instead of opening /teacher/today/report/:id. Keep one button, with a tab-relative href.
- [confirmed] PR1's 'mobile TeacherLessonActions re-imports lessonPlan (no behaviour change)' is not true. cardPlan takes { joinLive (room only), link, canConfirm, canCancel, report: ReportAction from the pending list } (TeacherLessonActions.tsx:37-66,107-110). lessonPlan takes wayIn and stage from students[].report, joins for either way in, and drops the link peer. Rewiring it in PR1 changes the Today card's buttons and breaks TeacherLessonActions.test.ts and TeacherLessonCard.buttons.test.tsx. PR1 should add the pure core without rewiring, or list those tests.
- [confirmed] A docs/47 overlap is missing from the conflicts list. docs/47 PR1 edits PendingReports.tsx (props {tz; studentId?}, docs/47-teacher-student-file.md:264) and renders it inside every student file (docs/47:250). web-today's rewrite (3 rows + <details>, a skeleton, an error alert) and PR1's 30 s poll on pendingReportsQuery would then also land in each student file, which today shows nothing once every report is written. Keep the studentId prop, and restrict the skeleton and error UI to the home.
- [confirmed] The web home shows the same due report up to three times. PendingReports lists every started lesson missing a submitted report, today's included (apps/web/src/features/reporting/reports/history/PendingReports.tsx:16-37). TodayPanel's rest keeps ended lessons whose report is due, each with an «اكتب التقرير» lead, and the hero can lead «اكتب التقرير» too. Mobile already dedupes through due-reports, but web does not. Exclude today's lessons from the web pending block, or drop ended rows from rest.
- [confirmed] The cancel dialog's «اقترح موعدًا آخر» has no proposal guard. TeacherCancelDialog receives only lessonId (TeacherCancelDialog.tsx:12-17), so it cannot hide the button when lesson.pending_proposal exists, and the API would answer 409 proposal_pending (TeacherProposal.tsx:26-30 already branches on it). There is also a parity gap: web offers propose on any open lesson, even after the start (TeacherProposal.tsx:31; the API has no start guard, lesson-proposals.service.ts:28-29), while mobile PR8 gates it on teacherCanAct (before the start only). Pick one rule.
- [confirmed] Two new i18n keys duplicate existing ones:
  - NEW reports.sendsIn «يُرسل بعد {when}» duplicates reports.familySend.sendsIn «سيُرسل إلى الأسرة بعد {when}». That key is the docs/46 B5 copy (docs/46-teacher-portal.md:120), already produced by client-core sendLines (packages/client-core/src/teaching/reports/send-lines.ts:28-29). Reuse it.
  - NEW teacherDash.openLesson duplicates lessons.sheet.openRow «تفاصيل الحلقة — {names}».
- [confirmed] Tests and knip updates the spec does not list:
  - LessonActions.hide-confirm.test.tsx:15-23 passes hideConfirm, so the rename to `teacher` breaks typecheck.
  - TeacherDashboard.test.tsx:95-112 (week tab) and :128/:138 (JoinLink) must be rewritten or deleted, not only supplemented by a new tabs file.
  - live-filter.test.ts:27-36 (the liveLessons cases).
  - LiveSessions.en.test.tsx is one of the LiveSessions tests to delete.
  - knip-gate: once StudentLessonsTab is gone, web apps/web/src/features/teaching/teacher/index.ts:9 still exports TeacherLessonCard with no consumer. Once mobile TeacherLessonCard is gone, apps/mobile/src/teacher/lesson-actions/index.ts:1-2 still exports TeacherCancelForm and ConfirmedChip, whose only external consumer was TeacherLessonCard.tsx:13.
- [confirmed] Two problems with the lean LessonChip:
  - Missing fields: ChipLesson (LessonChip.tsx:29-34) has neither ends_at nor students[].report, but teacherLessonState and reportStage need both. The spec only adds teacher_confirmed_at.
  - Design rule: making the status word sr-only on open chips breaks docs/07-design-system.md:27 ('every status shows a nuqta glyph AND the ar.json word'). Keep the short word visible.
- [confirmed] Wrong line references that builders will follow, plus one tight file:
  - LessonChip.tsx:282, :286-290 and :291-296 do not exist; the file has 120 lines. The status word is at about :89-94, the student-time line at :96-99 and the conflict line at :100-105.
  - Mobile queries.ts:89-93 is wrong: useMyAvailability is at queries.ts:44-48.
  - apps/mobile/src/calendar/details/details-text.ts is already at 137/150, so teacherReport must not be moved into it.
- [confirmed] Requirement text is not updated. R-TCH-03 (docs/03-requirements.md:87) says the web dashboard shows 'today / this week', and docs/46 C1 (docs/46-teacher-portal.md:141) assumes the home tabs. Removing the week tab needs R-TCH-03 reworded to point at «جدولي», or the owner's sign-off. It is not among the four owner questions.
- [needs-check] The rule for the mobile Today zone line is inconsistent. The layout says to show «الأوقات بتوقيتك (…)» when the device zone ≠ me.tz, while the test says to hide it when tz (useViewerTz) === me.tz. useViewerTz is the profile tz from /auth/me (packages/client-core/src/core/auth/viewer-tz.ts:13-32), and the times render in it. The useful comparison is therefore viewerTz vs the device zone.

Tests run in CI only (owner rule).

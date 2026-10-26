# Review of PR #164: «موعد تجريبي جديد» (new trial date + history)

An independent, adversarial review (2026-10-25) of `cloud/trial-new-date`. Six reviewers each took one lens: data correctness, scope/security, side effects, history, web + mobile UI (with the heuristic-evaluation, design-qa-checklist and critique-brand-consistency skills), and repo rules. A finding was kept only when it came with a file:line and a concrete failing scenario. The fixes are on `cloud/trial-new-date-review`. New SQL lives in migration `20261025000661_pick_trial_date_guards.sql`; no existing migration was edited.

Totals: **Critical 0 · Important 5 (all fixed) · Minor 23 (11 fixed, 12 not fixed, with the reason given).**

## Important

| # | Where | Scenario | Status |
|---|---|---|---|
| I1 | `apps/api/src/modules/teaching/booking/trial-date/trial-date.plan.ts:62` + `apply_lesson_changes` v3 (`…000475:81`) | An imported upcoming trial (no rule, `chargeable=false`) is moved. The new row's `lesson_students.chargeable` takes its default of true, so it is no longer a trial: it drops out of the history, the next pick books a second trial, the trial re-check can move the student trial → new, and the lesson is charged to a later package. | **Fixed.** Migration 661: after the move, a rule-less new row's students get `chargeable=false`. SQL spec added. |
| I2 | `apps/api/src/modules/teaching/booking/trial-date/trial-date.service.ts:97` | A same-teacher move queued no alert, while the old lesson's queued `teacher_new_student` went stale. If that alert had not been sent yet, the teacher never heard of the student. If it had been sent, the teacher still had the old time. | **Fixed.** The new lesson is always announced (deduplicated by the new lesson id), which gives the same teacher the new time. A dedicated «moved» template is still not available (see M14). |
| I3 | `apps/api/src/modules/teaching/booking/sales/booking/sales-booking.http.test.ts:141` (removed) | The test asserting that an assistant gets 403 for another family's `studentIds` on `/sales/booking/slots` was deleted. No test covered it any more. | **Fixed.** `trial-date.http.test.ts` now covers 403 with and without `excludeLessonId`, and checks that no lesson read and no slot read happen. |
| I4 | `apps/web/src/features/teaching/booking/trial-date/dialog/TrialDateDialog.tsx:56` | When the history GET fails (500, 403 or offline), the dialog shows only its title and the collapsed toggle: no error and no retry. | **Fixed.** The dialog shows «تعذّر تحميل…» with «حاول مرة أخرى» (refetch). Test added. |
| I5 | `apps/web/src/features/teaching/booking/WizardBody.tsx:78` | «اخترنا معلم/ة آخر حلقة تجريبية…» was shown even when that teacher was not preselected (no availability, or not in the list), and it stayed after another teacher was picked. | **Fixed.** It is shown only while the picked teacher is the hinted one. Test added. |

## Minor: fixed

| # | Where | Scenario | Fix |
|---|---|---|---|
| M1 | `20261025000660…sql:43-49` | Two picks with different request ids for a student with no upcoming trial both take `create_booking`, which leaves two upcoming trials. The same happens if a trial is booked between `target()` and `pick()`. | Migration 661: under the student lock, a booking first checks `trial_ahead(students)` and raises `trial_changed` (409). A replay of the booking's own request id is let through. |
| M2 | `trial-date.queries.ts:83` and `…660.sql:37` | A `clientRequestId` equal to any lesson id (for example, another family's lesson id from a conflict) "replays" that lesson: the response is 201 with its times and teacher, nothing is written, and the data leaks past the sales scope. | `trial_date_replay(request, student)` only returns a moved row of that student, or the trial rule's first lesson of that student. `pick_trial_date` raises `trial_date_invalid` (400) for any other existing lesson. |
| M3 | `…660.sql:69` vs `trial-date.plan.ts:35` | The students' audit rows said `via: trial_date` while the lesson and rule rows said `trial_new_date`, so a filter on one value missed half the rows. | Both say `trial_new_date`. |
| M4 | `trial-date.queries.ts:89` | A late retry of a booking request, after that trial was moved earlier on the same rule, returned the moved row (ordered by `starts_at`) instead of the lesson the request created. | The replay takes the rule's first lesson with `rescheduled_from_id is null`. |
| M5 | `ar.json booking.error.trial_changed`; web `TrialReviewStep`, mobile `useTrialDate` | The message said «افتح النافذة» (mobile has no window). After the error, the cached history still described the old upcoming trial. | New MSA text: «تغيّر الموعد التجريبي القادم للتو، فارجع واختر الموعد مرة أخرى.» Both clients invalidate the history on error. |
| M6 | `en.json trialDate.moves` | It used Arabic guillemets «Moved» in English. | Now uses "Moved". |
| M7 | `TrialDatesSection.tsx:19` | A role with `students.read` but without `booking.write` got a 403 history, an enabled button and a blank dialog. | The section renders only with `booking.write`, as mobile already did. Test added. |
| M8 | `apps/mobile/src/trial-date/lib/trial-date-body.ts:42` | Mobile booked in `family_tz`, while web used `student_tz ?? family_tz`. So a student whose own zone differs got different `byday` and local time per platform. | Mobile now uses `student_tz ?? family_tz`. Test added. |
| M9 | web `history-text.ts:25`, mobile `trial-date-text.ts:41` | A zone with Riyadh's clock (Asia/Kuwait, or Cairo in summer time) printed the same time twice. | The family line is hidden when both clocks read the same. Tests added. |
| M10 | `trial-date.history.test.ts:13,27` | The fixture had a lesson ending before it starts, and an assertion locked that in. | The fixture's `ends_at` is consistent. |
| M11 | `e2e/tests/pick-trial-date.sql.spec.ts` | The booking case seeded an upcoming trial, which the M1 guard now correctly refuses. | The booking case cancels the seeded trial first. A new `pick-trial-date.guards.sql.spec.ts` covers I1, M1 and M2. |

## Minor: not fixed

| # | Where | Scenario | Why not |
|---|---|---|---|
| M12 | `pick_trial_date` (no clash re-check in SQL) | Two different students picked into the same teacher slot at the same moment can double-book the teacher. | This is pre-existing: `create_booking` and `reschedule-one` have the same gap. It needs an exclusion constraint designed for the whole booking engine, which is out of scope. |
| M13 | `trial-date.target.ts:31` + SQL status check | On a joint sibling trial where one sibling has since subscribed, picking for the other returns 409 `trial_date_subscribed`. | This follows the owner rule that siblings on one trial move together, and it fails safe. Moving one sibling alone is a product decision for the owner. |
| M14 | `trial-date.service.ts` | On a teacher change the old teacher gets no notice; only the Google event removal tells them. | No «trial moved / removed» template or bell kind exists. Adding one means a new Meta template, which is the owner's call. |
| M15 | `sales-booking.service.ts:101` | `excludeLessonId` on the sales grid may name any lesson of the assistant's own students, not only the upcoming trial. | Display only: the pick re-checks with the server-chosen exclusion, so the result is a 409. No other family's data is reachable. |
| M16 | `send-stale.ts:64` | The new branch duplicates `LESSON_TIMED` staleness, and its reason text reads «lesson retimed». | Harmless; the behaviour is unchanged. |
| M17 | `google_sync_enqueue_lesson` (`…611:82`) | Moving an imported trial leaves the old script's calendar event in place. | Unreachable today, because imported trials are in the past. Noted for the import cut-over. |
| M18 | `trial-date.history.ts:72` | For imported rows, «when picked» shows the import date. | Fixing it needs a nullable `picked_at` in the shared type; the effect is cosmetic. |
| M19 | `packages/shared/src/students/trial-dates.ts:65` | An excused trial shows «غاب». | The owner's outcome list has no «اعتذر». Adding it is an owner decision. |
| M20 | web `history-text.ts:26` vs mobile `trial-date-text.ts:50` | «When picked» is a date on web and a date + time (without the zone label) on mobile. | Cosmetic. |
| M21 | web `trial-date/draft.ts` vs mobile `trial-date-body.ts:43` | Web books 45 minutes, while mobile reuses the last trial's length. | The owner has not said which is right, and it is safe either way. |
| M22 | `packages/shared/src/students/status-flow.ts:66` | `trialMove` now lets an open trial win over an older attended one everywhere (renewal revert, recompute), not only for this feature. | Intended by the PR (R-SCH-12). Flagged here so the owner can confirm. |
| M23 | `TrialDateWizard.tsx:35`, `BookingWizard.tsx`, `WizardBody.tsx`, `draft.ts`, `use-sales-family-actions.tsx` | ESLint complexity warnings (11–19). | Warnings only, not CI errors, and mostly inherited from the booking wizard. |

## Checked and found correct
- One transaction for move vs. book. A double tap replays, and two people moving the same trial get 409 `trial_changed`.
- The move's exclusion from the clash check, the `rescheduled_from_id` chain, and the generator's unique slot.
- Assistant scope: own families while `sales_auto_assign` is on, no override, no custom link, no past time, and every sibling on a moved trial must be hers.
- Guards on all six routes and the role parity table. The RPCs are service_role only with `search_path = ''`, and no table is new, so no new RLS is needed.
- The confirmation template and gate are the booking's (one per family). The old lesson's confirmation, reminders and alert go stale at send time. Reminders come from the cron scan. Google sync deletes the old event and adds the new one.
- Outcome mapping covers all nine lesson statuses and per-student attendance. The count and the 3rd-date warning are consistent on web and mobile.
- ar/en key parity. MSA wording. RTL logical properties. 44pt targets. Mobile routes sit inside `(sales-chat)` and the Students stack. `native-changes c140b4cc` reports no native change.
- Max 150 lines, max 3 params, no `any` or non-null assertions, no personal data. The tests are meaningful (the new ones fail without the fixes).

# 18 — Student statuses (owner 2026-10-15)

`students.status` is one pipeline from the first contact to renewal (R-STU-05). Pure rules:
`packages/shared/src/students/status-flow.ts`; display order: `STUDENT_STATUSES`; labels:
`enums.studentStatus.*`; chips: docs/07 §6.

| # | key | Arabic | meaning | chip |
|---|---|---|---|---|
| 1 | `new` | جديد | registered, no trial session time (no future or attended trial lesson) | act · hollow |
| 2 | `trial` | بانتظار الحلقة التجريبية | a trial session time is booked, not attended yet | neutral · hollow |
| 3 | `pending_subscription` | بانتظار الاشتراك | attended the trial (lesson `completed` or `late`), no payment yet | act · half |
| 4 | `active` | مشترك | paid, a package is running (unchanged) | ok · fill |
| 5 | `pending_renewal` | بانتظار التجديد | lessons used up or the renewal date passed (unchanged, docs/11 §7) | act · half |
| 6 | `expired` | انتهى الاشتراك | still `pending_renewal` N days later with no new positive payment | act · struck |
| 7 | `paused` | متوقف مؤقتًا | manual only | neutral · half |
| 8 | `churned` | توقف | manual only | neutral · struck |

N = setting `subscription_expiry_days` (int 1..90, default 7, `/admin/settings`).

Helpers: **not subscribed** = `new + trial + pending_subscription` (`NOT_SUBSCRIBED_STATUSES`: the
«تجريبي» list kind, `?status=new,trial,pending_subscription`, the teacher chat rule);
**package ended** = `pending_renewal + expired` (`PACKAGE_ENDED_STATUSES`: the «جدّد الاشتراك» action).
A current student of the teacher (`CURRENT_STUDENT_STATUSES`) is any of the two plus `active`.

## Automatic transitions (API)

Every move is a compare-and-set on the expected from-status (idempotent, rule 8) and is audited in
`audit_log` (`entity = 'students'`, `action = 'status_change'`, `before = { status }`,
`after = { status, from, reason, … }`). None of them sends WhatsApp, push or email.

| # | event | from → to | reason |
|---|---|---|---|
| 1 | registration (any form) | with a trial lesson → `trial`; without → `new` (column default) | — |
| 2 | a trial lesson booked | `new` → `trial` | `trial_booked` |
| 3a | trial lesson attended (`completed` / `late`) | `trial` or `new` → `pending_subscription` | `trial_attended` |
| 3b | trial `no_show` / `excused` | stays `trial` while another future trial lesson exists, else `trial` → `new` | `trial_missed` |
| 3c | trial lesson cancelled, no other future trial | `trial` → `new` | `trial_missed` |
| 4 | positive payment (`kind = 'payment'`, amount > 0) | `new`, `trial`, `pending_subscription`, `pending_renewal`, `expired` → `active` | `payment` (+ `payment_id`, `from`) |
| 4′ | that payment deleted | `active` → the recorded `from`, only while still `active` | `payment_deleted` |
| 5 | package ended | `active` → `pending_renewal` (docs/11 §7) | `subscription_ended` |
| 6 | daily job | `pending_renewal` ≥ N days (since its `status_change` row, else the package end) and no positive payment since → `expired` | `subscription_expired` |

A trial lesson is a lesson whose schedule rule has `package = 'trial'`; "attended" means the lesson
is `completed` or `late` and the student is not `absent` / `excused` on it (`TrialFacts`).

**Manual (7).** The admin status changer (web profile + mobile) offers all 8 statuses, audited, and
wins: the automatic rules only move from their expected from-status, so a hand-set `paused`,
`churned` or any other value is left alone until a rule's from-status matches again.

## Renewal

On `pending_renewal` / `expired` the web profile and the mobile student screen show «جدّد الاشتراك»:
the admin opens the existing new-subscription form prefilled from the last package; a salesperson
(her own students, docs/16 row 17) opens the existing chat subscribe flow. The payment then moves
the student to `active` (transition 4).

## Migrations

| migration | what |
|---|---|
| `20261015000440_student_statuses_enum` | adds `new`, `pending_subscription`, `expired` to `student_status` (alone: enum values) |
| `20261015000441_student_statuses_defaults` | `students.status` default `'new'`; setting row `subscription_expiry_days = 7`; `teacher_thread_phones` excludes all not-subscribed statuses |
| `20261015000442_student_statuses_reclassify` | one-time reclassification below |

**Reclassification (442, deterministic, re-runnable).** Only today's `trial` students are read:
- an attended trial lesson and no positive payment → `pending_subscription`;
- no trial lesson at all (none booked, none attended, any lesson status) → `new`;
- everyone else is unchanged.

One audit row per changed student: actor null, `after.reason = 'statuses_2026_10_15'`. The manual
rollback (in the file) restores exactly those rows.

## Tests

Unit: `status-flow.test.ts` (shared), the API activation / renewal / expiry specs. E2E:
`e2e/tests/student-statuses.spec.ts` (new → trial → pending_subscription → active, DB + admin chip),
`student-lists.spec.ts` (the «تجريبي» switch writes the three statuses).

# 56 — Test accounts

Owner, 2026-11-17: «if the user have flag called test can pass some security vaildaations».
The owner chose the four checks a test account may skip: the **watermark**, **rate limits**, the
**live join window** and the **screen-capture block**. Plan: `docs/design/plans/test-accounts.txt`
(branch `design/family-canvas`).

## The double rule

| Check | `TEST_BYPASS` | Skipped when |
| --- | --- | --- |
| `watermark` | `user_and_student` | the signed-in profile **and** the content's student are test |
| `join_window` | `user_and_student` | the signed-in profile **and** the lesson's student(s) are test |
| `screen_capture` | `user_and_student` | the signed-in profile **and** the content's student are test |
| `rate_limits` | `user` | the signed-in profile is test (a rate limit has no student) |

`canSkip(check, { userIsTest, studentIsTest })` (`packages/shared`, `people/test-accounts`) is the
only decision. It is a lookup, with no if-chain. A test flag set on a real account by mistake opens
nothing on real families' data, because a test user on a real student never skips.

**Never skippable:** sign-in and auth (the sign-in code limits included), scope (who sees which
student), RLS, admin permissions and payments. A test account sees exactly what the same real
account would see. WhatsApp sends from a test account still go only to the allow-listed test numbers.

## Where the flags live

- `profiles.is_test` and `students.is_test` (migration `20261117140100_test_accounts`), not null,
  default false.
- Only the API (service role) writes them. UPDATE (is_test) is revoked from anon / authenticated at
  column level, and a guard trigger refuses any client-session change too.
- The server reads them from the database, never from the client or the JWT:
  - `AuthUser.isTest` comes from the permission resolver (`TestFlagReader`, 30 s cache).
  - The student half is read by the service that checks.
  - A failed read counts as `false`.
- `GET /auth/me` returns `is_test`. The apps use it for the «تجريبي» chip.

## Families

A test family login (a guardian's or a student's own) links only to test students, and a real login
only to real students. Deferred constraint triggers on `students`, `guardians` and `profiles` refuse
a mixed link (23514 `test_family_mismatch`, API 409).

- **The admin switch flips the whole family.** `set_test_flag` changes the guardian's students and
  every family login, and writes one `audit_log` row (`test_flag`) in the same transaction.
- **A login with no link yet takes its family's flag when it is linked.** So a test family's first
  sign-in works.
- **A new child of a family with a login takes that login's flag.**

## Admin

- `PATCH /admin/users/:id/test {is_test}` (users.write): «حساب تجريبي» in the user panel.
- `PATCH /students/:id/test {is_test}` (students.write): «طالب تجريبي» on the student page.
- Both ask first: what a test account skips, and that the whole family changes.
- A «تجريبي» chip marks test rows in the users and students lists, on the student page, in the
  family portal and in the family app header.

## Wired now / lanes

- **Wired now (core PR):**
  - The join window: the staff room join, and the family portal's «ادخل الحلقة».
  - The rate limits: `RateLimitRepo`, `PublicJoinLimit` on the portal calls, `MuteLimit`.
  - The anonymous public routes have no signed-in profile, so they always count.
- **Lanes:**
  - `feat/lessons-course-recordings`: the video / file watermark and FLAG_SECURE on the recording and
    lesson screens, with `canSkip('watermark' | 'screen_capture', …)`; its stream cap uses
    `canSkip('rate_limits', …)`.
  - `feat/family-room-and-home`: the room watermark and FLAG_SECURE, with the same helper.

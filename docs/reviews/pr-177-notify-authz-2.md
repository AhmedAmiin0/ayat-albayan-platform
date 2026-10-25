# Review of PR #177 — no push-token takeover + staff WhatsApp checked at send time

Independent adversarial review by the cloud feature shepherd, four lenses run in parallel:
attacker (push / web push / bell / staff WhatsApp to a signed-out, disabled, role-less or wrong
user), every client read of `profiles`, migration 720 on real staging data + races, side effects +
mobile + repo rules. A finding is kept only with file:line and a concrete failing scenario.

## Verdict

No Critical, no Important finding reaches a wrong person. One Important availability race fixed
here; four Minor findings recorded, not fixed (reasons below).

## What holds

- `profiles.push_tokens`: no client SELECT any more (column grant of every other column). No client
  (web, mobile, packages) reads PostgREST directly; the API uses the service role; no view or RLS
  policy reads `push_tokens`; anon already had table SELECT, so nothing widens. No later migration
  adds a `profiles` column.
- Migration 720 on staging data: nullable columns (CHECK passes on every row), no new unique index,
  no rewrite, `lock_timeout` 5s, idempotent, deletes nothing, no new SECURITY DEFINER. `types.ts`
  matches.
- Takeover: a token bound to another profile's live session moves only with its device key; 409
  otherwise, binding contested, `liveTokens` skips contested / non-live bindings and fails closed on
  a read error. Web push endpoints move only with their `p256dh` + `auth` (owner-readable only).
- Staff WhatsApp: `staffAtSend` only reads for the three teacher alerts; every guardian / family /
  lead / CRM / auto row is unchanged. A dropped row is terminal (`failed`, `stale`, queued rows
  only, no retry, no double send); a failed read is skipped and retried, never sent.
- Mobile: no new native module (package.json unchanged), no new UI strings (ar/en parity
  untouched). Repo rules: all files ≤ 150 lines, ≤ 3 params, no `any` / `!`, tests next to code,
  only fake fixtures.

## Findings

| # | Severity | Where | Scenario | Status |
|---|---|---|---|---|
| 1 | Important | `apps/mobile/src/auth/use-auth-gate.ts:31` | Sign-out → `unregisterForNotificationsAsync` takes > 1.5 s (Android FCM delete on a slow network) → login screen shows after `SILENCE_WAIT_MS` → user signs in → `registerPush` PUTs a fresh token → the late unregister completes and kills it; no pushes until the next app start. | **Fixed**: `silence-push.ts` keeps the latest unregister promise, `silenceSettled()`; `registerPush` awaits it before `getExpoPushTokenAsync`. Tests: `silence-push.test.ts`, `registerPush.device-key.test.ts`. |
| 2 | Minor | `apps/api/src/modules/me/push-device.claim.ts:49-53` | A user with `notifications.push` who knows another admin's Expo token (readable by admins before 720) PUTs it without the key every minute → 409 each time, but the victim's binding stays contested, so their phone gets no push until it re-registers. Related race: a re-registration between the read and the contest update gets contested. | Not fixed: fail-closed (nobody receives someone else's alerts), needs a known token and an admin-level caller, and a real fix (contest only from the same device / a single SQL RPC with `contested_at is null`) is the RPC upgrade the code already notes. Owner decision: harden in a follow-up or accept. |
| 3 | Minor | `apps/api/src/modules/me/push-device.claim.ts:42` + `me.service.ts` | Two simultaneous first PUTs from one phone mint K1 and K2; DB may keep K2's hash while the phone stores K1 → a later hand-over of that phone answers 409. | Not fixed: fail-safe, rare (one phone, two concurrent first registrations), fixed by the same RPC as #2. |
| 4 | Minor | `apps/api/src/modules/reminders/staff-reachable.ts` (`staffStale`) | A teacher alert waits behind a closed send gate while the lesson's teacher changes → old teacher could get the family's names. | Not fixed: a substitute/reschedule creates a new lesson, so the existing `staleReason` already drops the old alert; no current path changes `teacher_id` in place. |
| 5 | Minor | `apps/api/src/modules/whatsapp/sender/staff-at-send.ts:16` | Fallback by phone (dedup key without teacher id) + duplicate `teachers.phone_e164` + `every(staffReachable)` → one inactive duplicate drops an active teacher's alert. | Not fixed: latent, no producer emits a dedup key without the teacher id; fail-closed. |

Verified locally: `pnpm i --frozen-lockfile`, `pnpm --filter @ab/db --filter @ab/shared build`,
full `pnpm turbo lint typecheck test`.

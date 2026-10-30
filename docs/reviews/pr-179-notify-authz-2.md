# Review of PR #179 — push-token takeover check and bind in one locked statement (migration 730)

Independent adversarial review by the cloud feature shepherd. Lenses: attacker (two concurrent
claims, no key / wrong key / ended or missing session, SECURITY DEFINER + search_path, EXECUTE
grants, parity with the replaced TS path); data correctness + idempotency + migration order; tests;
repo rules (150 lines, 3 params, strict TS, no personal data); docs.

No Critical or Important findings.

- Concurrency: `pg_advisory_xact_lock` on the token runs before `select … for update`, so claims of
  one token (also a first registration with no row yet) are serialised; READ COMMITTED gives the
  select a fresh snapshot after the lock.
- Keys: no key and a pre-720 binding (null hash) both read as «not proven» (`coalesce`); the API
  hashes the presented key, so a client cannot send a raw hash.
- `search_path = ''`: every relation is schema-qualified; the EXCEPTION block only catches
  `foreign_key_violation` (→ `no_session`, 401).
- Grants: the exact signature is revoked from public, anon and authenticated; service_role only.
- Parity: same rule as `mayClaimDevice`; contest only on another profile's live binding; key kept
  only when proven. Every RPC answer is mapped (401 / 409 / key) and an unknown one throws.
- Migration 730 sorts after develop's newest (720); `create or replace`, expand-only.

## Minor (fixed in this PR)

1. `e2e/tests/messaging/push-device-claim.sql.spec.ts`: the unit case removed by #179 «a binding made before
   720 (null hash) + a presented key → 409» had no replacement at the SQL level (a rewrite to
   `is not distinct from` would let a key-less claim prove a null-hash binding). Added.
2. Same file: «the holder registering again clears its own contest» was no longer tested. Added.
3. Same file: the intermediate key-less claim in the «proven» test now asserts `in_use`.
4. `apps/api/src/modules/people/me/push/push-tokens.ts:8`: comment still named the removed `claimDeviceKey`.

## Minor (not fixed)

- The advisory-lock wait has no timeout of its own inside the function (the migration's
  `lock_timeout` is `set local` to the migration only). A stuck transaction on one token blocks only
  other claims of that same token, until the API role's statement timeout. Not worth extra code.

Verified locally: `pnpm i --frozen-lockfile`, `pnpm --filter @ab/db --filter @ab/shared build`,
full `pnpm turbo lint typecheck test`, and `e2e/tests/messaging/push-device-claim.sql.spec.ts` (6 tests)
against local Supabase with every migration applied.

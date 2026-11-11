import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APPLY_SQL, DRY_RUN_SQL, parseArgs, run } from './teacher-phones-backfill.mjs';

describe('teacher-phones backfill (docs/46 A7)', () => {
  it('is a dry run by default: a read-only select, no write', () => {
    const sql = run(parseArgs([]));
    assert.equal(sql, DRY_RUN_SQL);
    assert.doesNotMatch(sql, /\b(update|insert|delete|begin|commit)\b/i);
  });

  it('--apply writes in one transaction, only onto phoneless teacher logins', () => {
    const sql = run(parseArgs(['--apply']));
    assert.equal(sql, APPLY_SQL);
    assert.match(sql, /^begin;$/m);
    assert.match(sql, /^commit;$/m);
    assert.match(sql, /p\.role = 'teacher' and p\.phone_e164 is null/);
    assert.match(sql, /where p\.id = f\.profile_id and p\.phone_e164 is null;/);
  });

  it('never takes a number another profile or a guardian row holds (shared numbers)', () => {
    for (const sql of [DRY_RUN_SQL, APPLY_SQL]) {
      assert.match(
        sql,
        /not exists \(select 1 from public\.profiles o where o\.phone_e164 = c\.phone\)/,
      );
      assert.match(
        sql,
        /not exists \(select 1 from public\.guardians g where g\.phone_e164 = c\.phone\)/,
      );
    }
  });
});

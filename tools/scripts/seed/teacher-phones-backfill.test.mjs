import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DRY_RUN_SQL, parseArgs, reviewedIds, run } from './teacher-phones-backfill.mjs';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const SUM = '0123456789abcdef0123456789abcdef';

describe('teacher-phones backfill (docs/46 A7)', () => {
  it('is a dry run by default: a read-only listing of every row, no write', () => {
    const sql = run(parseArgs([]));
    assert.equal(sql, DRY_RUN_SQL);
    assert.doesNotMatch(sql, /\b(update|insert|delete|begin|commit)\b/i);
    assert.match(sql, /select f\.teacher_id, f\.name, f\.profile_id as login_id, .* as phone/);
    assert.match(sql, /repeat\('•'/);
    assert.match(sql, /as checksum;/);
  });

  it('--apply without the reviewed ids refuses', () => {
    assert.throws(() => run(parseArgs(['--apply'])), /--ids/);
    assert.throws(() => run(parseArgs(['--apply', '--ids=nope'])), /--ids/);
    assert.throws(() => run(parseArgs(['--apply', `--ids=${A}`])), /--checksum/);
  });

  it('--apply writes exactly the reviewed ids in one transaction, else rolls back', () => {
    const args = ['--apply', `--ids=${B}, ${A.toUpperCase()},${A}`, `--checksum=${SUM}`];
    const sql = run(parseArgs(args));
    assert.ok(sql.includes(`free_sum <> '${SUM}'`), 'the reviewed phones are checked too');
    assert.match(sql, /^begin;$/m);
    assert.match(sql, /^commit;$/m);
    assert.ok(sql.includes(`array['${A}', '${B}']::uuid[]`));
    assert.match(sql, /if free_ids <> wanted or free_sum <> '[0-9a-f]+' then\s+raise exception/);
    assert.match(sql, /if written <> cardinality\(wanted\) then\s+raise exception/);
    assert.match(sql, /p\.id = any\(wanted\) and p\.phone_e164 is null;/);
  });

  it('never takes a number another profile or a guardian row holds (shared numbers)', () => {
    for (const sql of [DRY_RUN_SQL, run(parseArgs(['--apply', `--ids=${A}`, `--checksum=${SUM}`]))]) {
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

  it('reviewedIds sorts and de-duplicates', () => {
    assert.deepEqual(reviewedIds(`${B},${A},${B}`), [A, B]);
  });
});

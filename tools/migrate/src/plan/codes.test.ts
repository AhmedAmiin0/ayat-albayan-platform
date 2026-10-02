// Legacy AB codes already used in the target: dropped in the plan with a review, on invented rows.
import { describe, expect, it } from 'vitest';
import { recordHash } from '../hash.ts';
import { keyId, keys } from '../keys.ts';
import type { Existing } from '../types.ts';
import { checkCodes, dropTakenCodes, plannedCodes } from './codes.ts';
import { fakeDb } from './fake-db.ts';
import type { Desired } from './resolve.ts';

function student(name: string, code?: number): Desired {
  const columns = { name, ...(code === undefined ? {} : { code_seq: code }) };
  const record = { columns, refs: {} };
  const key = keys.student({ guardianPhone: '+201000000001', name });
  return { key, record, hash: recordHash(record), ref: { source: 'HUB', tab: 't', row: 2 } };
}
const imported = (name: string, targetId: string): [string, Existing] => [
  keyId(keys.student({ guardianPhone: '+201000000001', name })),
  { targetId, hash: 'h' },
];

const desired = [student('ليلى', 185), student('هالة', 12), student('تالا')];
const noCode = (d: Desired | undefined) => d?.record.columns['code_seq'] === undefined;

describe('legacy codes vs the target', () => {
  it('lists the legacy codes of every planned student', () => {
    expect(plannedCodes(desired)).toEqual([185, 12]);
  });

  it('a new student loses a code another target student holds: rehashed, review naming it', () => {
    const holders = new Map([[185, 'demo-1']]);
    const r = dropTakenCodes({ desired, existing: new Map(), holders });
    expect(r.desired[0]?.record.columns).toEqual({ name: 'ليلى' });
    expect(r.desired[0]?.hash).toBe(recordHash({ columns: { name: 'ليلى' }, refs: {} }));
    expect(r.desired.slice(1)).toEqual(desired.slice(1));
    expect(r.issues).toMatchObject([
      { code: 'conflict', severity: 'review', entity: 'students', field: 'legacy_code' },
    ]);
    expect(r.issues[0]?.detail).toContain('AB-0185');
  });

  it('a student imported with its code keeps it (re-run = skip, not a code change)', () => {
    const existing = new Map([imported('هالة', 's-12')]);
    const r = dropTakenCodes({ desired, existing, holders: new Map([[12, 's-12']]) });
    expect(r.desired[1]).toEqual(desired[1]);
    expect(r.issues).toEqual([]);
  });

  it('a student imported without its code (taken then) never plans one later', () => {
    const existing = new Map([imported('ليلى', 's-1')]);
    for (const holders of [new Map([[185, 'demo-1']]), new Map<number, string>()]) {
      const r = dropTakenCodes({ desired, existing, holders });
      expect(noCode(r.desired[0])).toBe(true);
      expect(r.issues).toMatchObject([{ severity: 'warn', field: 'legacy_code' }]);
    }
  });

  it('asks the target with one SELECT, and not at all without codes', async () => {
    const asked: unknown[] = [];
    const { db } = fakeDb({
      select: (_t, params) => (asked.push(params[0]), [{ id: 'demo-1', code_seq: 12 }]),
    });
    const r = await checkCodes({ db, desired, existing: new Map() });
    expect(asked).toEqual([[185, 12]]);
    expect(r.issues).toHaveLength(1);
    expect(noCode(r.desired[1])).toBe(true);
    await checkCodes({ db, desired: [student('تالا')], existing: new Map() });
    expect(asked).toHaveLength(1);
  });
});

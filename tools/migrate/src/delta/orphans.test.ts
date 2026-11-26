import { describe, expect, it } from 'vitest';
import { keyId, keys } from '../keys.ts';
import type { EntityName, Existing, NaturalKey } from '../types.ts';
import type { Desired } from '../plan/resolve.ts';
import { fakeDb } from '../plan/fake-db.ts';
import { dropOrphans } from './orphans.ts';

const G = keys.guardian('+966500000001');
const S = keys.student({ guardianPhone: '+966500000001', name: 'ليان' });
const EARLY = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-10-01' });
const LATE = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-11-02' });
const ODD = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-11-03' });
const LINK = keys.lessonStudent({ lesson: LATE.key, student: S.key });
const LEAD = keys.lead('+966500000002');

const d = (key: NaturalKey, record: Partial<Desired['record']> = {}): Desired => ({
  key,
  record: { columns: {}, refs: {}, ...record },
  hash: 'h',
  ref: { source: 'HUB', tab: 't', row: 2 },
});

const DESIRED = [
  d(G),
  d(S, { refs: { guardian_id: G } }),
  d(EARLY, { columns: { starts_at: '2026-10-01T09:00:00.000Z' } }),
  d(LATE, { columns: { starts_at: '2026-11-02T09:00:00.000Z' } }),
  d(ODD, { columns: { starts_at: 5 } }),
  d(LINK, { refs: { lesson_id: LATE, student_id: S } }),
  d(LEAD),
];

function existing(): Map<string, Existing> {
  const at = (key: NaturalKey, targetId: string | null) =>
    [keyId(key), { targetId, hash: 'h' }] as const;
  return new Map([
    at(G, 'g-gone'),
    at(S, 's-alive'),
    at(EARLY, 'early-gone'),
    at(LATE, 'late-gone'),
    at(ODD, 'odd-gone'),
    at(LINK, null),
    at(LEAD, 'lead-gone'),
  ]);
}

const ONLY: EntityName[] = ['guardians', 'students', 'lessons', 'lesson_students', 'leads'];

async function run(o: { alive: string[]; tableOf?: (e: EntityName) => string }) {
  const reads: string[] = [];
  const fake = fakeDb({
    select: (text, params) => {
      reads.push(text);
      return (params[0] as string[]).filter((id) => o.alive.includes(id)).map((id) => ({ id }));
    },
  });
  const ex = existing();
  const scope = {
    only: new Set(ONLY),
    fromUtc: '2026-10-26T00:00:00.000Z',
    tableOf: o.tableOf ?? ((e: EntityName) => e),
  };
  const gone = await dropOrphans({ db: fake.db, existing: ex, desired: DESIRED, scope });
  return { gone: [...gone].sort(), left: [...ex.keys()].sort(), reads };
}

describe('dropOrphans', () => {
  it('drops gone rows in scope, keeps early or odd lessons and the rows still there', async () => {
    const { gone, left } = await run({ alive: ['s-alive'] });
    expect(gone).toEqual([keyId(G), keyId(LATE), keyId(LINK), keyId(LEAD)].sort());
    expect(left).toEqual([keyId(S), keyId(EARLY), keyId(ODD)].sort());
  });

  it('keeps a link row whose parents all still exist', async () => {
    const { gone } = await run({ alive: ['s-alive', 'late-gone', 'g-gone', 'lead-gone'] });
    expect(gone).toEqual([]);
  });

  it('never recreates a row of a schema-qualified table and reads nothing for it', async () => {
    const { gone, reads } = await run({ alive: [], tableOf: (e) => `crm.${e}` });
    expect(gone).toEqual([]);
    expect(reads).toEqual([]);
  });

  it('reads once per table', async () => {
    const { reads } = await run({ alive: [] });
    expect(reads.map((t) => /from (\S+)/.exec(t)?.[1])).toEqual([
      '"public"."guardians"',
      '"public"."students"',
      '"public"."lessons"',
      '"public"."leads"',
    ]);
  });
});

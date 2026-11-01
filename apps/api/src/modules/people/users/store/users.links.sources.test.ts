import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { candidates, link } from './users.links.repo';

describe('link sources per kind', () => {
  it.each([
    ['teacher', 'teachers'],
    ['student', 'students'],
    ['guardian', 'guardians'],
  ] as const)('a %s links on the %s table', async (kind, table) => {
    const { db } = fakeDb({ [table]: [{ data: [{ id: 'x1' }] }] });
    expect(await link(db, { kind, id: 'x1', profileId: 'p1' })).toBe(true);
  });

  it('searches teachers by display name only when a term is given', async () => {
    const { db, calls } = fakeDb({ teachers: [{ data: [] }] });
    expect(await candidates(db, 'teacher', ' أحمد ')).toEqual([]);
    expect(calls.find((c) => c.method === 'ilike')?.args).toEqual(['display_name_ar', '%أحمد%']);
  });

  it('searches guardians by name or phone', async () => {
    const { db, calls } = fakeDb({ guardians: [{ data: [] }] });
    await candidates(db, 'guardian', '0501');
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe('name.ilike.%0501%,phone_e164.ilike.%0501%');
  });

  it('throws on a database error', async () => {
    const { db } = fakeDb({ students: [{ data: null, error: { code: 'XX000', message: 'boom' } }] });
    await expect(candidates(db, 'student', undefined)).rejects.toThrow('db error XX000');
  });
});

import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { candidates, link, linkTarget, linkedOf, phoneTaken } from './users.links.repo';

describe('link queries', () => {
  it('finds a student by name or AB code, only without a login, with wildcards neutralised', async () => {
    const { db, calls } = fakeDb({ students: [{ data: [{ id: 's1', name: 'سارة', code: 'AB-0183' }] }] });
    const out = await candidates(db, 'student', 'AB-0183,(x)%');
    expect(out).toEqual([{ kind: 'student', id: 's1', name: 'سارة', code: 'AB-0183' }]);
    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['profile_id', null]);
    expect(calls.find((c) => c.method === 'or')?.args[0]).toBe('name.ilike.%AB-0183  x%,code.ilike.%AB-0183  x%');
  });

  it('lists teachers and guardians without a login', async () => {
    const t = fakeDb({ teachers: [{ data: [{ id: 't1', display_name_ar: 'أحمد' }] }] });
    expect(await candidates(t.db, 'teacher', undefined)).toEqual([{ kind: 'teacher', id: 't1', name: 'أحمد', code: null }]);
    const g = fakeDb({ guardians: [{ data: [{ id: 'g1', name: 'والد سارة' }] }] });
    expect(await candidates(g.db, 'guardian', 'سارة')).toEqual([{ kind: 'guardian', id: 'g1', name: 'والد سارة', code: null }]);
  });

  it('reports whether a record already has a login', async () => {
    const taken = fakeDb({ students: [{ data: { id: 's1', name: 'سارة', profile_id: 'p1' } }] });
    expect(await linkTarget(taken.db, 'student', 's1')).toEqual({ id: 's1', name: 'سارة', hasLogin: true });
    const missing = fakeDb({ teachers: [{ data: null }] });
    expect(await linkTarget(missing.db, 'teacher', 'x')).toBeNull();
  });

  it('links only while profile_id is still null', async () => {
    const won = fakeDb({ guardians: [{ data: [{ id: 'g1' }] }] });
    expect(await link(won.db, { kind: 'guardian', id: 'g1', profileId: 'p1' })).toBe(true);
    expect(won.calls.find((c) => c.method === 'is')?.args).toEqual(['profile_id', null]);
    const lost = fakeDb({ guardians: [{ data: [] }] });
    expect(await link(lost.db, { kind: 'guardian', id: 'g1', profileId: 'p1' })).toBe(false);
  });

  it('finds the record a profile is linked to', async () => {
    const { db } = fakeDb({ teachers: [{ data: null }], students: [{ data: { id: 's1', name: 'سارة', code: 'AB-0183' } }], guardians: [{ data: null }] });
    expect(await linkedOf(db, 'p1')).toEqual({ kind: 'student', id: 's1', name: 'سارة', code: 'AB-0183' });
  });

  it('sees a phone as taken by another profile, or by another teacher record when the profile owns one', async () => {
    const ctx = { phone: '+966501234567', except: 'p1' };
    const profile = fakeDb({ profiles: [{ data: [{ id: 'p2' }] }], teachers: [{ data: [] }, { data: null }] });
    expect(await phoneTaken(profile.db, ctx)).toBe(true);
    const teacher = fakeDb({ profiles: [{ data: [] }], teachers: [{ data: [{ profile_id: 'p3' }] }, { data: { id: 't1' } }] });
    expect(await phoneTaken(teacher.db, ctx)).toBe(true);
    const noRecord = fakeDb({ profiles: [{ data: [] }], teachers: [{ data: [{ profile_id: 'p3' }] }, { data: null }] });
    expect(await phoneTaken(noRecord.db, ctx)).toBe(false);
    const own = fakeDb({ profiles: [{ data: [{ id: 'p1' }] }], teachers: [{ data: [{ profile_id: 'p1' }] }, { data: { id: 't1' } }] });
    expect(await phoneTaken(own.db, ctx)).toBe(false);
  });
});

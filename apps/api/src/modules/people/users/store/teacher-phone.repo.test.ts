import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { adoptTeacherPhone, phoneIsFree } from './teacher-phone.repo';

const PHONE = '+966500000002';
const ctx = { teacherId: 't1', profileId: 'p1' };

describe('adoptTeacherPhone (docs/46 A7)', () => {
  it('copies a free number onto the profile, only while it has none', async () => {
    const { db, calls } = fakeDb({
      teachers: [{ data: { phone_e164: PHONE } }],
      profiles: [{ count: 0 }, {}],
      guardians: [{ count: 0 }],
    });
    await adoptTeacherPhone(db, ctx);
    expect(calls.find((c) => c.method === 'update')?.args).toEqual([{ phone_e164: PHONE }]);
    expect(calls.find((c) => c.table === 'profiles' && c.method === 'is')?.args).toEqual([
      'phone_e164',
      null,
    ]);
  });

  it.each([
    ['another profile holds it', 1, 0],
    ['a guardian row holds it (a teacher who is also a parent)', 0, 1],
  ])('leaves the phone null when %s', async (_name, profiles, guardians) => {
    const { db, calls } = fakeDb({
      teachers: [{ data: { phone_e164: PHONE } }],
      profiles: [{ count: profiles }],
      guardians: [{ count: guardians }],
    });
    await adoptTeacherPhone(db, ctx);
    expect(calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('no record phone: nothing; a lost race (23505) is quiet, other errors throw', async () => {
    const none = fakeDb({ teachers: [{ data: { phone_e164: null } }] });
    await adoptTeacherPhone(none.db, ctx);
    expect(none.calls.some((c) => c.method === 'update')).toBe(false);
    const race = fakeDb({
      teachers: [{ data: { phone_e164: PHONE } }],
      profiles: [{ count: 0 }, { error: { code: '23505', message: 'dup' } }],
      guardians: [{ count: 0 }],
    });
    await expect(adoptTeacherPhone(race.db, ctx)).resolves.toBeUndefined();
    const broken = fakeDb({ teachers: [{ error: { message: 'down' } }] });
    await expect(adoptTeacherPhone(broken.db, ctx)).rejects.toThrow();
  });

  it('phoneIsFree', () => {
    expect(phoneIsFree({ profiles: 0, guardians: 0 })).toBe(true);
    expect(phoneIsFree({ profiles: 0, guardians: 2 })).toBe(false);
  });
});

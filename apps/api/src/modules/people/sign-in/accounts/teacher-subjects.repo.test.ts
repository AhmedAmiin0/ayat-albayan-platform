import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { teacherByPhone } from './teacher-subjects.repo';

const PHONE = '+966500000002';
const login = { id: 'p1', role: 'teacher', disabled_at: null, phone_e164: PHONE };
const row = {
  id: 't1',
  display_name_ar: 'المعلمة',
  tz: 'Africa/Cairo',
  phone_e164: '+966500000007',
  profile_id: 'p1',
  login,
};

describe('teacherByPhone (docs/46 A2)', () => {
  it("finds the teacher through her own login's phone first (role teacher, active record)", async () => {
    const { db, calls } = fakeDb({ profiles: [{ data: { id: 'p1' } }], teachers: [{ data: row }] });
    await expect(teacherByPhone(db, PHONE)).resolves.toEqual({
      id: 't1',
      name: 'المعلمة',
      tz: 'Africa/Cairo',
      recordPhone: '+966500000007',
      profileId: 'p1',
      login: { id: 'p1', role: 'teacher', disabled: false, phone: PHONE },
    });
    const filters = calls.filter((c) => c.method === 'eq').map((c) => [c.table, ...c.args]);
    expect(filters).toEqual([
      ['profiles', 'phone_e164', PHONE],
      ['profiles', 'role', 'teacher'],
      ['teachers', 'profile_id', 'p1'],
      ['teachers', 'status', 'active'],
    ]);
  });

  it("else the record's phone, active only; a teacher without a login has login null", async () => {
    const bare = { ...row, phone_e164: PHONE, profile_id: null, login: null };
    const { db, calls } = fakeDb({ profiles: [{ data: null }], teachers: [{ data: bare }] });
    await expect(teacherByPhone(db, PHONE)).resolves.toMatchObject({
      id: 't1',
      recordPhone: PHONE,
      profileId: null,
      login: null,
    });
    expect(
      calls.filter((c) => c.table === 'teachers' && c.method === 'eq').map((c) => c.args),
    ).toEqual([
      ['phone_e164', PHONE],
      ['status', 'active'],
    ]);
  });

  it('nobody: null; a database error throws', async () => {
    const none = fakeDb({ profiles: [{ data: null }], teachers: [{ data: null }] });
    await expect(teacherByPhone(none.db, PHONE)).resolves.toBeNull();
    const broken = fakeDb({ profiles: [{ error: { message: 'down' } }] });
    await expect(teacherByPhone(broken.db, PHONE)).rejects.toThrow();
  });
});

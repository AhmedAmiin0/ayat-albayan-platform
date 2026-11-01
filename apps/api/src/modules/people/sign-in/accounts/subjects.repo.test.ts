import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { SubjectsRepo } from './subjects.repo';

const teacherProfile = { id: 'p1', role: 'teacher', disabled_at: null, phone_e164: null };

describe('SubjectsQueries', () => {
  it('a guardian by the phone on file', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: { id: 'g1', name: 'x', phone_e164: '+966500000001', tz: 'Asia/Riyadh', profile_id: null } }] });
    await expect(new SubjectsRepo(db).guardianByPhone('+966500000001')).resolves.toMatchObject({ id: 'g1', phone: '+966500000001', profileId: null });
    expect(argsOf('guardians', 'eq')).toEqual(['phone_e164', '+966500000001']);
  });

  it('a student by code carries the guardian\'s phone (where its codes go)', async () => {
    const row = { id: 's1', name: 'x', tz: 'Asia/Riyadh', profile_id: null, guardian: { phone_e164: '+966500000001' } };
    const { db } = fakeDb({ students: [{ data: row }] });
    await expect(new SubjectsRepo(db).studentByCode('AB-1234')).resolves.toMatchObject({ id: 's1', guardianPhone: '+966500000001' });
  });

  it('a profile\'s reset phone is its own, never the teacher row\'s (teachers.write could change that one)', async () => {
    const { db } = fakeDb({ profiles: [{ data: teacherProfile }] });
    await expect(new SubjectsRepo(db).profileByUsername('omar')).resolves.toEqual({ id: 'p1', role: 'teacher', disabled: false, phone: null });
  });

  it('staffByPhone: a staff profile\'s own phone, never a family profile\'s, else a linked teacher row', async () => {
    const family = { ...teacherProfile, role: 'guardian', phone_e164: '+966500000001' };
    const own = fakeDb({ profiles: [{ data: family }] });
    await expect(new SubjectsRepo(own.db).staffByPhone('+966500000001')).resolves.toBeNull();
    const viaTeacher = fakeDb({ profiles: [{ data: null }, { data: teacherProfile }], teachers: [{ data: { profile_id: 'p1' } }] });
    await expect(new SubjectsRepo(viaTeacher.db).staffByPhone('+966500000002')).resolves.toMatchObject({ id: 'p1' });
  });

  it('a unique phone clash on insert is 409 phone_belongs_to_staff', async () => {
    const { db } = fakeDb({ roles: [{ data: { id: 'r1' } }], profiles: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new SubjectsRepo(db).insertProfile({ id: 'u1', role: 'guardian', fullName: 'x', phone: '+966500000001', tz: 'Asia/Riyadh' })).rejects.toThrow(
      'phone_belongs_to_staff',
    );
  });

  it('links only a record without a login', async () => {
    const { db, calls } = fakeDb({ students: [{ data: [{ id: 's1' }] }, { data: [] }] });
    const q = new SubjectsRepo(db);
    await expect(q.link({ kind: 'student', recordId: 's1', profileId: 'u1' })).resolves.toBe(true);
    await expect(q.link({ kind: 'student', recordId: 's1', profileId: 'u2' })).resolves.toBe(false);
    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['profile_id', null]);
  });
});

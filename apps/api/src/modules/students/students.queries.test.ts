import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { getStudentProfile, listStudents, listTeacherOptions } from './students.queries';

const ROW = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  guardian: { name: 'ام جود', phone_e164: '+966501234567' },
  teacher: { display_name_ar: 'أبرار' },
};

describe('students queries (R-STU-01, R-NFR-08)', () => {
  it('phone search finds the guardian’s students, in any format', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: [{ id: 'g1' }, { id: 'g2' }] }], students: [{ data: [ROW], count: 1 }] });
    const page = await listStudents(db, { search: '0501234567', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'ilike')).toEqual(['phone_e164', '%966501234567%']);
    expect(argsOf('students', 'or')).toEqual(['guardian_id.in.(g1,g2),code.ilike.*966501234567*']);
    expect(page.items[0]).toMatchObject({ guardian_phone: '+966501234567', teacher_name: 'أبرار' });
    expect(page.total).toBe(1);
  });

  it('partial Arabic digits: the guardian phone or the code («٠١٨٣» finds AB-0183)', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: [] }], students: [{ data: [], count: 0 }] });
    await listStudents(db, { search: '٠١٨٣', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'ilike')).toEqual(['phone_e164', '%183%']);
    expect(argsOf('students', 'or')).toEqual(['code.ilike.*183*']);
  });

  it('name search uses the normalised name or the code', async () => {
    const { db, argsOf } = fakeDb({ students: [{ data: [], count: 0 }] });
    await listStudents(db, { search: 'سهيلة', page: 2, pageSize: 10 });
    expect(argsOf('students', 'or')).toEqual(['name_normalized.ilike.*سهيله*,code.ilike.*سهيلة*']);
    expect(argsOf('students', 'range')).toEqual([10, 19]);
  });

  it('profile: 404 when missing', async () => {
    const { db } = fakeDb({ students: [{ data: null }] });
    await expect(getStudentProfile(db, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('profile: adds the effective meeting link and siblings (R-STU-05)', async () => {
    const guardian = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567', students: [{ id: 's1' }, { id: 's2' }] };
    const teacher = { id: 't1', display_name_ar: 'أبرار', meeting_link: 'https://meet.google.com/x' };
    const { db } = fakeDb({ students: [{ data: { id: 's1', meeting_link_override: null, guardian, teacher } }] });
    const p = await getStudentProfile(db, 's1');
    expect(p.meeting_link).toBe('https://meet.google.com/x');
    expect(p.siblings).toEqual([{ id: 's2' }]);
  });

  it('teacher options are active teachers only', async () => {
    const { db, argsOf } = fakeDb({ teachers: [{ data: [{ id: 't1' }] }] });
    await expect(listTeacherOptions(db)).resolves.toEqual([{ id: 't1' }]);
    expect(argsOf('teachers', 'eq')).toEqual(['status', 'active']);
  });
});

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { countStudentsByStatus, getStudentProfile, listStudents, listTeacherOptions } from './students.queries';

const ROW = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  guardian: { name: 'ام جود', phone_e164: '+966501234567' },
  teacher: { display_name_ar: 'أبرار' },
};

describe('students queries (R-STU-01, R-NFR-08)', () => {
  it('phone search finds the guardian’s students, in any format', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: [{ id: 'g1' }, { id: 'g2' }] }], v_student_list: [{ data: [ROW], count: 1 }] });
    const page = await listStudents(db, { search: '0501234567', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'ilike')).toEqual(['phone_e164', '%501234567%']);
    expect(argsOf('v_student_list', 'or')).toEqual(['guardian_id.in.(g1,g2),code.ilike.*501234567*']);
    expect(page.items[0]).toMatchObject({ guardian_phone: '+966501234567', teacher_name: 'أبرار' });
    expect(page.total).toBe(1);
  });

  it('partial Arabic digits: the guardian phone or the code («٠١٨٣» finds AB-0183)', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: [] }], v_student_list: [{ data: [], count: 0 }] });
    await listStudents(db, { search: '٠١٨٣', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'ilike')).toEqual(['phone_e164', '%183%']);
    expect(argsOf('v_student_list', 'or')).toEqual(['code.ilike.*183*']);
  });

  it('name search uses the normalised name or the code', async () => {
    const { db, argsOf } = fakeDb({ v_student_list: [{ data: [], count: 0 }] });
    await listStudents(db, { search: 'سهيلة', page: 2, pageSize: 10 });
    expect(argsOf('v_student_list', 'or')).toEqual(['name_normalized.ilike.*سهيله*,code.ilike.*سهيلة*']);
    expect(argsOf('v_student_list', 'range')).toEqual([10, 19]);
  });

  it('filters go to v_student_list next to the search (no N+1)', async () => {
    const { db, calls } = fakeDb({ v_student_list: [{ data: [], count: 0 }] });
    await listStudents(db, { search: 'سهيلة', page: 1, pageSize: 20, status: ['active'], teacher: 'none', package: 'low' });
    const on = calls.filter((c) => c.table === 'v_student_list').map((c) => [c.method, ...c.args]);
    expect(on).toEqual(expect.arrayContaining([['in', 'status', ['active']], ['is', 'teacher_id', null], ['eq', 'low_balance', true]]));
    expect(calls.filter((c) => c.method === 'select')).toHaveLength(1);
  });

  it('status counts: one head count per status, under the other filters', async () => {
    const counts = [12, 3, 2, 7, 1, 4, 0, 5].map((count) => ({ count }));
    const { db, calls } = fakeDb({ v_student_list: counts });
    const T = '11111111-1111-4111-8111-111111111111';
    await expect(countStudentsByStatus(db, { teacher: T, status: ['trial'] })).resolves.toEqual({
      new: 12, trial: 3, pending_subscription: 2, active: 7, pending_renewal: 1, expired: 4, paused: 0, churned: 5,
    });
    expect(calls.filter((c) => c.method === 'eq' && c.args[0] === 'teacher_id')).toHaveLength(8);
    expect(calls.some((c) => c.method === 'in')).toBe(false);
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

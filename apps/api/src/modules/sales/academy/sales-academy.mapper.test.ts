import { describe, expect, it } from 'vitest';
import { liveRow, studentRow, teacherRow } from './sales-academy.fakes';
import { toSalesLive, toSalesStudent, toSalesTeacher } from './sales-academy.mapper';

describe('sales academy mappers (whitelists)', () => {
  it('toSalesTeacher keeps name, gender, programs, the fixed link and the current students by name; drops pay, phone, notes', () => {
    const row = teacherRow();
    row.students = [{ id: 'b', code: null, name: 'يوسف', status: 'trial', program: 'arabic' }, { id: 'a', code: 'AB-1', name: 'أحمد', status: 'paused', program: 'quran' }, ...row.students];
    const out = toSalesTeacher(row);
    expect(Object.keys(out).sort()).toEqual([
      'active_count', 'gender', 'id', 'lessons_today', 'live_now', 'meeting_link', 'name', 'name_en', 'platform_classroom', 'programs', 'students', 'trial_count',
    ]);
    expect(Object.keys(out.students[0] ?? {}).sort()).toEqual(['code', 'id', 'name', 'next_lesson_at', 'program', 'status']);
    expect([out.active_count, out.trial_count, out.meeting_link]).toEqual([1, 1, 'https://meet.example.org/abrar']);
    expect(out.students.map((s) => [s.id, s.code, s.status])).toEqual([['a', 'AB-1', 'paused'], ['s1', 'AB-0101', 'active'], ['b', '', 'trial']]);
    expect(out.students[2]).toEqual({ id: 'b', code: '', name: 'يوسف', program: 'arabic', status: 'trial', next_lesson_at: null });
    expect([out.lessons_today, out.live_now]).toEqual([0, false]);
  });

  it('toSalesTeacher counts current students only (churned dropped) and sends a blank link as null', () => {
    const row = { ...teacherRow(), meeting_link: '  ' };
    row.students = [...row.students, { id: 't1', code: 'AB-2', name: 'تجربة', status: 'trial', program: 'quran' }, { id: 't2', code: 'AB-3', name: 'ثانية', status: 'trial', program: 'quran' }];
    const out = toSalesTeacher(row);
    expect([out.active_count, out.trial_count, out.students.length, out.meeting_link]).toEqual([1, 2, 3, null]);
    expect(toSalesTeacher({ ...teacherRow(), meeting_link: null }).meeting_link).toBeNull();
  });

  it('toSalesTeacher keeps a pending_renewal student (its own status) but not in «مشترك»', () => {
    const row = teacherRow();
    row.students = [...row.students, { id: 'r1', code: 'AB-4', name: 'تجديد', status: 'pending_renewal', program: 'quran' }];
    const out = toSalesTeacher(row);
    expect([out.active_count, out.trial_count, out.students.length]).toEqual([1, 0, 2]);
    expect(out.students.find((s) => s.id === 'r1')?.status).toBe('pending_renewal');
  });

  it('toSalesTeacher takes today’s facts by teacher and the next lesson by student', () => {
    const facts = new Map([['tc1', { lessons_today: 3, live_now: true }]]);
    const out = toSalesTeacher(teacherRow(), { facts, next: new Map([['s1', '2026-10-12T15:00:00.000Z']]) });
    expect([out.lessons_today, out.live_now, out.students[0]?.next_lesson_at]).toEqual([3, true, '2026-10-12T15:00:00.000Z']);
  });

  it('toSalesTeacher: platform_classroom is the teacher’s mode, else the academy default; the mode itself is not sent', () => {
    const ctx = (academyAuto: boolean) => ({ facts: new Map(), next: new Map(), academyAuto });
    expect(toSalesTeacher({ ...teacherRow(), meeting_mode: null }, ctx(true)).platform_classroom).toBe(true);
    expect(toSalesTeacher({ ...teacherRow(), meeting_mode: null }, ctx(false)).platform_classroom).toBe(false);
    expect(toSalesTeacher({ ...teacherRow(), meeting_mode: 'static' }, ctx(true)).platform_classroom).toBe(false);
    expect(toSalesTeacher({ ...teacherRow(), meeting_mode: 'platform' }, ctx(false)).platform_classroom).toBe(true);
    expect(toSalesTeacher(teacherRow())).not.toHaveProperty('meeting_mode');
  });

  it('toSalesStudent keeps code, name, status, program, teacher and guardian names only', () => {
    expect(toSalesStudent(studentRow())).toEqual({
      id: 's1', code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', teacher_name: 'أبرار', guardian_name: 'أم ياسمين',
    });
    expect(toSalesStudent({ ...studentRow(), code: null, teacher: null, guardian: null })).toMatchObject({ code: '', teacher_name: null, guardian_name: '' });
  });

  it('toSalesLive is the assistant row: names only, a missing student skipped', () => {
    expect(toSalesLive(liveRow())).toEqual({
      lesson_id: 'les-1', starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z', status: 'confirmed', teacher_name: 'أبرار', student_names: ['ياسمين'],
    });
    expect(toSalesLive({ ...liveRow(), teacher: null }).teacher_name).toBe('');
  });
});

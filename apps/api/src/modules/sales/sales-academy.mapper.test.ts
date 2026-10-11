import { describe, expect, it } from 'vitest';
import { liveRow, studentRow, teacherRow } from './sales-academy.fakes';
import { toSalesLive, toSalesStudent, toSalesTeacher } from './sales-academy.mapper';

describe('sales academy mappers (whitelists)', () => {
  it('toSalesTeacher keeps name, gender, programs and the current students by name; drops pay, phone, link, notes', () => {
    const row = teacherRow();
    row.students = [{ id: 'b', code: null, name: 'يوسف', status: 'trial', program: 'arabic' }, { id: 'a', code: 'AB-1', name: 'أحمد', status: 'paused', program: 'quran' }, ...row.students];
    const out = toSalesTeacher(row);
    expect(Object.keys(out).sort()).toEqual(['gender', 'id', 'lessons_today', 'live_now', 'name', 'name_en', 'programs', 'students']);
    expect(out.students.map((s) => [s.id, s.code, s.status])).toEqual([['a', 'AB-1', 'paused'], ['s1', 'AB-0101', 'active'], ['b', '', 'trial']]);
    expect(out.students[2]).toEqual({ id: 'b', code: '', name: 'يوسف', program: 'arabic', status: 'trial', next_lesson_at: null });
    expect([out.lessons_today, out.live_now]).toEqual([0, false]);
  });

  it('toSalesTeacher takes today’s facts by teacher and the next lesson by student', () => {
    const facts = new Map([['tc1', { lessons_today: 3, live_now: true }]]);
    const out = toSalesTeacher(teacherRow(), { facts, next: new Map([['s1', '2026-10-12T15:00:00.000Z']]) });
    expect([out.lessons_today, out.live_now, out.students[0]?.next_lesson_at]).toEqual([3, true, '2026-10-12T15:00:00.000Z']);
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

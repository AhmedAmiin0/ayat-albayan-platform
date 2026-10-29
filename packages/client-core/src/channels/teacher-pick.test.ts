import { describe, expect, it } from 'vitest';
import { teacherChoice } from './teacher-pick.js';

const students = [{ id: 's1', teacher_id: 't1' }, { id: 's2', teacher_id: null }];

describe('teacherChoice (owner 2026-10-29: the assistant assigns the teacher at the subscription)', () => {
  it('the student’s own teacher (the trial’s) by default, sent with the package', () => {
    expect(teacherChoice(students, { studentId: 's1', pick: null })).toEqual({ teacherId: 't1', body: { teacherId: 't1' } });
  });

  it('her pick wins for that student only; another child starts from theirs', () => {
    const pick = { studentId: 's1', teacherId: 't2' };
    expect(teacherChoice(students, { studentId: 's1', pick }).teacherId).toBe('t2');
    expect(teacherChoice(students, { studentId: 's2', pick })).toEqual({ teacherId: '', body: {} });
  });

  it('an inactive own teacher (not among the loaded choices) is no default; while loading it stays', () => {
    expect(teacherChoice(students, { studentId: 's1', pick: null, options: [{ id: 't9' }] }).body).toEqual({});
    expect(teacherChoice(students, { studentId: 's1', pick: null, options: [{ id: 't1' }] }).teacherId).toBe('t1');
    expect(teacherChoice(students, { studentId: 's1', pick: null, options: undefined }).teacherId).toBe('t1');
  });

  it('«none» picked or no student: nothing sent', () => {
    expect(teacherChoice(students, { studentId: 's1', pick: { studentId: 's1', teacherId: '' } }).body).toEqual({});
    expect(teacherChoice(students, { studentId: '', pick: null }).body).toEqual({});
  });
});

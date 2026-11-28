import { describe, expect, it } from 'vitest';
import { teacherStudentRoutes } from './teacher-students.routes';

const student = {
  id: 's1',
  code: 'AB-0001',
  name: 'Ali',
  status: 'active',
  program: 'quran',
  level: null,
  age: 9,
  next_lesson_at: null,
};

describe('teacherStudentRoutes (R-TCH-03)', () => {
  it('keeps the path the api serves today', () => {
    const { mine } = teacherStudentRoutes;
    expect(`${mine.method} ${mine.path}`).toBe('GET /teachers/me/students');
  });

  it('answers my students, nothing else', () => {
    expect(teacherStudentRoutes.mine.response.parse([student])).toEqual([student]);
  });

  it.each([
    ['an unknown status', { ...student, status: 'gone' }],
    ['an unknown program', { ...student, program: 'chess' }],
    ['a text age', { ...student, age: '9' }],
  ])('refuses a student with %s', (_name, row) => {
    expect(teacherStudentRoutes.mine.response.safeParse([row]).success).toBe(false);
  });
});

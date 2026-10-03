import { describe, expect, it } from 'vitest';
import { lesson, student } from './teacher-students.fakes';
import { nextLessonByStudent, studentIdsOf, toStudentViews } from './teacher-students.mapper';

const NOW = new Date('2026-10-03T12:00:00Z');

describe('nextLessonByStudent', () => {
  it('takes the earliest upcoming scheduled / confirmed lesson per student, as ISO UTC', () => {
    const next = nextLessonByStudent(
      [
        lesson({ starts_at: '2026-10-07 14:00:00+00', students: ['s1', 's2'] }),
        lesson({ starts_at: '2026-10-05 14:00:00+00', status: 'confirmed' }),
      ],
      NOW,
    );
    expect(next.get('s1')).toBe('2026-10-05T14:00:00.000Z');
    expect(next.get('s2')).toBe('2026-10-07T14:00:00.000Z');
  });

  it('ignores past, cancelled and completed lessons', () => {
    const next = nextLessonByStudent(
      [
        lesson({ starts_at: '2026-10-01T10:00:00Z' }),
        lesson({ starts_at: '2026-10-06T10:00:00Z', status: 'cancelled_by_admin' }),
        lesson({ starts_at: '2026-10-06T10:00:00Z', status: 'completed' }),
      ],
      NOW,
    );
    expect(next.size).toBe(0);
  });
});

describe('studentIdsOf', () => {
  it('is the distinct student ids over all lessons, past or future', () => {
    expect([...studentIdsOf([lesson({ students: ['a', 'b'] }), lesson({ students: ['b', 'c'] })])]).toEqual(['a', 'b', 'c']);
  });
});

describe('toStudentViews', () => {
  it('whitelists the fields, dedups by id and sorts by Arabic name', () => {
    const rows = [student({ id: 's2', name: 'يوسف', code: null }), student({ id: 's1', name: 'أحمد' }), student({ id: 's1', name: 'أحمد' })];
    const views = toStudentViews(rows, new Map([['s1', '2026-10-05T14:00:00.000Z']]));
    expect(views.map((v) => v.id)).toEqual(['s1', 's2']);
    expect(views[0]).toEqual({
      ...{ id: 's1', code: 'AB-0001', name: 'أحمد', status: 'active', program: 'quran' },
      ...{ level: null, age: 9, next_lesson_at: '2026-10-05T14:00:00.000Z' },
    });
    expect(views[1]).toMatchObject({ code: '', next_lesson_at: null });
  });

  it('never carries a key outside the whitelist even if the row had extras', () => {
    const row = { ...student({}), phone_e164: '+966500000000', guardian_id: 'g', price: 5 };
    expect(Object.keys(toStudentViews([row], new Map())[0] ?? {}).sort()).toEqual(
      ['age', 'code', 'id', 'level', 'name', 'next_lesson_at', 'program', 'status'],
    );
  });
});

import ar from '@ab/shared/i18n/ar.json';
import { describe, expect, it } from 'vitest';
import { lessonRows, studentRows, type LessonIn, type StudentIn } from './exports.rows';

const STUDENT: StudentIn = {
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  program: 'quran',
  age: 9,
  tz: 'Asia/Riyadh',
  created_at: '2026-09-30T21:30:00.000Z',
  guardian: { name: '=أم سهيلة', phone_e164: '+966552147730', country: 'SA', source: 'facebook_ad' },
  teacher: { display_name_ar: 'أبرار' },
};

describe('studentRows (C1)', () => {
  it('ar.json header, enum words, E.164 phone as-is, Riyadh registration time, typed text guarded', () => {
    const [head, row] = studentRows([STUDENT]);
    expect(head?.[0]).toBe(ar.students.code);
    expect(row).toEqual([
      'AB-0183',
      'سهيلة',
      ar.enums.studentStatus.active,
      ar.enums.program.quran,
      9,
      'أبرار',
      `'=أم سهيلة`,
      '+966552147730',
      'SA',
      ar.enums.leadSource.facebook_ad,
      'Asia/Riyadh',
      '2026-10-01 00:30',
    ]);
  });

  it('a student without guardian, teacher or code leaves those cells empty', () => {
    const [, row] = studentRows([{ ...STUDENT, code: null, guardian: null, teacher: null, age: null }]);
    expect(row?.slice(0, 1)).toEqual(['']);
    expect(row?.slice(4, 10)).toEqual([null, '', '', '', '', '']);
  });
});

const LESSON: LessonIn = {
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:30:00.000Z',
  status: 'completed',
  teacher: { display_name_ar: 'أبرار' },
  lesson_students: [
    { attendance: 'on_time', chargeable: true, student: { code: 'AB-0183', name: 'سهيلة' } },
    { attendance: null, chargeable: false, student: { code: 'AB-0184', name: 'مريم' } },
  ],
};

describe('lessonRows (C2)', () => {
  it('one row per (lesson, student) with Riyadh date and time and the duration word', () => {
    const rows = lessonRows([LESSON]);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual([
      '2026-10-01', '16:00', ar.enums.duration[30], 'أبرار', 'AB-0183', 'سهيلة',
      ar.enums.lessonStatus.completed, ar.enums.attendance.on_time, ar.common.yes,
    ]);
    expect(rows[2]?.slice(7)).toEqual(['', ar.common.no]);
  });

  it('a lesson without students keeps one row; an odd length is written in minutes', () => {
    const rows = lessonRows([{ ...LESSON, ends_at: '2026-10-01T13:40:00.000Z', lesson_students: [] }]);
    expect(rows[1]).toEqual(['2026-10-01', '16:00', 40, 'أبرار', '', '', ar.enums.lessonStatus.completed, '', '']);
  });
});

import { describe, expect, it } from 'vitest';
import { teacherLessonCrm } from './teacher-lesson.crm';

// docs/19 «crm driver»: a teacher's lesson as the CRM's teacher_lesson_v2 (the old script's).

const TEACHER = { display_name_ar: 'أ. خالد', tz: 'Africa/Cairo' };
const LESSON = { id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' };
const STUDENTS = [{ name: 'سهيلة', code: 'AB-0101' }, { name: 'مريم', code: 'AB-0102' }];
const crmOf = (over: Partial<Parameters<typeof teacherLessonCrm>[0]> = {}) =>
  teacherLessonCrm({ teacher: TEACHER, lesson: LESSON, students: STUDENTS, ...over });

describe('teacherLessonCrm', () => {
  it('teacher, students, codes, the time in the teacher\'s tz, the duration; join and report suffixes', () => {
    const crm = crmOf();
    expect(crm?.body).toEqual([
      'أ. خالد',
      'سهيلة ومريم',
      'AB-0101، AB-0102',
      expect.stringContaining('17:00'),
      '45 دقيقة',
    ]);
    expect(crm?.buttons).toEqual(['classroom/L1', 'teacher/report/L1']);
  });

  it('a missing value (no teacher name, no code, no end) gives null: Meta values only', () => {
    expect(crmOf({ teacher: { ...TEACHER, display_name_ar: null } })).toBeNull();
    expect(crmOf({ students: [{ name: 'سهيلة', code: null }] })).toBeNull();
    expect(crmOf({ students: [{ name: 'سهيلة' }] })).toBeNull();
    expect(crmOf({ lesson: { ...LESSON, ends_at: null } })).toBeNull();
    // A nameless student would shift the codes against the names.
    expect(crmOf({ students: [{ name: ' ', code: 'AB-0100' }, ...STUDENTS] })).toBeNull();
  });
});

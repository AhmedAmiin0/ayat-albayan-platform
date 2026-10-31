import { describe, expect, it } from 'vitest';
import { teacherLessonCrm, teacherReminderCrm } from './teacher-lesson.crm';

// docs/19 «crm driver»: a teacher's lesson as the CRM's own templates (the old script's).

const TEACHER = { display_name_ar: 'أ. خالد', tz: 'Africa/Cairo' };
const LESSON = { id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' };
const STUDENTS = [{ name: 'سهيلة', code: 'AB-0101' }, { name: 'مريم', code: 'AB-0102' }];
const crmOf = (over: Partial<Parameters<typeof teacherLessonCrm>[0]> = {}) =>
  teacherLessonCrm({ teacher: TEACHER, lesson: LESSON, students: STUDENTS, ...over });

describe('teacherLessonCrm (teacher_new_student → teacher_lesson_v2)', () => {
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

const ORIGIN = 'https://app.example';
const MEET = 'https://meet.google.com/abc-defg-hij';
const REMINDED = { ...LESSON, meeting_link: MEET, students: STUDENTS };
type ReminderInput = Parameters<typeof teacherReminderCrm>[0];
const remind = (over: Partial<ReminderInput> = {}) =>
  teacherReminderCrm({ teacher: TEACHER, lesson: REMINDED, origin: ORIGIN, ...over });

describe('teacherReminderCrm (teacher_lesson_reminder / _meet → the CRM\'s teacher_lesson_reminder)', () => {
  it('[teacher, one line]: time in the teacher\'s tz · students with codes · join · report; no buttons', () => {
    expect(remind()).toEqual({
      body: [
        'أ. خالد',
        'الأحد 4 أكتوبر 17:00 · سهيلة (AB-0101) ومريم (AB-0102) · رابط الحلقة: https://meet.google.com/abc-defg-hij · تقرير الحلقة: https://app.example/teacher/report/L1',
      ],
      buttons: [],
    });
  });

  it('no link of its own: join = our classroom, absolute', () => {
    const line = remind({ lesson: { ...REMINDED, meeting_link: null } })?.body?.[1];
    expect(line).toContain('رابط الحلقة: https://app.example/classroom/L1 · تقرير الحلقة: https://app.example/teacher/report/L1');
  });

  it('one line for Meta: no newline, no tab, never 4 spaces in a row', () => {
    const students = [{ name: 'سهيلة\n\tبنت     أحمد', code: 'AB-0101' }];
    const crm = remind({ teacher: { ...TEACHER, display_name_ar: 'أ.\n  خالد' }, lesson: { ...REMINDED, students } });
    expect(crm?.body?.[0]).toBe('أ. خالد');
    expect(crm?.body?.[1]).toContain(' · سهيلة بنت أحمد (AB-0101) · ');
    for (const value of crm?.body ?? []) expect(value).not.toMatch(/[\n\t]| {4}/);
  });

  it('a missing value (no origin, no teacher name, a student without a code) gives null', () => {
    expect(remind({ origin: '' })).toBeNull();
    expect(remind({ teacher: { ...TEACHER, display_name_ar: ' ' } })).toBeNull();
    expect(remind({ lesson: { ...REMINDED, students: [{ name: 'سهيلة', code: null }] } })).toBeNull();
    expect(remind({ lesson: { ...REMINDED, students: [] } })).toBeNull();
  });
});

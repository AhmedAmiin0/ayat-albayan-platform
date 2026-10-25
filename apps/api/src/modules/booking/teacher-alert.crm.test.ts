import { describe, expect, it } from 'vitest';
import { teacherAlertCrm } from './teacher-alert.crm';
import { teacherAlerts, type AlertLesson } from './teacher-alert.plan';

// docs/19 «crm driver»: teacher_new_student on a crm line = the CRM's teacher_lesson_v2 (the old script's).

const NOW = new Date('2026-10-01T08:00:00Z');
const TEACHER = { id: 'T1', profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo', display_name_ar: 'أ. خالد' };
const LESSON: AlertLesson = { id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z', teacher: TEACHER };
const STUDENTS = [{ id: 's1', name: 'سهيلة', code: 'AB-0101' }, { id: 's2', name: 'مريم', code: 'AB-0102' }];

describe('teacherAlertCrm', () => {
  it('teacher, students, codes, the time in the teacher\'s tz, the duration; join and report button suffixes', () => {
    const crm = teacherAlertCrm({ teacher: TEACHER, lesson: LESSON, students: STUDENTS });
    expect(crm?.body).toEqual(['أ. خالد', 'سهيلة ومريم', 'AB-0101، AB-0102', expect.stringContaining('17:00'), '45 دقيقة']);
    expect(crm?.buttons).toEqual(['classroom/L1', 'teacher/report/L1']);
  });

  it('a missing value (no teacher name, no code, no end) gives null: Meta values only', () => {
    expect(teacherAlertCrm({ teacher: { ...TEACHER, display_name_ar: null }, lesson: LESSON, students: STUDENTS })).toBeNull();
    expect(teacherAlertCrm({ teacher: TEACHER, lesson: LESSON, students: [{ name: 'سهيلة', code: null }] })).toBeNull();
    expect(teacherAlertCrm({ teacher: TEACHER, lesson: { ...LESSON, ends_at: null }, students: STUDENTS })).toBeNull();
  });

  it('the queued row keeps the Meta values {{1}}–{{3}} and adds crm beside them', () => {
    const [plan] = teacherAlerts({ lessons: [LESSON], students: STUDENTS, kind: 'trial', now: NOW });
    expect(plan?.message?.template_params).toMatchObject({
      '1': 'سهيلة ومريم',
      '3': 'تجريبية',
      crm: { buttons: ['classroom/L1', 'teacher/report/L1'] },
    });
  });
});

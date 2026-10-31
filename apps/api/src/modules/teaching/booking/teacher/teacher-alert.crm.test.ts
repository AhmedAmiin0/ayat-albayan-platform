import { describe, expect, it } from 'vitest';
import { teacherAlerts, type AlertLesson } from './teacher-alert.plan';

// docs/19 «crm driver»: teacher_new_student on a crm line = the CRM's teacher_lesson_v2 (the old script's).
// The values themselves: teacherLessonCrm (messaging/reminders/plan/teacher-lesson.crm.test.ts).

const NOW = new Date('2026-10-01T08:00:00Z');
const TEACHER = { id: 'T1', profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo', display_name_ar: 'أ. خالد' };
const LESSON: AlertLesson = { id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z', teacher: TEACHER };
const STUDENTS = [{ id: 's1', name: 'سهيلة', code: 'AB-0101' }, { id: 's2', name: 'مريم', code: 'AB-0102' }];

describe('teacherAlerts on a crm line', () => {
  it('the queued row keeps the Meta values {{1}}–{{3}} and adds crm beside them', () => {
    const [plan] = teacherAlerts({ lessons: [LESSON], students: STUDENTS, kind: 'trial', now: NOW });
    expect(plan?.message?.template_params).toMatchObject({
      '1': 'سهيلة ومريم',
      '3': 'تجريبية',
      crm: { buttons: ['classroom/L1', 'teacher/report/L1'] },
    });
  });
});

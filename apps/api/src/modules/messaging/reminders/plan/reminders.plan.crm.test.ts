import { describe, expect, it } from 'vitest';
import { at, RIYADH_GUARDIAN, sampleLesson } from '@/modules/messaging/reminders/reminders.fakes';
import { classroomUrl } from './reminders.links';
import { planReminders, type ReminderLesson } from './reminders.plan';

// docs/19 «crm driver»: the teacher's same-day reminder carries the CRM's teacher_lesson_reminder
// values ({{1}} the teacher, {{2}} one line, no buttons) beside the unchanged Meta values.

const ORIGIN = 'https://app.example';
const NOW = at('2026-10-04T13:00:00Z');
const STUDENTS = [
  { id: 's-1', name: 'سهيلة', code: 'AB-0101', guardian: RIYADH_GUARDIAN },
  { id: 's-3', name: 'ياسين', code: 'AB-0103', guardian: null },
];
const REPORT = 'تقرير الحلقة: https://app.example/teacher/report/lesson-1';

const teacherRow = (lesson: ReminderLesson, origin = ORIGIN) =>
  planReminders({ lessons: [lesson], minutesBefore: 60, dayBefore: false, origin, now: NOW }).find(
    (r) => r.dedup_key.startsWith('teacher_lesson_reminder:'),
  );
const coded = (meeting_link: string | null) => sampleLesson({ students: STUDENTS, meeting_link });

describe('planReminders: the teacher row on a crm line (teacher_lesson_reminder)', () => {
  it('a Meet lesson: Meta keeps _meet and the code; the CRM gets [teacher, one line], no buttons', () => {
    const row = teacherRow(coded('https://meet.google.com/abc-defg-hij'));
    expect(row?.template_key).toBe('teacher_lesson_reminder_meet');
    expect(row?.template_params).toEqual({
      '1': 'هدى',
      '2': '17:00 — سهيلة وياسين',
      button: 'abc-defg-hij',
      crm: {
        body: [
          'هدى',
          `الأحد 4 أكتوبر 17:00 · سهيلة (AB-0101) وياسين (AB-0103) · رابط الحلقة: https://meet.google.com/abc-defg-hij · ${REPORT}`,
        ],
        buttons: [],
      },
    });
  });

  it('our classroom (LiveKit: sentLinks put its URL in) or no link: join = the absolute room URL', () => {
    const room = classroomUrl(ORIGIN, 'lesson-1');
    for (const link of [room, null]) {
      const row = teacherRow(coded(link));
      expect(row?.template_key).toBe('teacher_lesson_reminder');
      expect(row?.template_params.crm?.buttons).toEqual([]);
      expect(row?.template_params.crm?.body?.[1]).toContain(`رابط الحلقة: ${room} · ${REPORT}`);
    }
  });

  it('no web origin, or a student without a code: the Meta values only', () => {
    expect(teacherRow(coded(null), '')?.template_params).not.toHaveProperty('crm');
    expect(teacherRow(sampleLesson())?.template_params).not.toHaveProperty('crm');
  });
});

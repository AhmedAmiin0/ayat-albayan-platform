import { describe, expect, it } from 'vitest';
import { teacherReminderCrm } from './teacher-lesson.crm';

// owner 2026-11-06: no short links any more. The reminder's one-line {{2}} carries the lesson's own
// meeting link and the teacher's no-login report page, both as they are.

const TEACHER = { display_name_ar: 'أ. خالد', tz: 'Africa/Cairo' };
const STUDENTS = [{ name: 'سهيلة', code: 'AB-0101' }];
const LESSON = {
  id: 'L1',
  starts_at: '2026-10-04T14:00:00Z',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  students: STUDENTS,
};
const ORIGIN = 'https://app.example';
const PAGE = `${ORIGIN}/teacher-report/tok`;
const links = { join: 'join-tok', report: { token: 'tok', url: PAGE, exp: 0 } };

describe('teacherReminderCrm with direct links (the WABA {{2}} on either driver)', () => {
  it('«تقرير الحلقة: <the no-login page>» next to the Meet link, still one line', () => {
    const line =
      teacherReminderCrm({ teacher: TEACHER, lesson: LESSON, origin: ORIGIN, links })?.body?.[1] ??
      '';
    expect(line).toBe(
      `الأحد 4 أكتوبر 17:00 · سهيلة (AB-0101) · رابط الحلقة: https://meet.google.com/abc-defg-hij · تقرير الحلقة: ${PAGE}`,
    );
    expect(line).not.toMatch(/[\n\t]| {4}|\/r\//);
  });

  it('our classroom page goes as it is (never shortened)', () => {
    const lesson = { ...LESSON, meeting_link: `${ORIGIN}/classroom/L1` };
    const line = teacherReminderCrm({ teacher: TEACHER, lesson, origin: ORIGIN, links })?.body?.[1];
    expect(line).toContain(`رابط الحلقة: ${ORIGIN}/classroom/L1 · تقرير الحلقة: ${PAGE}`);
  });

  it('no signed links (no secret, a failure): the signed-in report page, as before', () => {
    const line = teacherReminderCrm({ teacher: TEACHER, lesson: LESSON, origin: ORIGIN })
      ?.body?.[1];
    expect(line).toContain(`تقرير الحلقة: ${ORIGIN}/teacher/report/L1`);
  });
});

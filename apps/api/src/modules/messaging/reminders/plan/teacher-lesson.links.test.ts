import { describe, expect, it } from 'vitest';
import { teacherReminderCrm } from './teacher-lesson.crm';

// owner 2026-11-05: the reminder carries the teacher's no-login report link, shortened, next to the
// meeting link; a Meet link stays as it is, only our own classroom page is shortened (docs/19).

const TEACHER = { display_name_ar: 'أ. خالد', tz: 'Africa/Cairo' };
const STUDENTS = [{ name: 'سهيلة', code: 'AB-0101' }];
const LESSON = {
  id: 'L1',
  starts_at: '2026-10-04T14:00:00Z',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  students: STUDENTS,
};
const ORIGIN = 'https://app.example';
const REPORT = 'https://api.example/r/Ab12Cd34Ef';
const ROOM = 'https://api.example/r/Zz98Yx76Wv';

describe('teacherReminderCrm with the short links (crm values = the WABA {{2}} on either driver)', () => {
  it('«تقرير الحلقة: <short>» next to the Meet link, still one line', () => {
    const line =
      teacherReminderCrm({
        teacher: TEACHER,
        lesson: LESSON,
        origin: ORIGIN,
        links: { report: REPORT },
      })?.body?.[1] ?? '';
    expect(line).toBe(
      `الأحد 4 أكتوبر 17:00 · سهيلة (AB-0101) · رابط الحلقة: https://meet.google.com/abc-defg-hij · تقرير الحلقة: ${REPORT}`,
    );
    expect(line).not.toMatch(/[\n\t]| {4}/);
    expect(line).not.toContain('/teacher/report/');
  });

  it('our classroom page goes as its short link', () => {
    const lesson = { ...LESSON, meeting_link: `${ORIGIN}/classroom/L1` };
    const line = teacherReminderCrm({
      teacher: TEACHER,
      lesson,
      origin: ORIGIN,
      links: { report: REPORT, join: ROOM },
    })?.body?.[1];
    expect(line).toContain(`رابط الحلقة: ${ROOM} · تقرير الحلقة: ${REPORT}`);
  });

  it('no short link made (no secret, a failure): the signed-in report page, as before', () => {
    const line = teacherReminderCrm({ teacher: TEACHER, lesson: LESSON, origin: ORIGIN, links: {} })
      ?.body?.[1];
    expect(line).toContain(`تقرير الحلقة: ${ORIGIN}/teacher/report/L1`);
  });
});

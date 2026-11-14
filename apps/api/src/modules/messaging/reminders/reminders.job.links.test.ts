import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueuedMessage } from './queued-row';
import { at, fakeJob, sampleLesson } from './reminders.fakes';

// owner 2026-11-06: teacher_lesson_v3 once approved (two link buttons), else the older reminder
// with direct links. No short link is made on this path.

const PAGE = 'https://app.example/teacher/report/L1';
const LINKS = { join: 'join-tok', report: { suffix: 'L1', url: PAGE } };
const coded = sampleLesson({
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  students: [
    {
      id: 's-1',
      name: 'سهيلة',
      code: 'AB-0101',
      guardian: { id: 'g1', phone_e164: '+966500000101', tz: 'Asia/Riyadh' },
    },
  ],
});
const NOW = '2026-10-04T13:10:00Z';
const teacherRow = (rows: QueuedMessage[]) =>
  rows.filter((r) => r.dedup_key.startsWith('teacher_lesson_reminder:'));

describe('RemindersJob: the teacher reminder’s template and links', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_URL', '');
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('teacher_lesson_v3 approved: the meeting URL in {{6}}, the join token and the lesson id as the buttons', async () => {
    const teacherLinks = new Map([[coded.id, LINKS]]);
    const { job, queued, queries } = fakeJob({
      lessons: [coded],
      teacherLinks,
      approved: ['teacher_lesson_v3'],
    });
    await job.runOnce(at(NOW));
    expect(queries.approved).toHaveBeenCalledWith(expect.arrayContaining(['teacher_lesson_v3']));
    const [row] = teacherRow(queued);
    expect(row?.template_key).toBe('teacher_lesson_v3');
    expect(row?.template_params).toMatchObject({
      '1': 'هدى',
      '2': 'سهيلة',
      '3': 'AB-0101',
      '5': '45 دقيقة',
      '6': 'https://meet.google.com/abc-defg-hij',
      buttons: ['join-tok', 'L1'],
    });
    expect(JSON.stringify(row?.template_params)).not.toContain('teacher-report');
    expect(JSON.stringify(row?.template_params)).not.toContain('teacher/report');
  });

  it('not approved: the older reminder, with the signed-in portal page (no /r/ link)', async () => {
    const { job, queued } = fakeJob({
      lessons: [coded],
      teacherLinks: new Map([[coded.id, LINKS]]),
    });
    await job.runOnce(at(NOW));
    const [row] = teacherRow(queued);
    expect(row?.template_key).toBe('teacher_lesson_reminder_meet');
    const line = row?.template_params.crm?.body?.[1] ?? '';
    expect(line).toContain(
      `رابط الحلقة: https://meet.google.com/abc-defg-hij · تقرير الحلقة: ${PAGE}`,
    );
    expect(line).not.toContain('/r/');
  });

  it('approved but the links could not be made: still sent, as the older reminder', async () => {
    const { job, queued } = fakeJob({ lessons: [coded], approved: ['teacher_lesson_v3'] });
    await job.runOnce(at(NOW));
    expect(teacherRow(queued).map((r) => r.template_key)).toEqual(['teacher_lesson_reminder_meet']);
  });

  it('teacher reminders OFF: no link is made', async () => {
    const { job, teacherLinks } = fakeJob({
      lessons: [coded],
      settings: { teacher_whatsapp_lesson_reminder: false },
    });
    await job.runOnce(at(NOW));
    expect(teacherLinks.build).not.toHaveBeenCalled();
  });
});

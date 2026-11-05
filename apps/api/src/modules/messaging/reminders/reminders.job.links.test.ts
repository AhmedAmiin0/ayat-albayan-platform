import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { at, fakeJob, sampleLesson } from './reminders.fakes';

// owner 2026-11-05: the teacher's reminder carries the short no-login report link (docs/19).

const REPORT = 'https://api.example/r/Ab12Cd34Ef';
const coded = sampleLesson({
  students: [
    {
      id: 's-1',
      name: 'سهيلة',
      code: 'AB-0101',
      guardian: { id: 'g1', phone_e164: '+966551234567', tz: 'Asia/Riyadh' },
    },
  ],
});

describe('RemindersJob: the teacher reminder’s short report link', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_URL', '');
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('asks for the links of the due lessons and puts the short link in the one-line {{2}}', async () => {
    const { job, queued, teacherLinks } = fakeJob({
      lessons: [coded],
      teacherLinks: new Map([[coded.id, { report: REPORT }]]),
    });
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(teacherLinks.build).toHaveBeenCalledTimes(1);
    const row = queued.find((r) => r.template_key === 'teacher_lesson_reminder');
    const line = row?.template_params.crm?.body?.[1] ?? '';
    expect(line).toContain(`تقرير الحلقة: ${REPORT}`);
    expect(line).not.toMatch(/[\n\t]| {4}/);
  });

  it('teacher reminders OFF: no link is made', async () => {
    const { job, teacherLinks } = fakeJob({
      lessons: [coded],
      settings: { teacher_whatsapp_lesson_reminder: false },
    });
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(teacherLinks.build).not.toHaveBeenCalled();
  });
});

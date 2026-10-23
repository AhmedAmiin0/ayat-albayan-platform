import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueuedMessage } from './queued-row';
import { at, fakeJob } from './reminders.fakes';

// docs/23b §3: legacy mode with no notification_rules rows queues exactly what the job queued before
// NotificationPolicy (the expectations below were recorded from the pre-change job, commit 30c4b6a1).

const view = (r: QueuedMessage) => [r.template_key, r.dedup_key, r.phone_e164, r.scheduled_for, r.expires_at].join(' | ');

describe('RemindersJob legacy parity (no rows)', () => {
  beforeEach(() => vi.stubEnv('LIVEKIT_URL', ''));
  afterEach(() => vi.unstubAllEnvs());

  it('same-day at the default 60 minutes', async () => {
    const { job, queued, push } = fakeJob();
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queued.map(view)).toEqual([
      'lesson_reminder | lesson_reminder:lesson-1:g-riyadh | +966500000101 | 2026-10-04T13:10:00.000Z | 2026-10-04T14:00:00.000Z',
      'lesson_reminder | lesson_reminder:lesson-1:g-london | +447700900102 | 2026-10-04T13:10:00.000Z | 2026-10-04T14:00:00.000Z',
      'teacher_lesson_reminder | teacher_lesson_reminder:lesson-1:t-1 | +966500000201 | 2026-10-04T13:10:00.000Z | 2026-10-04T14:00:00.000Z',
    ]);
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('settings.reminder_minutes_before 30: nothing at 50 minutes, all three at 30', async () => {
    const early = fakeJob({ settings: { reminder_minutes_before: 30 } });
    expect(await early.job.runOnce(at('2026-10-04T13:10:00Z'))).toMatchObject({ queued: 0, pushed: 0 });
    const due = fakeJob({ settings: { reminder_minutes_before: 30 } });
    expect(await due.job.runOnce(at('2026-10-04T13:30:00Z'))).toMatchObject({ queued: 3, pushed: 1 });
  });

  it('day-before (reminder_24h_enabled + approved): the lesson’s own time, expiring at local midnight', async () => {
    const { job, queued } = fakeJob({ settings: { reminder_24h_enabled: true }, approved: ['lesson_reminder_24h'] });
    await job.runOnce(at('2026-10-03T14:00:00Z'));
    expect(queued.map(view)).toEqual([
      'lesson_reminder_24h | lesson_reminder_24h:lesson-1:g-riyadh | +966500000101 | 2026-10-03T14:00:00.000Z | 2026-10-03T21:00:00.000Z',
      'lesson_reminder_24h | lesson_reminder_24h:lesson-1:g-london | +447700900102 | 2026-10-03T14:00:00.000Z | 2026-10-03T23:00:00.000Z',
    ]);
  });

  it('teacher_whatsapp_lesson_reminder off: the guardians only', async () => {
    const { job, queued } = fakeJob({ settings: { teacher_whatsapp_lesson_reminder: false } });
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queued.map((r) => r.dedup_key)).toEqual(['lesson_reminder:lesson-1:g-riyadh', 'lesson_reminder:lesson-1:g-london']);
  });
});

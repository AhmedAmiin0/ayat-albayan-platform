import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { at, fakeJob } from '../reminders.fakes';

// docs/23 §2c: the reminder rows as notification_rules decide them (module mode), and fail closed.

const NOW = at('2026-10-04T13:10:00Z'); // 50 minutes before the lesson
const keys = (rows: { dedup_key: string }[]) => rows.map((r) => r.dedup_key);
const module = (rows: { key: string; enabled?: boolean; timing?: unknown }[]) => ({ rules: { mode: 'module' as const, rows } });

describe('RemindersJob reads NotificationPolicy', () => {
  beforeEach(() => vi.stubEnv('LIVEKIT_URL', ''));
  afterEach(() => vi.unstubAllEnvs());

  it('lesson_reminder off: no same-day guardian reminder, the teacher’s stays', async () => {
    const { job, queued } = fakeJob(module([{ key: 'lesson_reminder', enabled: false }]));
    await job.runOnce(NOW);
    expect(keys(queued)).toEqual(['teacher_lesson_reminder:lesson-1:t-1']);
  });

  it('lesson_reminder minutes_before 45: not due at 50 minutes, due at 45 (the push too)', async () => {
    const opts = module([{ key: 'lesson_reminder', timing: { minutes_before: 45 } }]);
    const early = fakeJob(opts);
    expect(await early.job.runOnce(NOW)).toMatchObject({ queued: 0, pushed: 0 });
    const due = fakeJob(opts);
    expect(await due.job.runOnce(at('2026-10-04T13:15:00Z'))).toMatchObject({ queued: 3, pushed: 1 });
  });

  it('teacher_lesson_reminder minutes_before 30: the teacher later than the families', async () => {
    const opts = module([{ key: 'teacher_lesson_reminder', timing: { minutes_before: 30 } }]);
    const first = fakeJob(opts);
    await first.job.runOnce(NOW);
    expect(keys(first.queued)).toEqual(['lesson_reminder:lesson-1:g-riyadh', 'lesson_reminder:lesson-1:g-london']);
    const later = fakeJob(opts);
    await later.job.runOnce(at('2026-10-04T13:30:00Z'));
    expect(keys(later.queued)).toContain('teacher_lesson_reminder:lesson-1:t-1');
  });

  it('teacher_lesson_reminder off in module mode, whatever the legacy key says', async () => {
    const opts = { ...module([{ key: 'teacher_lesson_reminder', enabled: false }]), settings: { teacher_whatsapp_lesson_reminder: true } };
    const { job, queued } = fakeJob(opts);
    await job.runOnce(NOW);
    expect(keys(queued)).not.toContain('teacher_lesson_reminder:lesson-1:t-1');
  });

  it('lesson_reminder_24h send_at_local 20:00: at 20:00 the previous local day, same expiry', async () => {
    const opts = { ...module([{ key: 'lesson_reminder_24h', enabled: true, timing: { send_at_local: '20:00' } }]), approved: ['lesson_reminder_24h'] };
    const before = fakeJob(opts);
    await before.job.runOnce(at('2026-10-03T14:00:00Z')); // the lesson's own time: too early now
    expect(before.queued).toEqual([]);
    const riyadh = fakeJob(opts);
    await riyadh.job.runOnce(at('2026-10-03T17:00:00Z')); // 20:00 Riyadh, 18:00 London
    expect(riyadh.queued.map((r) => [r.dedup_key, r.expires_at])).toEqual([['lesson_reminder_24h:lesson-1:g-riyadh', '2026-10-03T21:00:00.000Z']]);
  });

  it('legacy mode: a stored send_at_local applies (it has no legacy key)', async () => {
    const rows = [{ key: 'lesson_reminder_24h', enabled: false, timing: { send_at_local: '20:00' } }];
    const opts = { rules: { rows }, settings: { reminder_24h_enabled: true }, approved: ['lesson_reminder_24h'] };
    const { job, queued } = fakeJob(opts);
    await job.runOnce(at('2026-10-03T14:00:00Z'));
    expect(queued).toEqual([]);
  });

  it('lesson_join_link off: no family link and no approval lookup for it', async () => {
    vi.stubEnv('LIVEKIT_URL', 'wss://livekit.example');
    vi.stubEnv('LIVEKIT_API_KEY', 'key');
    vi.stubEnv('LIVEKIT_API_SECRET', 'secret');
    const opts = { ...module([{ key: 'lesson_join_link', enabled: false }]), settings: { meeting_link_auto: true }, approved: ['lesson_join_link'] };
    const { job, queries } = fakeJob(opts);
    await job.runOnce(NOW);
    expect(queries.approved).not.toHaveBeenCalled();
    expect(queries.roomLinks).toHaveBeenCalledWith([], NOW);
  });

  it('lesson_needs_confirmation off: no push, reminders unchanged', async () => {
    const { job, push } = fakeJob(module([{ key: 'lesson_needs_confirmation', enabled: false }]));
    expect(await job.runOnce(NOW)).toMatchObject({ queued: 3, pushed: 0 });
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('rules unreadable: nothing queued, nothing pushed, cleanup still runs', async () => {
    const { job, queries, push } = fakeJob({ rules: { fail: true } });
    expect(await job.runOnce(NOW)).toMatchObject({ queued: 0, pushed: 0 });
    expect(queries.queue).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
    expect(queries.dropCancelled).toHaveBeenCalledWith(NOW);
  });
});

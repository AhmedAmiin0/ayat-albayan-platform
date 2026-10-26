import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { at, fakeJob } from './reminders.fakes';
import { lookaheadHours } from './plan/reminders.rules';

// A fixed day-before hour (send_at_local, as early as 06:00 the previous day) is up to ~42 h ahead:
// the read widens to 48 h only then; otherwise it is reminder_lookahead_hours, unchanged.

const NOW = at('2026-10-03T03:00:00Z'); // 06:00 Riyadh, 35 h before the 4 Oct 14:00Z lesson
const day24 = (enabled: boolean, send: string | null) => ({
  rules: { mode: 'module' as const, rows: [{ key: 'lesson_reminder_24h', enabled, timing: { send_at_local: send } }] },
  approved: ['lesson_reminder_24h'],
});

describe('lookaheadHours', () => {
  it('the setting as is unless the day-before rule is on with a fixed hour', () => {
    expect(lookaheadHours(25, { dayBefore: true, dayBeforeAt: null })).toBe(25);
    expect(lookaheadHours(25, { dayBefore: false, dayBeforeAt: '06:00' })).toBe(25);
    expect(lookaheadHours(25, { dayBefore: true, dayBeforeAt: '06:00' })).toBe(48);
    expect(lookaheadHours(72, { dayBefore: true, dayBeforeAt: '06:00' })).toBe(72);
  });
});

describe('RemindersJob — the read window and the day-before hour', () => {
  beforeEach(() => vi.stubEnv('LIVEKIT_URL', ''));
  afterEach(() => vi.unstubAllEnvs());

  it('send_at_local null: exactly reminder_lookahead_hours (25 h)', async () => {
    const { job, queries } = fakeJob(day24(true, null));
    await job.runOnce(NOW);
    expect(queries.upcoming).toHaveBeenCalledWith({ now: NOW, until: at('2026-10-04T04:00:00Z') });
  });

  it('send_at_local 06:00 with the rule on: 48 h, and the 06:00 reminder of a lesson 35 h ahead is queued on time', async () => {
    const { job, queries, queued } = fakeJob(day24(true, '06:00'));
    await job.runOnce(NOW);
    expect(queries.upcoming).toHaveBeenCalledWith({ now: NOW, until: at('2026-10-05T03:00:00Z') });
    expect(queued.map((r) => r.dedup_key)).toContain('lesson_reminder_24h:lesson-1:g-riyadh');
  });

  it('send_at_local set but the rule off: the window is not widened', async () => {
    const { job, queries } = fakeJob(day24(false, '06:00'));
    await job.runOnce(NOW);
    expect(queries.upcoming).toHaveBeenCalledWith({ now: NOW, until: at('2026-10-04T04:00:00Z') });
  });
});

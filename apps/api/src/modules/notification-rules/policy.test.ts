import { describe, expect, it } from 'vitest';
import { fakePolicy } from './policy.fakes';

describe('NotificationPolicy', () => {
  it('legacy mode, no rows: today’s switches (24h off, booking confirmation on)', async () => {
    const policy = fakePolicy();
    expect(await policy.isOn('lesson_reminder_24h')).toBe(false);
    expect(await policy.isOn('booking_confirmation')).toBe(true);
    expect((await policy.rule('lesson_reminder')).timing).toEqual({ minutes_before: 60 });
  });

  it('module mode: the row decides', async () => {
    const policy = fakePolicy({ mode: 'module', rows: [{ key: 'new_lead', channels: ['bell'] }] });
    expect(await policy.channelOn('new_lead', 'bell')).toBe(true);
    expect(await policy.channelOn('new_lead', 'push')).toBe(false);
  });

  it('a failed read is closed for every row but the locked one, and known() is null', async () => {
    const policy = fakePolicy({ fail: true });
    expect(await policy.isOn('booking_confirmation')).toBe(false);
    expect(await policy.isOn('reminder_failed')).toBe(true);
    expect(await policy.known('report_ready')).toBeNull();
    const { snapshot, rules } = await policy.all();
    expect(snapshot).toBeNull();
    expect([...rules.values()].filter((r) => r.enabled)).toHaveLength(1);
  });
});

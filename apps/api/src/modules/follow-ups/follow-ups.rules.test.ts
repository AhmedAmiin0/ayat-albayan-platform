import { describe, expect, it } from 'vitest';
import { setup } from './follow-ups.job.fakes';

// docs/23 §2c: FollowUpsJob reads the follow_up_slots rule (on/off, hours, slot window) from NotificationPolicy.

const d = (iso: string) => new Date(iso);
const CYCLE = Date.parse('2026-10-01T10:00:00Z');
const timing = { hours: [6], slots_from_hours: 24, slots_to_days: 3 };

describe('FollowUpsJob and the follow_up_slots rule', () => {
  it('legacy parity: the same row as before NotificationPolicy (recorded at commit 30c4b6a1)', async () => {
    const { job, queued } = setup();
    await job.runOnce(d('2026-10-02T10:00:00Z'));
    expect(queued).toEqual([
      {
        direction: 'outbound',
        status: 'queued',
        phone_e164: '+966500000301',
        guardian_id: null,
        lead_id: 'lead-1',
        lesson_id: null,
        template_key: 'follow_up_slots',
        template_params: { '1': 'الأحد 4 أكتوبر 17:00', '2': 'الاثنين 5 أكتوبر 18:00', '3': 'الرياض', payloads: ['stop:lead-1'] },
        dedup_key: `follow_up_slots:lead-1:${CYCLE}:0`,
        scheduled_for: '2026-10-02T10:00:00.000Z',
        expires_at: '2026-10-04T14:00:00.000Z',
      },
    ]);
  });

  it('legacy mode: the settings keys still decide the hours and the window', async () => {
    const rules = { settings: { follow_up_hours: [6, 48], follow_up_slots_from_hours: 24, follow_up_slots_to_days: 3 } };
    const { job, queries, slots } = setup({ rules });
    expect(await job.runOnce(d('2026-10-01T16:00:00Z'))).toMatchObject({ queued: 1 });
    expect(queries.candidates).toHaveBeenCalledWith(2);
    expect(slots.freeStarts).toHaveBeenCalledWith(d('2026-10-01T16:00:00Z'), { slots_from_hours: 24, slots_to_days: 3 });
  });

  it('module mode: the row’s hours and window', async () => {
    const { job, queries, slots } = setup({ rules: { mode: 'module', rows: [{ key: 'follow_up_slots', timing }] } });
    expect(await job.runOnce(d('2026-10-01T15:59:00Z'))).toMatchObject({ notDue: 1, queued: 0 });
    expect(await job.runOnce(d('2026-10-01T16:00:00Z'))).toMatchObject({ queued: 1 });
    expect(queries.candidates).toHaveBeenCalledWith(1);
    expect(slots.freeStarts).toHaveBeenCalledWith(d('2026-10-01T16:00:00Z'), { slots_from_hours: 24, slots_to_days: 3 });
  });

  it('module mode, the row off: no lead read, nothing queued, no stage advanced', async () => {
    const prior = { id: 'm1', status: 'sent' as const, error_code: null };
    const { job, queries, queued, advanced } = setup({ prior, rules: { mode: 'module', rows: [{ key: 'follow_up_slots', enabled: false }] } });
    expect(await job.runOnce(d('2026-10-02T10:00:00Z'))).toMatchObject({ leads: 0, queued: 0, advanced: 0 });
    expect(queries.candidates).not.toHaveBeenCalled();
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
  });

  it('rules unreadable: fail closed, nothing read or queued', async () => {
    const { job, queries, queued } = setup({ rules: { fail: true } });
    expect(await job.runOnce(d('2026-10-02T10:00:00Z'))).toMatchObject({ leads: 0, queued: 0 });
    expect(queries.candidates).not.toHaveBeenCalled();
    expect(queued).toEqual([]);
  });
});

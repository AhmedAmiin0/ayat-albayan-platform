import { describe, expect, it } from 'vitest';
import { setup } from './follow-ups.job.fakes';
import { sampleLead } from './follow-ups.fakes';

const d = (iso: string) => new Date(iso);
const DUE = d('2026-10-02T10:00:00Z');
const CYCLE = Date.parse('2026-10-01T10:00:00Z');

describe('FollowUpsJob.runOnce (R-LEAD-05)', () => {
  it('reads leads with a stage left under the follow_up_slots hours (legacy: settings.follow_up_hours)', async () => {
    const { job, queries } = setup({ leads: [] });
    await job.runOnce(DUE);
    expect(queries.candidates).toHaveBeenCalledWith(2);
  });

  it('automatic messages OFF: no lead read, nothing queued, no stage advanced', async () => {
    const { job, queries, queued, advanced } = setup({ auto: false, prior: { id: 'm1', status: 'sent', error_code: null } });
    expect(await job.runOnce(DUE)).toMatchObject({ leads: 0, queued: 0, advanced: 0 });
    expect(queries.candidates).not.toHaveBeenCalled();
    expect(queries.sync).not.toHaveBeenCalled();
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
  });

  it('held while OFF, then ON: the stage stays and fresh slots are queued under the same key', async () => {
    const { job, queries, queued, advanced } = setup({ prior: { id: 'm1', status: 'failed', error_code: 'auto_off' } });
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 1, advanced: 0 });
    expect(queries.drop).toHaveBeenCalledWith('m1');
    expect(queued[0]?.dedup_key).toBe(`follow_up_slots:lead-1:${CYCLE}:0`);
    expect(advanced).toEqual([]);
  });

  it('not due yet: only keeps next_follow_up_at in sync', async () => {
    const { job, queries, queued } = setup();
    expect(await job.runOnce(d('2026-10-02T09:59:00Z'))).toMatchObject({ notDue: 1, queued: 0 });
    expect(queries.sync).toHaveBeenCalledWith('lead-1', { next_follow_up_at: DUE.toISOString(), follow_up_note: null });
    expect(queued).toEqual([]);
  });

  it('already in sync → no write', async () => {
    const { job, queries } = setup({ leads: [sampleLead({ next_follow_up_at: '2026-10-02T10:00:00+00:00' })] });
    await job.runOnce(d('2026-10-02T09:00:00Z'));
    expect(queries.sync).not.toHaveBeenCalled();
  });

  it('due: two real slots on two days, keyed by this silence and stage; the stage waits for the send', async () => {
    const { job, queued, advanced, slots, queries } = setup();
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 1 });
    expect(slots.freeStarts).toHaveBeenCalledWith(DUE, { slots_from_hours: 12, slots_to_days: 7 });
    expect(queued[0]).toMatchObject({
      dedup_key: `follow_up_slots:lead-1:${CYCLE}:0`,
      template_params: { '1': 'الأحد 4 أكتوبر 17:00', '2': 'الاثنين 5 أكتوبر 18:00', '3': 'الرياض' },
    });
    expect(advanced).toEqual([]);
    expect(queries.sync).toHaveBeenCalledWith('lead-1', { next_follow_up_at: DUE.toISOString(), follow_up_note: 'queued' });
  });

  it('still queued (gate closed, retrying): waits, nothing new', async () => {
    const { job, queued, advanced } = setup({ prior: { id: 'm1', status: 'queued', error_code: null } });
    expect(await job.runOnce(DUE)).toMatchObject({ waiting: 1, queued: 0 });
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
  });

  it('sent: stage 0 → 1 with the 72 h due time', async () => {
    const { job, advanced, queued } = setup({ prior: { id: 'm1', status: 'sent', error_code: null } });
    expect(await job.runOnce(DUE)).toMatchObject({ advanced: 1 });
    expect(advanced).toEqual([{ id: 'lead-1', stage: 0, next: d('2026-10-04T10:00:00Z') }]);
    expect(queued).toEqual([]);
  });

  it('the last stage, once sent: nothing is due any more', async () => {
    const lead = sampleLead({ follow_up_stage: 1 });
    const { job, advanced, keys } = setup({ leads: [lead], prior: { id: 'm2', status: 'delivered', error_code: null } });
    await job.runOnce(d('2026-10-04T10:00:00Z'));
    expect(keys).toEqual([`follow_up_slots:lead-1:${CYCLE}:1`]);
    expect(advanced).toEqual([{ id: 'lead-1', stage: 1, next: null }]);
  });

  it('expired before it went out: the key is freed and fresh slots are queued, the stage stays', async () => {
    const { job, queries, queued, advanced } = setup({ prior: { id: 'm1', status: 'failed', error_code: 'expired' } });
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 1 });
    expect(queries.drop).toHaveBeenCalledWith('m1');
    expect(queued).toHaveLength(1);
    expect(advanced).toEqual([]);
  });

  it('the lead replied, then went silent again: a new cycle gets its own follow-up', async () => {
    const replied = sampleLead({ last_inbound_at: '2026-10-03T09:00:00Z' });
    const { job, queued } = setup({ leads: [replied] });
    expect(await job.runOnce(d('2026-10-04T09:00:00Z'))).toMatchObject({ queued: 1 });
    expect(queued[0]?.dedup_key).toBe(`follow_up_slots:lead-1:${Date.parse('2026-10-03T09:00:00Z')}:0`);
  });

  it('the key is already taken (another instance): counted as waiting, not queued', async () => {
    const { job } = setup({ inserted: 0 });
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 0, waiting: 1 });
  });

  it('template not approved: nothing queued, the stage stays, no slot lookup', async () => {
    const { job, queued, advanced, slots, queries } = setup({ approved: false });
    expect(await job.runOnce(DUE)).toMatchObject({ waitingTemplate: 1, queued: 0 });
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
    expect(slots.freeStarts).not.toHaveBeenCalled();
    expect(queries.sync).toHaveBeenCalledWith('lead-1', expect.objectContaining({ follow_up_note: 'waiting_template' }));
  });

  it('fewer than two free slots: nothing queued, retried next tick', async () => {
    const { job, queued, advanced, queries } = setup({ free: [DUE] });
    expect(await job.runOnce(DUE)).toMatchObject({ noSlots: 1 });
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
    expect(queries.sync).toHaveBeenCalledWith('lead-1', expect.objectContaining({ follow_up_note: 'no_slots' }));
  });

  it('free slots are read once per tick; one failing lead does not stop the others', async () => {
    const leads = [sampleLead(), sampleLead({ id: 'lead-2' }), sampleLead({ id: 'lead-3' })];
    const { job, queries, slots, queued } = setup({ leads });
    queries.queue.mockRejectedValueOnce(new Error('db hiccup'));
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 2, failed: 1 });
    expect(slots.freeStarts).toHaveBeenCalledTimes(1);
    expect(queued.map((r) => r.lead_id)).toEqual(['lead-2', 'lead-3']);
  });

  it('slots in the lead tz', async () => {
    const lead = sampleLead({ qualification: { tz: 'Africa/Cairo' } });
    const { job, queued } = setup({ leads: [lead] });
    await job.runOnce(DUE);
    expect(queued[0]?.template_params).toMatchObject({ '1': 'الأحد 4 أكتوبر 17:00', '3': 'القاهرة' });
  });

  it('never throws', async () => {
    const { job, queries } = setup();
    queries.candidates.mockRejectedValueOnce(new Error('db down'));
    await expect(job.runOnce(DUE)).resolves.toMatchObject({ queued: 0 });
  });
});

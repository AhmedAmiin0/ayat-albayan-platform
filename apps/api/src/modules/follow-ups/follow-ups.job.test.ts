import { describe, expect, it, vi } from 'vitest';
import { SETTING_DEFAULTS, type SettingsService } from '../../common/settings/settings.service';
import type { QueuedMessage } from '../reminders/queued-row';
import type { FollowUpSlots } from './follow-up-slots';
import { sampleLead } from './follow-ups.fakes';
import { FollowUpsJob } from './follow-ups.job';
import type { FollowUpLeadRow } from './follow-ups.plan';
import type { AdvanceInput, FollowUpsQueries } from './follow-ups.queries';

const d = (iso: string) => new Date(iso);
/** Sun 4 Oct 17:00, Sun 17:45, Mon 5 Oct 18:00 Riyadh. */
const FREE = [d('2026-10-04T14:00:00Z'), d('2026-10-04T14:45:00Z'), d('2026-10-05T15:00:00Z')];
const DUE = d('2026-10-02T10:00:00Z');

function setup(opts: { leads?: FollowUpLeadRow[]; approved?: boolean; free?: Date[] } = {}) {
  const queued: QueuedMessage[] = [];
  const advanced: AdvanceInput[] = [];
  const queries = {
    candidates: vi.fn(async () => opts.leads ?? [sampleLead()]),
    approved: vi.fn(async () => opts.approved ?? true),
    queue: vi.fn(async (row: QueuedMessage) => queued.push(row)),
    setNext: vi.fn(async () => undefined),
    advance: vi.fn(async (a: AdvanceInput) => advanced.push(a) > 0),
  };
  const slots = { freeStarts: vi.fn(async () => opts.free ?? FREE) };
  const settings = { all: async () => SETTING_DEFAULTS };
  const job = new FollowUpsJob(
    queries as unknown as FollowUpsQueries,
    slots as unknown as FollowUpSlots,
    settings as unknown as SettingsService,
  );
  return { job, queries, slots, queued, advanced };
}

describe('FollowUpsJob.runOnce (R-LEAD-05)', () => {
  it('reads leads with a stage left under settings.follow_up_hours', async () => {
    const { job, queries } = setup({ leads: [] });
    await job.runOnce(DUE);
    expect(queries.candidates).toHaveBeenCalledWith(2);
  });

  it('not due yet: only keeps next_follow_up_at in sync', async () => {
    const { job, queries, queued } = setup();
    expect(await job.runOnce(d('2026-10-02T09:59:00Z'))).toMatchObject({ notDue: 1, queued: 0 });
    expect(queries.setNext).toHaveBeenCalledWith('lead-1', DUE);
    expect(queued).toEqual([]);
  });

  it('already in sync → no write', async () => {
    const { job, queries } = setup({ leads: [sampleLead({ next_follow_up_at: '2026-10-02T10:00:00+00:00' })] });
    await job.runOnce(d('2026-10-02T09:00:00Z'));
    expect(queries.setNext).not.toHaveBeenCalled();
  });

  it('due: two real slots on two days, then stage 0 → 1 with the 72 h due time', async () => {
    const { job, queued, advanced, slots } = setup();
    expect(await job.runOnce(DUE)).toMatchObject({ queued: 1 });
    expect(slots.freeStarts).toHaveBeenCalledWith(DUE);
    expect(queued[0]).toMatchObject({
      dedup_key: 'follow_up_slots:lead-1:0',
      template_params: { '1': 'الأحد 4 أكتوبر 17:00', '2': 'الاثنين 5 أكتوبر 18:00', '3': 'الرياض' },
    });
    expect(advanced).toEqual([{ id: 'lead-1', stage: 0, next: d('2026-10-04T10:00:00Z') }]);
  });

  it('the last stage: sent, then nothing is due any more', async () => {
    const { job, advanced, queued } = setup({ leads: [sampleLead({ follow_up_stage: 1 })] });
    await job.runOnce(d('2026-10-04T10:00:00Z'));
    expect(queued[0]?.dedup_key).toBe('follow_up_slots:lead-1:1');
    expect(advanced).toEqual([{ id: 'lead-1', stage: 1, next: null }]);
  });

  it('template not approved: nothing queued, the stage stays, no slot lookup', async () => {
    const { job, queued, advanced, slots } = setup({ approved: false });
    expect(await job.runOnce(DUE)).toMatchObject({ waitingTemplate: 1, queued: 0 });
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
    expect(slots.freeStarts).not.toHaveBeenCalled();
  });

  it('fewer than two free slots: nothing queued, retried next tick', async () => {
    const { job, queued, advanced } = setup({ free: [FREE[0] ?? DUE] });
    expect(await job.runOnce(DUE)).toMatchObject({ noSlots: 1 });
    expect(queued).toEqual([]);
    expect(advanced).toEqual([]);
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

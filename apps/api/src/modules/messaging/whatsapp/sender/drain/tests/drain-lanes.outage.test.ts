import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { LineOutages } from '@/modules/messaging/whatsapp/sender/hold/line-outages';
import type { PaymentHoldRepo } from '@/modules/messaging/whatsapp/sender/hold/payment-hold.repo';
import {
  dispatch, job, NOW, push, queries, reminder, repo, resetPaymentFakes, subjects, worker,
} from '@/modules/messaging/whatsapp/sender/hold/worker-payment.fakes';
import { emptySummary } from '@/modules/messaging/whatsapp/sender/pass';
import { UNCERTAIN, type FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { drainLanes, type PassItem } from '@/modules/messaging/whatsapp/sender/drain/drain-lanes';
import { LaneLocks } from '@/modules/messaging/whatsapp/sender/drain/lane-locks';

// A provider outage holds the lane: no row fails, no try is counted, one push (audit BE-01, OPS-3).

const DOWN = new WaError('WhatsApp HTTP 503', { code: null, status: 503, lineDown: true });
const TIMED_OUT = new WaError('WhatsApp request timed out', {
  code: null, status: 0, uncertain: true, timedOut: true,
});
const OPEN = { open: true, automaticOn: true };
const ROWS = Array.from({ length: 10 }, (_, i) => reminder(`m${String(i).padStart(2, '0')}`));

async function drain(fail: WaError) {
  dispatch.send.mockRejectedValue(fail);
  const w = worker();
  w.outages = new LineOutages(repo as unknown as PaymentHoldRepo);
  const gate = { switches: vi.fn(async () => OPEN) } as unknown as SendGate;
  const deps = { gate, worker: w, locks: new LaneLocks(), pooled: new Set<string>(), size: 1 };
  const run = { summary: emptySummary(), paused: new Set<string>() };
  const items: PassItem[] = ROWS.map((row) => ({ job: job(row, NOW), pause: 'notifications' }));
  await drainLanes(deps, run, items);
  return run;
}

const plans = (): FailurePlan[] =>
  queries.failure.mock.calls.map((c: unknown[]) => c[1] as FailurePlan);
const deferredIds = (): string[] =>
  repo.deferMany.mock.calls.flatMap((c: unknown[]) => (c[0] as { ids: string[] }).ids);

beforeEach(() => {
  resetPaymentFakes();
});

describe('drainLanes: a provider outage (503 to every row)', () => {
  it('fails no row, counts no try and pushes once', async () => {
    const run = await drain(DOWN);
    expect(run.summary.failed).toBe(0);
    expect(plans()).toEqual([expect.objectContaining({ status: 'queued', attempts: 0 })]);
    expect(deferredIds()).toEqual(ROWS.slice(1).map((r) => r.id));
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(subjects()[0]).toMatch(/^whatsapp_outage:notifications:2026-10-30T08$/);
  });

  it('the lane is paused for the rest of the run', async () => {
    const run = await drain(DOWN);
    expect(run.paused).toEqual(new Set(['notifications']));
    expect(dispatch.send).toHaveBeenCalledTimes(1);
  });
});

describe('drainLanes: timeouts', () => {
  it('3 timeouts in a row: those rows are uncertain, the rest stay queued', async () => {
    const run = await drain(TIMED_OUT);
    expect(plans().map((p) => p.error_code)).toEqual([UNCERTAIN, UNCERTAIN, UNCERTAIN]);
    expect(dispatch.send).toHaveBeenCalledTimes(3);
    expect(deferredIds()).toEqual(ROWS.slice(3).map((r) => r.id));
    expect(run.paused).toEqual(new Set(['notifications']));
    expect(subjects().filter((s) => s.startsWith('whatsapp_outage:'))).toHaveLength(1);
  });
});

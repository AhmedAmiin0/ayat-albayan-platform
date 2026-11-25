import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { LINE_DOWN_MAX_MS, WA_LINE_DOWN } from '@/modules/messaging/whatsapp/sender/hold/line-down';
import { LineOutages } from '@/modules/messaging/whatsapp/sender/hold/line-outages';
import type { PaymentHoldRepo } from '@/modules/messaging/whatsapp/sender/hold/payment-hold.repo';
import { at, iso, NOTIFICATIONS } from '@/modules/messaging/whatsapp/sender/hold/tests/payment-holds.fakes';

// A provider outage holds the lane (the line, or the number) instead of failing its queue.

const downPlan: FailurePlan = {
  status: 'queued',
  next_attempt_at: iso(1),
  error_code: WA_LINE_DOWN,
  error_text: 'WhatsApp HTTP 503',
  attempts: 0,
};
const TIMED_OUT = new WaError('WhatsApp request timed out', {
  code: null, status: 0, uncertain: true, timedOut: true,
});
const ANSWERED = new WaError('(#131026) undeliverable', { code: 131026, status: 400 });

function setup() {
  const ok = async () => undefined;
  const repo = { defer: vi.fn(ok), deferMany: vi.fn(ok), move: vi.fn(ok) };
  return { repo, outages: new LineOutages(repo as unknown as PaymentHoldRepo) };
}

let t = setup();
beforeEach(() => {
  t = setup();
});

const probeAt = (min: number, id = 'm1') =>
  t.outages.probe(downPlan, { ...NOTIFICATIONS, now: at(min), row: dueMessage({ id }) });

describe('LineOutages', () => {
  it('a line-down row is the probe: holds 1 → 2 → 4 min while it keeps failing', async () => {
    expect((await probeAt(0)).next_attempt_at).toBe(iso(1));
    expect((await probeAt(1)).next_attempt_at).toBe(iso(3));
    expect((await probeAt(3)).next_attempt_at).toBe(iso(7));
  });

  it('the hold never grows past 30 min (not the 6 h of the 131042 hold)', async () => {
    let now = 0;
    for (let i = 0; i < 8; i += 1) {
      const next = (await probeAt(now)).next_attempt_at ?? '';
      now = (Date.parse(next) - at(0).getTime()) / 60_000;
    }
    const last = Date.parse((await probeAt(now)).next_attempt_at ?? '') - at(now).getTime();
    expect(last).toBe(LINE_DOWN_MAX_MS);
  });

  it('every row of a held lane is deferred: templates and session texts alike', async () => {
    await probeAt(0);
    const text = dueMessage({ id: 'm2', template_key: null, body: 'أهلًا' });
    expect(await t.outages.check(text, { ...NOTIFICATIONS, now: at(0) })).toBe('deferred');
    expect(t.repo.defer).toHaveBeenCalledWith(expect.objectContaining({ id: 'm2', code: WA_LINE_DOWN }));
  });

  it('the rest of the pass is deferred in one write', async () => {
    await probeAt(0);
    const rest = [dueMessage({ id: 'm2' }), dueMessage({ id: 'm3', template_key: null })];
    await t.outages.deferRest(rest, { ...NOTIFICATIONS, now: at(0) });
    expect(t.repo.deferMany).toHaveBeenCalledWith(expect.objectContaining({ ids: ['m2', 'm3'] }));
  });

  it('a sent row lifts the hold: the deferred rows are due now, the lane sends again', async () => {
    await probeAt(0);
    await t.outages.lift({ ...NOTIFICATIONS, now: at(0.5) });
    const to = at(0.5).toISOString();
    expect(t.repo.move).toHaveBeenCalledWith(expect.objectContaining({ to }));
    const row = dueMessage({ id: 'm2' });
    expect(await t.outages.check(row, { ...NOTIFICATIONS, now: at(0.5) })).toBe('send');
  });

  it('other plans pass through untouched', async () => {
    const plan = { ...downPlan, error_code: '131026', status: 'failed' as const };
    const row = dueMessage({ id: 'm1' });
    expect(await t.outages.probe(plan, { ...NOTIFICATIONS, now: at(0), row })).toBe(plan);
  });
});

describe('LineOutages: timeouts', () => {
  const settle = (error: unknown) => t.outages.settle(error, { ...NOTIFICATIONS, now: at(0) });

  it('the third timeout in a row holds the lane', async () => {
    expect([await settle(TIMED_OUT), await settle(TIMED_OUT)]).toEqual([false, false]);
    expect(await settle(TIMED_OUT)).toBe(true);
    expect(await t.outages.check(dueMessage({ id: 'm9' }), { ...NOTIFICATIONS, now: at(0) })).toBe(
      'deferred',
    );
  });

  it('an answer from the provider breaks the run', async () => {
    await settle(TIMED_OUT);
    await settle(TIMED_OUT);
    expect(await settle(ANSWERED)).toBe(false);
    expect(await settle(TIMED_OUT)).toBe(false);
  });

  it('a sent row breaks the run too', async () => {
    await settle(TIMED_OUT);
    await settle(TIMED_OUT);
    await t.outages.lift({ ...NOTIFICATIONS, now: at(0) });
    expect(await settle(TIMED_OUT)).toBe(false);
  });

  it('timeouts on another lane are counted apart', async () => {
    await settle(TIMED_OUT);
    await settle(TIMED_OUT);
    const chat = { line: 'chat' as const, now: at(0) };
    expect(await t.outages.settle(TIMED_OUT, chat)).toBe(false);
  });
});

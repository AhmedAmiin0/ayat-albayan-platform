import { describe, expect, it, vi } from 'vitest';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import {
  deferHeld, heldPlan, liftHolds, lineHoldCheck,
} from '@/modules/messaging/whatsapp/sender/hold/worker-holds';
import { at, NOTIFICATIONS } from '@/modules/messaging/whatsapp/sender/hold/tests/payment-holds.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

const AT = { ...NOTIFICATIONS, now: at(0) };
const row = dueMessage();
const probed = (code: string) => async (plan: FailurePlan) => ({ ...plan, error_code: code });

function holdsOf(payment: 'send' | 'deferred' | 'aged', outage: 'send' | 'deferred') {
  const holds = {
    check: vi.fn(async () => payment),
    probe: vi.fn(probed('payment')),
    deferRest: vi.fn(async () => undefined),
    lift: vi.fn(async () => undefined),
  };
  const outages = {
    check: vi.fn(async () => outage),
    probe: vi.fn(probed('outage')),
    deferRest: vi.fn(async () => undefined),
    lift: vi.fn(async () => undefined),
  };
  return { holds, outages };
}

describe('lineHoldCheck', () => {
  it('a 131042 deferral wins and the outage hold is not asked', async () => {
    const h = holdsOf('deferred', 'send');
    await expect(lineHoldCheck(h, row, AT)).resolves.toBe('deferred');
    expect(h.outages.check).not.toHaveBeenCalled();
  });

  it('an outage deferral beats an aged payment hold', async () => {
    await expect(lineHoldCheck(holdsOf('aged', 'deferred'), row, AT)).resolves.toBe('deferred');
  });

  it('otherwise the payment hold answers; no holds at all = undefined', async () => {
    await expect(lineHoldCheck(holdsOf('aged', 'send'), row, AT)).resolves.toBe('aged');
    await expect(lineHoldCheck(holdsOf('send', 'send'), row, AT)).resolves.toBe('send');
    await expect(lineHoldCheck({}, row, AT)).resolves.toBeUndefined();
  });
});

describe('heldPlan, liftHolds, deferHeld', () => {
  const input = { row, error: new WaError('x', { code: 131026, status: 400 }), attempts: 1, ...AT };

  it('the failure plan goes through the payment hold, then the outage hold', async () => {
    const h = holdsOf('send', 'send');
    await expect(heldPlan(h, input)).resolves.toMatchObject({ error_code: 'outage' });
    expect(h.outages.probe).toHaveBeenCalledWith(expect.objectContaining({ error_code: 'payment' }), input);
  });

  it('without holds the plan is failurePlan’s own', async () => {
    await expect(heldPlan({}, input)).resolves.toMatchObject({ status: 'failed', error_code: '131026' });
  });

  it('lifts and defers on both holds; absent holds are skipped', async () => {
    const h = holdsOf('send', 'send');
    await liftHolds(h, AT);
    await deferHeld(h, [row], AT);
    expect([h.holds.lift, h.outages.lift].map((f) => f.mock.calls)).toEqual([[[AT]], [[AT]]]);
    expect(h.outages.deferRest).toHaveBeenCalledWith([row], AT);
    await expect(liftHolds({}, AT)).resolves.toBeUndefined();
    await expect(deferHeld({}, [row], AT)).resolves.toBeUndefined();
  });
});

import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { failurePlan, type FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { FailedInput } from '@/modules/messaging/whatsapp/sender/message.job';
import type { HoldAt, HoldCheck } from './lane-hold.types';
import type { LineOutages } from './line-outages';
import type { PaymentHolds } from './payment-holds';

/** The worker's two line holds; either absent (unit tests) = that hold does not apply. */
interface LineHolds {
  holds?: Pick<PaymentHolds, 'check' | 'probe' | 'deferRest' | 'lift'>;
  outages?: Pick<LineOutages, 'check' | 'probe' | 'deferRest' | 'lift'>;
}

/**
 * The row's line holds in order: a 131042 deferral wins (the outage hold is then not asked), then
 * an outage deferral; else the payment hold's own answer (undefined when there is none).
 */
export async function lineHoldCheck(
  h: LineHolds,
  row: DueMessage,
  at: HoldAt,
): Promise<HoldCheck | undefined> {
  const payment = await h.holds?.check(row, at);
  if (payment === 'deferred') return 'deferred';
  const outage = await h.outages?.check(row, at);
  return outage === 'deferred' ? 'deferred' : payment;
}

/** The failure plan; a 131042 or a line-down also holds its line, with this row as the probe. */
export async function heldPlan(h: LineHolds, input: FailedInput): Promise<FailurePlan> {
  const plan = failurePlan(input);
  const paid = h.holds ? await h.holds.probe(plan, input) : plan;
  return h.outages ? h.outages.probe(paid, input) : paid;
}

/** A row of the lane went out: both holds of its line are lifted. */
export async function liftHolds(h: LineHolds, at: HoldAt): Promise<void> {
  await h.holds?.lift(at);
  await h.outages?.lift(at);
}

/** The pass's later rows of a paused line: deferred in one write while it is held. */
export async function deferHeld(
  h: LineHolds,
  rest: readonly DueMessage[],
  at: HoldAt,
): Promise<void> {
  await h.holds?.deferRest(rest, at);
  await h.outages?.deferRest(rest, at);
}

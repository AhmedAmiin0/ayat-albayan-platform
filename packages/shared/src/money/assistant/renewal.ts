import { planOn, type CommissionContext, type PlannedCommission, type SubscriptionFact } from './first-paid.js';
import { commissionKindOf, RENEWAL_CUTOFF } from './kind.js';

// Renewal commission (owner 2026-10-26, migration 20261027000751 assistant_commission_plan): «half of the
// value» = HALF OF HER NORMAL COMMISSION on each renewal (settings.renewal_commission_percent, default 50),
// not half of the renewal's price. Pure twin; the database decides.

/**
 * The share of the normal commission a NEW renewal earns now, for the screens: the percent while
 * «عمولة التجديد» is on, 0 while it is off (owner 2026-11-01). Not a twin of renewal_commission_share
 * (always the percent): the SQL switch is the gate on a new row in evaluate_assistant_commission
 * (migration 20261101000996), so an existing renewal row still settles at the percent.
 */
export const renewalShareNow = (s: {
  renewal_commission_enabled: boolean;
  renewal_commission_percent: number;
}): number =>
  s.renewal_commission_enabled ? s.renewal_commission_percent : 0;

export interface PlannedRenewal extends PlannedCommission {
  /** The share copied onto the row when earned: a later setting change never touches it. */
  share: number;
}

/**
 * What a renewal subscription earns: only a 'renewal' by order (commissionKindOf), fully paid on or after the
 * cutoff (RENEWAL_CUTOFF: no backfill) and after the same two days as the first (planOn); amount = the
 * normal commission x share %. A late payment on another subscription never changes it: each row is its own.
 * `excluded`: the subscription is in assistant_commission_exclusions (seen fully paid before the cutoff, its
 * 'first' row dropped by a merge, or fully paid since «عمولة التجديد» was turned off and seen while off):
 * an edit that moves its fully paid instant later never mints one.
 */
export function planRenewalCommission(
  input: CommissionContext & { share: number; subscriptionId: string; subscriptions: readonly SubscriptionFact[]; excluded?: boolean },
): PlannedRenewal | null {
  const sub = input.subscriptions.find((s) => s.id === input.subscriptionId);
  if (!sub || input.excluded || commissionKindOf(input.subscriptions, sub.id) !== 'renewal') return null;
  const planned = planOn(input, sub, input.share);
  if (!planned || Date.parse(planned.fullAt) < Date.parse(RENEWAL_CUTOFF)) return null;
  return { ...planned, share: input.share };
}

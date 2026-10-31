import { planOn, type CommissionContext, type PlannedCommission, type SubscriptionFact } from './first-paid.js';
import { commissionKindOf, RENEWAL_CUTOFF } from './kind.js';

// Renewal commission (owner 2026-10-26, migration 20261027000751 assistant_commission_plan): «half of the
// value» = HALF OF HER NORMAL COMMISSION on each renewal (settings.renewal_commission_percent, default 50),
// not half of the renewal's price. Pure twin; the database decides.

/** The renewal switch and share as the settings hold them. */
export interface RenewalSettings {
  renewal_commission_enabled: boolean;
  renewal_commission_percent: number;
}

/**
 * The share of the normal commission a renewal earns NOW (twin of renewal_commission_share,
 * migration 20261101000996): the percent while «عمولة التجديد» is on, 0 while it is off
 * (owner 2026-11-01), so planRenewalCommission plans nothing (amount 0).
 */
export const renewalShareNow = (s: RenewalSettings): number =>
  s.renewal_commission_enabled ? s.renewal_commission_percent : 0;

export interface PlannedRenewal extends PlannedCommission {
  /** The share copied onto the row when earned: a later setting change never touches it. */
  share: number;
}

/**
 * What a renewal subscription earns: only a 'renewal' by order (commissionKindOf), fully paid on or after the
 * cutoff (RENEWAL_CUTOFF: no backfill) and after the same two days as the first (planOn); amount = the
 * normal commission x share %. A late payment on another subscription never changes it: each row is its own.
 * `excluded`: the subscription is in assistant_commission_exclusions (seen fully paid before the cutoff, or
 * its 'first' row dropped by a merge): an edit that moves its fully paid instant later never mints one.
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

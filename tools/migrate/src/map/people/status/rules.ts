// Imported status (docs/06): active only with evidence of a current subscription; pure.
import type { StudentStatus } from '@ab/catalog';
import { SETTINGS_REGISTRY } from '@ab/settings';

/** The app's subscription_expiry_days default: days pending_renewal lasts before expired. */
export const DEFAULT_EXPIRY_DAYS: number = SETTINGS_REGISTRY.subscription_expiry_days.default;

/** One paid period (HEART «subscription» Date): a package covers one month from its start. */
const PERIOD_MONTHS = 1;

/** Where a payment period stands on the import date. */
export type PaymentState = 'current' | 'grace' | 'ended';

interface StatusEvidence {
  /** The best payment period of the student, or null when nothing was paid. */
  payment: PaymentState | null;
  /** A subscribed weekly booking still running on the import date. */
  series: boolean;
  /** An attended lesson report (on_time or late) or a booking marked done. */
  attended: boolean;
}

const DAY_MS = 86_400_000;
const dayMs = (ymd: string): number => Date.parse(`${ymd}T00:00:00Z`);

/** First day the period no longer covers: start + PERIOD_MONTHS (clamped to the month's end). */
export function periodEnd(startsOn: string): string {
  const [y, m, d] = startsOn.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return startsOn;
  const last = new Date(Date.UTC(y, m - 1 + PERIOD_MONTHS + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + PERIOD_MONTHS, Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * current: the period covers `today` (or starts later); grace: it ended less than `expiryDays`
 * ago (the app's pending_renewal window); ended: earlier still (the app's expired).
 */
export function paymentState(o: {
  startsOn: string;
  today: string;
  expiryDays: number;
}): PaymentState {
  const end = periodEnd(o.startsOn);
  if (o.today < end) return 'current';
  return (dayMs(o.today) - dayMs(end)) / DAY_MS < o.expiryDays ? 'grace' : 'ended';
}

const RANK: Record<PaymentState, number> = { current: 3, grace: 2, ended: 1 };

/** The better of two payment states (a student's newest period decides). */
export const bestPayment = (a: PaymentState | undefined, b: PaymentState): PaymentState =>
  a && RANK[a] >= RANK[b] ? a : b;

/** Never trial: bookings do not make trial students on import. */
export function importedStatus(e: StatusEvidence): StudentStatus {
  if (e.payment === 'current' || e.series) return 'active';
  if (e.payment === 'grace') return 'pending_renewal';
  if (e.payment === 'ended') return 'expired';
  return e.attended ? 'pending_subscription' : 'new';
}

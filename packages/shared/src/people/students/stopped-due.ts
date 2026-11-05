import { stopRefund } from './stop-refund.js';

// What a STOPPED course («إلغاء الاشتراك» / «إلغاء مع استرداد») is still owed for
// (owner 2026-11-05): its attended lessons at the refund rate, the charge stopRefund keeps.
// Never its price (the unused lessons are not owed) and never the refund (a refunded gap is not
// a debt). Pure.

export interface StoppedPackage {
  price: number;
  currency: string;
  lessonsTotal: number;
  /** subscriptions.lessons_used_at_stop (the lessons it used, the imported ones included). */
  attended: number;
}

/** attended × (price / lessonsTotal) × rate %, in the package currency's minor unit. */
export const stoppedCharge = (pkg: StoppedPackage, ratePercent: number): number =>
  stopRefund({ ...pkg, paid: 0, ratePercent }).charged;

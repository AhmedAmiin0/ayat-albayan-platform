import { riyadhToday } from '@ab/shared';

/** Today in Riyadh (YYYY-MM-DD): the payment date field's default and its latest day. */
export function paidAtDay(now = new Date()): string {
  // academy day (docs/34 b): payment days are Riyadh days (paidAtFor)
  return riyadhToday(now);
}

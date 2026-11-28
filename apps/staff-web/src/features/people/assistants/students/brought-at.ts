import { paidAtFor } from '@/features/finance/payments';

/** Empty is omitted so the database keeps the current date or uses now. */
export function broughtAtOf(day: string, now = new Date()): { broughtAt?: string } {
  return day === '' ? {} : { broughtAt: paidAtFor(day, now) };
}

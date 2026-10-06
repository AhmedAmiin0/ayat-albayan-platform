import { paidAtFor } from '@/features/payments/api';

/**
 * The optional «تاريخ الإحضار» day as the command's `broughtAt` instant (UTC ISO); empty = omitted,
 * so the database keeps the current date or uses now. Spread it: `{ ...broughtAtOf(day) }`.
 */
export function broughtAtOf(day: string, now = new Date()): { broughtAt?: string } {
  return day === '' ? {} : { broughtAt: paidAtFor(day, now) };
}

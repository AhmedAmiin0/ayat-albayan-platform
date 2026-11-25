import { toCents } from '@ab/core';
import { partPaid } from './payment-state';

// A stopped course owes subscriptions.stop_owed_amount, not its price (migration 20261106000100).

export interface OwedPackage {
  price: number;
  /** 'stopped' for a stopped subscription; 'unused' or absent otherwise. */
  cancel_kind?: string | null;
  /** The stop's stored decision; null (absent) for every package that is not stopped. */
  stop_owed_amount?: number | string | null;
}

const isStopped = (p: OwedPackage): boolean => p.cancel_kind === 'stopped';

/** The amount the package is owed for: the stop's decision when stopped (price if none stored). */
export function owedFor(p: OwedPackage): number {
  const stored = isStopped(p) ? (p.stop_owed_amount ?? null) : null;
  return Number(stored ?? p.price);
}

/** What is still due: owedFor − net paid, never below 0 (cents-exact). */
export function dueOf(p: OwedPackage, paid: number): number {
  return Math.max(0, toCents(owedFor(p)) - toCents(paid)) / 100;
}

/** Partly paid against what the package is owed for (partPaid on owedFor). */
export function partPaidOf(p: OwedPackage & { paid: number }): ReturnType<typeof partPaid> {
  return partPaid({ paid: p.paid, price: owedFor(p) });
}

/** Whether a payment still has something to settle. */
export const owesMore = (p: OwedPackage & { paid: number }): boolean => dueOf(p, p.paid) > 0;

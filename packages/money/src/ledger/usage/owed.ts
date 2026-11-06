import { toCents } from '@ab/core';
import { partPaid } from './payment-state.js';

// What a package is owed for (owner 2026-11-06, «for the refund make me choose what I need»):
// its price, except a STOPPED course («إلغاء الاشتراك»), which owes what the person stopping it
// chose and the stop stored (subscriptions.stop_owed_amount, migration 20261106000100). Old stops
// were backfilled with their price, so nothing changed on deploy; a stop with a refund stored the
// net paid after the refund (nothing more is owed). Every money reader (receivables, the lists,
// the payment forms, the assistant's history, the chat's card) uses this one rule. Pure.

export interface OwedPackage {
  price: number;
  /** 'stopped' for «إلغاء الاشتراك»; 'unused' or absent otherwise. */
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

/** «مدفوعة جزئيًا … الباقي» against what the package is owed for (partPaid on owedFor). */
export function partPaidOf(p: OwedPackage & { paid: number }): ReturnType<typeof partPaid> {
  return partPaid({ paid: p.paid, price: owedFor(p) });
}

/** Whether a payment still has something to settle (the lists' «سجّل دفعة»). */
export const owesMore = (p: OwedPackage & { paid: number }): boolean => dueOf(p, p.paid) > 0;

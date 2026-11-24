import { counted } from '@ab/core';
import {
  formatAmount,
  owedFor,
  partPaidOf,
  receiptShortfall,
  type OwedPackage,
  type SubscriptionView,
} from '@ab/money';
import { dateText } from '@ab/time';
import { t, currencyName, locale, ltr, money } from '@ab/mobile-kit';

// Money lines (docs/07 §2: Western digits, LTR values isolated). Strings come from ar.json only.

/** A custom count when package is null. */
export function packageName(sub: Pick<SubscriptionView, 'package' | 'lessons_total'>): string {
  return sub.package ? t.enums.packageSize[sub.package] : counted(t.today.count, sub.lessons_total);
}

const DAY = { day: 'numeric', month: 'long', year: 'numeric' } as const;

/** The day of an instant in the viewer's tz (docs/34). */
export function instantDay(iso: string, tz: string): string {
  return dateText(new Date(iso), { tz, locale }, DAY);
}

/** For a local YYYY-MM-DD date, whatever the phone's zone. */
export function localDay(date: string): string {
  return dateText(new Date(`${date}T12:00:00Z`), { tz: 'UTC', locale }, DAY);
}

/** Tells two packages of one student apart. */
export function packageFrom(sub: SubscriptionView): string {
  return t.payments.mobile.packageFrom
    .replace('{package}', packageName(sub))
    .replace('{date}', localDay(sub.starts_on));
}

/** A package with what it is owed for (owedFor) and what was paid. */
type PaidPackage = OwedPackage & { paid: number; currency: string };

/** Of what it is owed; a stopped course uses its stored decision. */
export function paidOf(sub: PaidPackage): string {
  return t.payments.paidOf
    .replace('{paid}', ltr(formatAmount(sub.paid)))
    .replace('{price}', money(owedFor(sub), sub.currency));
}

/** This package's own count (FIFO, docs/11 §2). */
export function usedOf(sub: SubscriptionView): string {
  return t.subscriptions.usedOf
    .replace('{used}', String(sub.balance.lessons_used))
    .replace('{total}', String(sub.lessons_total));
}

const amount = (n: number) => ltr(formatAmount(n));

/** Only while 0 < paid < price, else null; only net paid at or above price counts as paid. */
export function partPaidLine(sub: PaidPackage): string | null {
  const part = partPaidOf(sub);
  if (!part) return null;
  return t.packagePayment.partPaid
    .replace('{paid}', amount(part.paid))
    .replace('{price}', amount(part.price))
    .replace('{currency}', currencyName(sub.currency))
    .replace('{due}', amount(part.due));
}

export const paidLine = (sub: PaidPackage): string => partPaidLine(sub) ?? paidOf(sub);

/** Warns before saving a receipt smaller than what is still due, else null. */
export function shortfallLine(input: { amount: number | null; due: number; currency: string }): string | null {
  const short = input.amount === null ? 0 : receiptShortfall({ amount: input.amount, due: input.due });
  if (short <= 0) return null;
  return t.packagePayment.shortfall.replace('{amount}', amount(short)).replace('{currency}', currencyName(input.currency));
}

import type { SalesFamilyView } from '@ab/shared';
import type { Href } from 'expo-router';

// The one money action outside the chat (UX review 2026-10-29 #9): «تسجيل تحويل» while one of the
// student's packages is owed, else «تجديد» when the API says a renewal is due, else nothing. It only
// opens the chat's existing screens with the student and package picked; no money logic here. Pure.

interface MoneyTarget {
  studentId: string;
  /** The guardian's E.164 phone: the family the transfer / subscribe screens read. */
  phone: string;
  /** A pending row's own package: picked first when it is the owed one. */
  subscriptionId?: string;
}

export interface MoneyAction {
  kind: 'transfer' | 'renew';
  href: Href;
}

export function pickMoneyAction(family: SalesFamilyView | undefined, target: MoneyTarget): MoneyAction | null {
  const { studentId, phone, subscriptionId } = target;
  const student = family?.students?.find((s) => s.id === studentId);
  if (!student || phone === '') return null;
  const owed = student.open.find((o) => o.id === subscriptionId) ?? student.open[0];
  if (owed) return { kind: 'transfer', href: { pathname: '/inbox/sales-transfer', params: { phone, subscriptionId: owed.id } } };
  if (!student.renew_due) return null;
  return { kind: 'renew', href: { pathname: '/inbox/sales-subscribe', params: { phone, studentId, renew: '1' } } };
}

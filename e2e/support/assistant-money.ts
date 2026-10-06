import type { APIRequestContext } from '@playwright/test';
import type { AssistantCommissionView } from '@ab/shared';
import { call } from './assistant-api';

// Admin-side money steps of the assistant API specs: a package for a student, a payment, the ledger.

export interface Sub {
  id: string;
  price: number;
  currency: string;
}

/** POST /subscriptions: the starter package, priced for `country` (SA -> SAR, US -> USD). */
export async function subscribe(request: APIRequestContext, admin: string, studentId: string, country: 'SA' | 'US'): Promise<Sub> {
  const body = { studentId, pricing: { tier: 'starter', country }, startsOn: new Date().toISOString().slice(0, 10) };
  const res = await call<Sub>(request, { token: admin, method: 'POST', path: '/subscriptions', body });
  if (res.status !== 201) throw new Error(`subscription ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export const cents = (n: number): number => Math.round(n * 100) / 100;

/** POST /payments as the admin, in the package's currency; returns the payment id. */
export async function payIn(request: APIRequestContext, admin: string, sub: Sub, amount: number): Promise<string> {
  const body = { subscriptionId: sub.id, amount: cents(amount), currency: sub.currency, method: 'bank', paidAt: new Date().toISOString() };
  const res = await call<{ id: string }>(request, { token: admin, method: 'POST', path: '/payments', body });
  if (res.status !== 201) throw new Error(`payment ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.id;
}

/** GET /assistant-pay/commissions of one assistant (the admin's ledger). */
export async function ledger(request: APIRequestContext, admin: string, assistantId: string): Promise<AssistantCommissionView[]> {
  const res = await call<AssistantCommissionView[]>(request, { token: admin, method: 'GET', path: `/assistant-pay/commissions?assistantId=${assistantId}` });
  return res.body;
}

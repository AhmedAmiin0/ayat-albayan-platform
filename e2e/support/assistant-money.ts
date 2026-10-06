import type { APIRequestContext } from '@playwright/test';
import type { AssistantCommissionView } from '@ab/shared';
import { call } from './assistant-api';

// Admin-side money steps of the assistant API specs: a package for a student, a payment, the ledger.

export interface Sub {
  id: string;
  price: number;
  currency: string;
}

export const cents = (n: number): number => Math.round(n * 100) / 100;

/** The admin's money calls over one request context: money(request, adminToken).subscribe(...). */
export function money(request: APIRequestContext, admin: string) {
  const as = <T>(method: 'GET' | 'POST', path: string, body?: object) => call<T>(request, { token: admin, method, path, ...(body ? { body } : {}) });
  return {
    /** POST /subscriptions: the starter package, priced for `country` (SA -> SAR, US -> USD). */
    async subscribe(studentId: string, country: 'SA' | 'US'): Promise<Sub> {
      const body = { studentId, pricing: { tier: 'starter', country }, startsOn: new Date().toISOString().slice(0, 10) };
      const res = await as<Sub>('POST', '/subscriptions', body);
      if (res.status !== 201) throw new Error(`subscription ${res.status} ${JSON.stringify(res.body)}`);
      return res.body;
    },
    /** POST /payments in the package's currency; returns the payment id. */
    async payIn(sub: Sub, amount: number): Promise<string> {
      const body = { subscriptionId: sub.id, amount: cents(amount), currency: sub.currency, method: 'bank', paidAt: new Date().toISOString() };
      const res = await as<{ id: string }>('POST', '/payments', body);
      if (res.status !== 201) throw new Error(`payment ${res.status} ${JSON.stringify(res.body)}`);
      return res.body.id;
    },
    /** GET /assistant-pay/commissions of one assistant (the admin's ledger). */
    async ledger(assistantId: string): Promise<AssistantCommissionView[]> {
      return (await as<AssistantCommissionView[]>('GET', `/assistant-pay/commissions?assistantId=${assistantId}`)).body;
    },
  };
}

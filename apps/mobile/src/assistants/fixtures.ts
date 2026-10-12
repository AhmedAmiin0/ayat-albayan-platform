import type { AssistantCommissionView, AssistantStatementView } from '@ab/shared';
import type { AssistantRow } from './api';

// Test data shaped like apps/api assistant-pay (the web's fixtures): two currencies, never summed.

export const ASSISTANT: AssistantRow = {
  id: 'a1',
  name: 'الزهراء',
  terms: {
    assistant_id: 'a1',
    commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' },
    salary: { amount: 3000, currency: 'EGP', starts_on: '2026-10-01' },
  },
};

/** What GET /assistant-pay/terms answers for a salesperson of the list. */
export const termsRowOf = ({ name, terms }: AssistantRow) => ({ ...terms, name });

export const commission = (over: Partial<AssistantCommissionView> = {}): AssistantCommissionView => ({
  id: 'c1',
  assistant: { id: 'a1', name: 'الزهراء' },
  student: { id: 's1', code: 'AB-1001', name: 'سهيلة' },
  subscription_id: 'sub1',
  type: 'percent',
  rate: 10,
  base_amount: 500,
  base_currency: 'SAR',
  amount: 50,
  currency: 'SAR',
  earned_at: '2026-10-03T10:00:00Z',
  status: 'earned',
  void_reason: null,
  voided_at: null,
  statement_id: null,
  ...over,
});

export const statement = (over: Partial<AssistantStatementView> = {}): AssistantStatementView => ({
  id: 'st1',
  assistant: { id: 'a1', name: 'الزهراء' },
  month: '2026-10-01',
  status: 'draft',
  totals: {
    EGP: { salary: 3000, commissions: 0, adjustments: 0, total: 3000 },
    SAR: { salary: 0, commissions: 50, adjustments: -10, total: 40 },
  },
  lines: [
    { kind: 'salary', amount: 3000, currency: 'EGP', student: null, reason: null },
    { kind: 'commission', amount: 50, currency: 'SAR', student: { code: 'AB-1001', name: 'سهيلة' }, reason: null },
    { kind: 'adjustment', amount: -10, currency: 'SAR', student: null, reason: 'خصم تجريبي' },
  ],
  approved_at: null,
  paid_at: null,
  method: null,
  note: null,
  has_receipt: false,
  ...over,
});

export const ALL = ['assistantpay.read', 'assistantpay.write', 'assistantpay.approve'];

/** A mocked apiFetch: /auth/me answers `permissions`, each other path its own body (a function may throw). */
export function routes(permissions: readonly string[], bodies: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path === '/auth/me') return Promise.resolve({ permissions });
    const key = Object.keys(bodies).find((k) => path.startsWith(k));
    if (key === undefined) return Promise.reject(new Error(`unexpected ${path}`));
    const body = bodies[key];
    return typeof body === 'function' ? Promise.resolve().then(() => (body as (p: string) => unknown)(path)) : Promise.resolve(body);
  };
}

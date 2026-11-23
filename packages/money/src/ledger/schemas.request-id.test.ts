import { describe, expect, it } from 'vitest';
import { teacherPaymentCreateSchema } from './earnings/earnings-schemas.js';
import { paymentCreateSchema, subscriptionCreateSchema } from './schemas.js';

const ID = '00000000-0000-4000-8000-000000000001';
const paidAt = '2026-10-01T09:00:00Z';
const pricing = { tier: 'starter', country: 'SA' };

const writes = [
  ['POST /subscriptions', subscriptionCreateSchema, { studentId: ID, startsOn: '2026-10-01', pricing }],
  [
    'POST /payments',
    paymentCreateSchema,
    { subscriptionId: ID, amount: 120, currency: 'SAR', method: 'bank', paidAt },
  ],
  ['POST /teacher-earnings/:id/payments', teacherPaymentCreateSchema, { amount: 100, method: 'bank', paidAt }],
] as const;

// Rule 8: a write the server timed out on may still commit; only the same id makes a resend safe.
describe.each(writes)('%s needs its clientRequestId', (_route, schema, body) => {
  it('accepts the body with a uuid id', () => {
    expect(schema.safeParse({ ...body, clientRequestId: ID }).success).toBe(true);
  });

  it.each([['missing', undefined], ['not a uuid', 'x']])('refuses an id that is %s', (_c, id) => {
    expect(schema.safeParse({ ...body, clientRequestId: id }).success).toBe(false);
  });
});

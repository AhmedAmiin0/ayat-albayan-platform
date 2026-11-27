import { describe, expect, it } from 'vitest';
import { salesCancelSchema, salesRescheduleSchema } from '../lesson-actions.schemas';

const AT = '2026-11-01T15:00:00Z';

describe('sales lesson bodies', () => {
  it('reschedule takes a time only: no series, substitute or override', () => {
    expect(salesRescheduleSchema.safeParse({ startsAt: AT }).success).toBe(true);
    expect(salesRescheduleSchema.safeParse({ startsAt: AT, scope: 'rule' }).success).toBe(false);
    const override = { startsAt: AT, override: { reason: 'x' } };
    expect(salesRescheduleSchema.safeParse(override).success).toBe(false);
  });

  it('move takes an optional trimmed reason (docs/47)', () => {
    const parsed = salesRescheduleSchema.parse({ startsAt: AT, reason: ' سفر ' });
    expect(parsed).toEqual({ startsAt: AT, reason: 'سفر' });
    expect(salesRescheduleSchema.safeParse({ startsAt: AT, reason: '' }).success).toBe(false);
  });

  it('cancel needs no reason, takes an optional «by» and refuses a series or an unknown «by»', () => {
    expect(salesCancelSchema.parse({})).toEqual({});
    const travel = salesCancelSchema.parse({ reason: '  family travel ' });
    expect(travel).toEqual({ reason: 'family travel' });
    expect(salesCancelSchema.safeParse({ scope: 'rule' }).success).toBe(false);
    expect(salesCancelSchema.parse({ by: 'student' })).toEqual({ by: 'student' });
    expect(salesCancelSchema.safeParse({ by: 'family' }).success).toBe(false);
  });
});

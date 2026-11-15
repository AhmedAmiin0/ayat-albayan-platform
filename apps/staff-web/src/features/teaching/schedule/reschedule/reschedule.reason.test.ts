import { rescheduleRequestSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { reasonPart, rescheduleBody } from './reschedule';

const AT = '2026-10-05T15:00:00.000Z';
const L = lesson();

describe('the move reason (docs/47, owner call 4: optional)', () => {
  it('scope one carries the trimmed reason, and the API schema accepts it', () => {
    const body = rescheduleBody({ lesson: L, scope: 'one', startsAt: AT, byday: [], reason: ' سفر ' });
    expect(body).toEqual({ scope: 'one', startsAt: AT, reason: 'سفر' });
    expect(rescheduleRequestSchema.safeParse(body).success).toBe(true);
  });

  it('an empty or blank reason sends no key', () => {
    const body = rescheduleBody({ lesson: L, scope: 'one', startsAt: AT, byday: [], reason: '  ' });
    expect(body).toEqual({ scope: 'one', startsAt: AT });
    expect(reasonPart(undefined)).toEqual({});
    expect(reasonPart('')).toEqual({});
  });

  it('a series move carries no reason', () => {
    const body = rescheduleBody({ lesson: L, scope: 'rule', startsAt: AT, byday: [], reason: 'سفر' });
    expect(body).not.toHaveProperty('reason');
  });
});

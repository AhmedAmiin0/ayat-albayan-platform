import { describe, expect, it } from 'vitest';
import { rescheduleRequestSchema } from './scheduling.js';

const one = { scope: 'one', startsAt: '2026-11-20T10:00:00Z' } as const;

describe('rescheduleRequestSchema one-lesson reason (docs/47)', () => {
  it('is optional', () => {
    expect(rescheduleRequestSchema.parse(one)).not.toHaveProperty('reason');
  });
  it('is trimmed', () => {
    const parsed = rescheduleRequestSchema.parse({ ...one, reason: '  سفر  ' });
    expect(parsed).toMatchObject({ reason: 'سفر' });
  });
  it('refuses blank and over 500 characters', () => {
    expect(rescheduleRequestSchema.safeParse({ ...one, reason: '   ' }).success).toBe(false);
    const long = { ...one, reason: 'x'.repeat(501) };
    expect(rescheduleRequestSchema.safeParse(long).success).toBe(false);
  });
});

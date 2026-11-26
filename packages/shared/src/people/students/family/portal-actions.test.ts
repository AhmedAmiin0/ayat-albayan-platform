import { describe, expect, it } from 'vitest';
import { isFamilyActionable, portalRequestStatusSchema } from './portal-actions';

const NOW = new Date('2026-10-02T10:00:00Z');
const LATER = '2026-10-05T15:00:00.000Z';

describe('isFamilyActionable: the family acts on an open lesson not started yet', () => {
  it('open and ahead → true; started or closed → false', () => {
    expect(isFamilyActionable({ status: 'confirmed', starts_at: LATER }, NOW)).toBe(true);
    expect(isFamilyActionable({ status: 'scheduled', starts_at: NOW.toISOString() }, NOW)).toBe(false);
    expect(isFamilyActionable({ status: 'completed', starts_at: LATER }, NOW)).toBe(false);
  });
});

describe('portalRequestStatusSchema', () => {
  it('names the request states a family card shows', () => {
    expect(portalRequestStatusSchema.options).toEqual(['pending', 'rejected']);
    expect(portalRequestStatusSchema.validate('approved')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { codesOpen } from './codes-open';

describe('codesOpen (docs/50 §6)', () => {
  it('reads the family flag for families and the staff flag for staff', () => {
    const status = { available: true, staff: false };
    expect(codesOpen(status, 'family')).toBe(true);
    expect(codesOpen(status, 'staff')).toBe(false);
    expect(codesOpen({ available: false, staff: true }, 'staff')).toBe(true);
  });

  it('treats a missing status (a failed call) as closed on both sides', () => {
    expect(codesOpen(undefined, 'family')).toBe(false);
    expect(codesOpen(undefined, 'staff')).toBe(false);
  });
});

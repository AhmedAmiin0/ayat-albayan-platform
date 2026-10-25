import { describe, expect, it } from 'vitest';
import { staffReachable } from './staff-reachable';

describe('staffReachable (staff WhatsApp alerts, owner 2026-10-25)', () => {
  it('an active teacher, with or without a login, is reachable', () => {
    expect(staffReachable({ status: 'active', profile: { disabled_at: null } })).toBe(true);
    expect(staffReachable({ status: 'active', profile: null })).toBe(true);
    expect(staffReachable({})).toBe(true);
  });

  it('an inactive teacher or a disabled login is not', () => {
    expect(staffReachable({ status: 'inactive', profile: null })).toBe(false);
    expect(staffReachable({ status: 'active', profile: { disabled_at: '2026-10-25T00:00:00Z' } })).toBe(false);
  });
});

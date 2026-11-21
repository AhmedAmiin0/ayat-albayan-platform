import { describe, expect, it } from 'vitest';
import { staffPasses } from './use-staff-pass';

const me = (role: string) => ({ id: 'u1', email: null, role, permissions: [] }) as never;

describe('staffPasses (the admin switch, owner 2026-11-21)', () => {
  it.each([
    { name: 'an admin', read: { data: me('admin'), fetchStatus: 'idle' }, passes: true },
    { name: 'a teacher', read: { data: me('teacher'), fetchStatus: 'idle' }, passes: false },
    { name: 'sales', read: { data: me('sales'), fetchStatus: 'fetching' }, passes: false },
    { name: '/auth/me on its way', read: { data: undefined, fetchStatus: 'fetching' }, passes: true },
    { name: 'never asked (a public page)', read: { data: undefined, fetchStatus: 'idle' }, passes: false },
    { name: 'signed out', read: { data: null, fetchStatus: 'idle' }, passes: false },
  ] as const)('$name → $passes', ({ read, passes }) => {
    expect(staffPasses(read)).toBe(passes);
  });
});

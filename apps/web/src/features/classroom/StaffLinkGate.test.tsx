import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/features/auth/me';
import { isStaffRole } from './staff-link';
import { StaffLinkGate } from './StaffLinkGate';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const me = (role: Me['role']): Me => ({
  id: 'u1', email: null, role, fullName: null, locale: null, tz: null, roleKey: role, permissions: [],
});

function gate(opts: { who: () => Promise<Me | null>; resolve: () => Promise<string> }) {
  const go = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StaffLinkGate linkKey="tok" resolve={opts.resolve} who={opts.who} go={go}>
        <p>guest page</p>
      </StaffLinkGate>
    </QueryClientProvider>,
  );
  return go;
}

describe('StaffLinkGate', () => {
  afterEach(cleanup);

  it('sends a signed-in teacher or admin to their own staff room, never the guest form', async () => {
    const resolve = vi.fn().mockResolvedValue('/meeting/m1');
    const go = gate({ who: async () => me('teacher'), resolve });
    await waitFor(() => expect(go).toHaveBeenCalledWith('/meeting/m1'));
    expect(screen.queryByText('guest page')).toBeNull();
  });

  it('shows the guest page to a visitor who is not signed in (no lookup)', async () => {
    const resolve = vi.fn();
    gate({ who: async () => null, resolve });
    expect(await screen.findByText('guest page')).toBeTruthy();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('falls back to the guest page when the staff member has no role in that room', async () => {
    const go = gate({ who: async () => me('teacher'), resolve: () => Promise.reject(new Error('403')) });
    expect(await screen.findByText('guest page')).toBeTruthy();
    expect(go).not.toHaveBeenCalled();
  });

  it('a guardian is not staff', async () => {
    gate({ who: async () => me('guardian'), resolve: vi.fn() });
    expect(await screen.findByText('guest page')).toBeTruthy();
    expect([isStaffRole('admin'), isStaffRole('sales'), isStaffRole('guardian'), isStaffRole(null)]).toEqual([true, true, false, false]);
  });
});

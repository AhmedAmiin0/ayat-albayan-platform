import type { ProbeAnswer } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meQuery } from '#/auth/me/index.ts';
import type { MaintenanceOptions } from './maintenance.types';
import { holdRoomOpen } from './room-presence';
import { useMaintenance } from './use-maintenance';

const net = vi.hoisted(() => ({ answers: [] as (ProbeAnswer | null)[], online: true }));
vi.mock('#/lib/http/supabase.ts', () => ({ supabase: { auth: {} } }));
vi.mock('./web-probes', () => ({
  webProbes: {
    api: () => Promise.resolve(net.answers.length > 1 ? net.answers.shift() : net.answers[0]),
    deviceOnline: () => net.online,
    pause: () => Promise.resolve(),
  },
}));

const ON = { status: 200, body: { maintenance_mode: true } };
const OFF = { status: 200, body: { maintenance_mode: false } };
afterEach(() => {
  net.answers = [];
  net.online = true;
});

function setup(opts: { path: string; role?: string; options?: MaintenanceOptions }) {
  const client = new QueryClient();
  const role = opts.role;
  if (role) client.setQueryData(meQuery.queryKey, { id: 'u', email: null, role, permissions: [] } as never);
  const router = {
    subscribe: () => () => undefined,
    state: { location: { pathname: opts.path } },
    invalidate: vi.fn(() => Promise.resolve()),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const watch = { router: router as unknown as AnyRouter, ...opts.options };
  return { client, router, ...renderHook(() => useMaintenance(watch), { wrapper }) };
}

const STAFF: MaintenanceOptions = { staff: true, rooms: /^\/classroom\//, signIn: /^\/login$/ };

describe('useMaintenance: who is covered while the switch is on', () => {
  it.each([
    { name: 'a teacher', path: '/teacher', role: 'teacher', options: STAFF, view: 'maintenance' },
    { name: 'an admin', path: '/admin', role: 'admin', options: STAFF, view: 'open' },
    { name: 'signed out at /login', path: '/login', role: undefined, options: STAFF, view: 'open' },
    { name: 'a family on a staff public page', path: '/pay/x', role: undefined, options: STAFF, view: 'maintenance' },
    { name: 'a teacher in a lesson room', path: '/classroom/1', role: 'teacher', options: STAFF, view: 'open' },
    { name: 'the family app, admin or not', path: '/', role: 'admin', options: {}, view: 'maintenance' },
  ])('$name → $view', async ({ path, role, options, view }) => {
    net.answers = [ON];
    const { result } = setup({ path, ...(role && { role }), options });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.view).toBe(view);
  });

  it('a family room overlay keeps the cover away', async () => {
    net.answers = [ON];
    const release = holdRoomOpen();
    const { result } = setup({ path: '/', options: {} });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.view).toBe('open');
    act(release);
    expect(result.current.view).toBe('maintenance');
  });
});

describe('useMaintenance: an outage, not an offline device', () => {
  it('a silent API with the device online covers everyone, admins too', async () => {
    net.answers = [null];
    const { result } = setup({ path: '/admin', role: 'admin', options: STAFF });
    await waitFor(() => expect(result.current.view).toBe('down'));
  });

  it('an offline device draws nothing', async () => {
    net.answers = [null];
    net.online = false;
    const { result } = setup({ path: '/teacher', role: 'teacher', options: STAFF });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.view).toBe('open');
  });
});

describe('useMaintenance: the cover lifts', () => {
  it('«أعد المحاولة» asks again; the page reloads its route and its failed queries', async () => {
    net.answers = [ON];
    const { result, router, client } = setup({ path: '/teacher', role: 'teacher', options: STAFF });
    await waitFor(() => expect(result.current.view).toBe('maintenance'));
    const refetch = vi.spyOn(client, 'refetchQueries');
    net.answers = [OFF];
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.view).toBe('open'));
    expect(router.invalidate).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith(expect.objectContaining({ type: 'active' }));
  });
});

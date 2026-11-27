import type { ProbeAnswer } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { setAudience, type Audience } from '../auth/audience';
import { RootGateProvider } from '../auth/root-gate';
import type { GateStatus } from '../auth/use-auth-gate';
import type * as Hook from './use-maintenance';

// jest.shared.cjs keeps the app open in every other suite; this one runs the real hook.
const { useMaintenance, maintenanceQuery } = jest.requireActual<typeof Hook>('./use-maintenance');

const net: { answers: (ProbeAnswer | null)[]; online: boolean; path: string } = {
  answers: [],
  online: true,
  path: '/',
};
jest.mock('expo-router', () => ({ usePathname: () => net.path }));
jest.mock('./retry-startup', () => ({ retryStartup: jest.fn() }));
jest.mock('./phone-probes', () => ({
  phoneProbes: {
    api: () => Promise.resolve(net.answers.length > 1 ? net.answers.shift() : net.answers[0]),
    deviceOnline: () => net.online,
    pause: () => Promise.resolve(),
  },
}));
const { retryStartup } = jest.requireMock<{ retryStartup: jest.Mock }>('./retry-startup');

const ON = { status: 200, body: { maintenance_mode: true } };
const OFF = { status: 200, body: { maintenance_mode: false } };

afterEach(() => {
  net.answers = [];
  net.online = true;
  net.path = '/';
  setAudience('staff');
  retryStartup.mockClear();
});

async function setup(app: Audience, gate: GateStatus) {
  setAudience(app);
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <RootGateProvider value={gate}>{children}</RootGateProvider>
    </QueryClientProvider>
  );
  const hook = await renderHook(() => useMaintenance(), { wrapper });
  await waitFor(() => expect(hook.result.current.checking).toBe(false));
  return { client, ...hook };
}

test.each([
  { app: 'staff', gate: 'admin', view: 'open' },
  { app: 'staff', gate: 'out', view: 'open' },
  { app: 'staff', gate: 'teacher', view: 'maintenance' },
  { app: 'staff', gate: 'sales', view: 'maintenance' },
  { app: 'family', gate: 'guardian', view: 'maintenance' },
  { app: 'family', gate: 'out', view: 'maintenance' },
  { app: 'family', gate: 'booting', view: 'open' },
] as const)('switch on: $app app, gate $gate → $view', async ({ app, gate, view }) => {
  net.answers = [ON];
  const { result } = await setup(app, gate);
  expect(result.current.view).toBe(view);
});

test.each(['/room/lesson/1', '/room-chat/s1'])('a lesson room (%s) is never covered', async (path) => {
  net.answers = [ON];
  net.path = path;
  const { result } = await setup('family', 'guardian');
  expect(result.current.view).toBe('open');
});

test('a silent API with the phone online covers admins too; an offline phone draws nothing', async () => {
  net.answers = [null];
  const down = await setup('staff', 'admin');
  expect(down.result.current.view).toBe('down');
  net.online = false;
  const offline = await setup('staff', 'teacher');
  expect(offline.result.current.view).toBe('open');
});

test('never persisted, asked also while TanStack thinks it is offline', () => {
  expect(maintenanceQuery.meta).toEqual({ noPersist: true });
  expect(maintenanceQuery.networkMode).toBe('always');
});

test('when the cover lifts the startup checks run again', async () => {
  net.answers = [ON];
  const { result } = await setup('staff', 'teacher');
  expect(result.current.view).toBe('maintenance');
  net.answers = [OFF];
  await act(async () => result.current.retry());
  await waitFor(() => expect(result.current.view).toBe('open'));
  expect(retryStartup).toHaveBeenCalledTimes(1);
});

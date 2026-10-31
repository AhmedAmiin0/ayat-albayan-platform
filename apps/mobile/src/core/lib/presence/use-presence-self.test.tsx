import { PRESENCE_SELF_PATH } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { realtime } from '@/test/presence-realtime';
import { usePresenceSelf } from './use-presence-self';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/core/lib/http/supabase', () =>
  jest.requireActual('@/test/presence-realtime').realtime.module(),
);

let appState: ((s: AppStateStatus) => void)[] = [];

beforeEach(() => {
  mockApiFetch.mockReset();
  realtime.reset();
  appState = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appState.push(handler);
    return { remove: jest.fn() };
  });
});

const mount = (id: string) =>
  renderHook(({ who }: { who: string }) => usePresenceSelf(who), {
    initialProps: { who: id },
    wrapper: queryWrapper(createTestQueryClient()),
  });

test('signed in and enabled: tracks its own topic; background, sign-out and unmount leave', async () => {
  mockApiFetch.mockResolvedValue({ enabled: true });
  const hook = await mount('u1');
  await waitFor(() => expect(realtime.isOpen('u1')).toBe(true));
  expect(mockApiFetch).toHaveBeenCalledWith(PRESENCE_SELF_PATH);
  await act(async () => realtime.joinAll());
  expect(realtime.tracked('u1')).toHaveLength(1);
  await act(async () => appState.forEach((h) => h('background')));
  expect(realtime.isOpen('u1')).toBe(false);
  await act(async () => appState.forEach((h) => h('active')));
  await waitFor(() => expect(realtime.isOpen('u1')).toBe(true));
  await hook.rerender({ who: '' });
  expect(realtime.isOpen('u1')).toBe(false);
});

test('presence off: never tracks', async () => {
  mockApiFetch.mockResolvedValue({ enabled: false });
  await mount('u1');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(realtime.topics()).toEqual([]);
});

test('signed out: no request, no track', async () => {
  await mount('');
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(realtime.topics()).toEqual([]);
});

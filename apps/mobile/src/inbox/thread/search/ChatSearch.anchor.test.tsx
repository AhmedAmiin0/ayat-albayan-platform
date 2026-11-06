import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type * as React from 'react';
import { BackHandler, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { detail } from '@/inbox/shared/thread-fixtures';
import { renderWithQuery } from '@/test/query';
import { chat, found, stub } from './search.fixture';
import { MID, NEW, OLD } from './search.data';

// docs/37 with a real anchor: the route's `?msg=` lives in a tiny store (router.setParams writes
// it), so the list's useThreadLog / useAnchorJump run as in the app.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (path: string) => mockApiFetch(path),
}));
type ReactModule = typeof React;
const mockRoute = { params: {} as { msg?: string }, seen: new Set<() => void>() };
jest.mock('expo-router', () => {
  const { useSyncExternalStore } = jest.requireActual<ReactModule>('react');
  const subscribe = (fn: () => void) => {
    mockRoute.seen.add(fn);
    return () => mockRoute.seen.delete(fn);
  };
  return {
    ...jest.requireActual('expo-router'),
    useLocalSearchParams: () => useSyncExternalStore(subscribe, () => mockRoute.params),
    router: {
      back: jest.fn(),
      setParams: (p: { msg?: string }) => {
        mockRoute.params = { ...mockRoute.params, ...p };
        mockRoute.seen.forEach((fn) => fn());
      },
    },
  };
});

const words = t.inbox.chatSearch;
const counter = (n: number, m: number) =>
  words.counter.replace('{n}', String(n)).replace('{m}', String(m));
const answer = (path: string) => {
  const reply = path.includes('?around=') ? detail([OLD]) : found([NEW, OLD]);
  return Promise.resolve(path.includes('/search?') || path.includes('?around=') ? reply : {});
};

async function openOnOld() {
  await renderWithQuery(chat(stub([[MID, NEW]], jest.fn())));
  await act(async () => undefined);
  await fireEvent.press(screen.getByRole('button', { name: words.open }));
  await fireEvent.changeText(screen.getByLabelText(words.label), 'اسلام');
  await screen.findByText(counter(1, 2), {}, { timeout: 5000 });
  await fireEvent.press(screen.getByRole('button', { name: words.older }));
  await waitFor(() => expect(screen.queryByText(MID.body ?? '')).toBeNull());
}

beforeEach(() => {
  mockRoute.params = {};
  mockApiFetch.mockImplementation(answer);
  jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('↑ to a hit not loaded opens the window; ↓ back to a live hit jumps, no scroll home', async () => {
  const home = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  await openOnOld();
  expect(mockRoute.params.msg).toBe(OLD.id);
  const arounds = mockApiFetch.mock.calls.filter(([p]) => String(p).includes('?around='));
  expect(arounds).toHaveLength(1);
  home.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: words.newer }));
  await screen.findByText(MID.body ?? '');
  expect(mockRoute.params.msg).toBe(NEW.id);
  expect(FlatList.prototype.scrollToIndex).toHaveBeenLastCalledWith(
    expect.objectContaining({ index: 1, viewPosition: 0.5 }),
  );
  expect(home).not.toHaveBeenCalledWith({ offset: 0, animated: false });
});

test('closing while the chat shows the window around a hit: back to the live chat', async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  await openOnOld();
  await act(async () => {
    listen.mock.calls.at(-1)?.[1]?.(undefined as never);
  });
  expect(mockRoute.params.msg).toBeUndefined();
  expect(await screen.findByText(MID.body ?? '')).toBeTruthy();
});

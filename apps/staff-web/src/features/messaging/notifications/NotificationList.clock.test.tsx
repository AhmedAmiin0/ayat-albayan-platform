import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { notificationTime } from './format';
import { ITEM, page, READ_ITEM, renderWithClient } from './notifications-test-kit';
import { NotificationList } from './NotificationList';

const read = vi.hoisted(() => vi.fn());
const write = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (sent: { route: { method: string } }) =>
    sent.route.method === 'GET' ? read(sent) : write(sent),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@ab/web-kit/auth/me/me', async () => {
  const { pathKey } = await import('@ab/client-core');
  return { meQuery: { queryKey: pathKey('/auth/me'), queryFn: () => ({ role: 'admin' }) } };
});

const C24 = { cycle: '24', locale: 'ar' } as const;
const START = new Date('2026-10-12T09:05:00Z');

// useNow's minute timers (the list query polls on its own interval too).
const minuteTimers = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter((c) => c[1] === 60_000).length;

beforeEach(() =>
  vi.useFakeTimers({ now: START, toFake: ['Date', 'setInterval', 'clearInterval'] }),
);
afterEach(() => {
  vi.useRealTimers();
  read.mockReset();
});

it("the bell rows (compiled) age with the panel's one clock (one timer), no remount", async () => {
  const timers = vi.spyOn(globalThis, 'setInterval');
  read.mockResolvedValue(page([ITEM, { ...READ_ITEM, created_at: ITEM.created_at }]));
  renderWithClient(<NotificationList onPick={vi.fn()} />);
  const rows = () => [...document.querySelectorAll('li time')].map((el) => el.textContent);
  await screen.findByText(ITEM.title);
  expect(rows()).toEqual(Array(2).fill(notificationTime(ITEM.created_at, C24, START)));
  act(() => {
    vi.advanceTimersByTime(10 * 60_000);
  });
  const later = new Date(START.getTime() + 10 * 60_000);
  expect(rows()).toEqual(Array(2).fill(notificationTime(ITEM.created_at, C24, later)));
  expect(rows()[0]).not.toBe(notificationTime(ITEM.created_at, C24, START));
  expect(minuteTimers(timers)).toBe(1);
});

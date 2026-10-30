import type { ThreadView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecentInbox } from './RecentInbox';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const AT = new Date(2026, 9, 19, 23, 0).toISOString();
const thread = (n: number): ThreadView =>
  ({ phone_e164: `+96650000000${n}`, display_name: `ولي أمر ${n}`, unread_count: 0, last_message_at: AT, last_direction: 'inbound', last_body: 'سلام' }) as ThreadView;

// useNow's minute timers (the list query polls on its own interval too).
const minuteTimers = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter((c) => c[1] === 60_000).length;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 19, 23, 59), toFake: ['Date', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
});

it('«أحدث الرسائل» (compiled): one clock for the rows; «23:00» turns into the date after midnight', async () => {
  const timers = vi.spyOn(globalThis, 'setInterval');
  apiFetch.mockResolvedValue({ items: [1, 2, 3].map(thread), total: 3, page: 1, pageSize: 30 });
  render(<QueryClientProvider client={new QueryClient()}><RecentInbox /></QueryClientProvider>);
  await screen.findByText('ولي أمر 1');
  const times = () => [...document.querySelectorAll('li time')].map((el) => el.textContent);
  expect(times()).toEqual(['23:00', '23:00', '23:00']);
  expect(minuteTimers(timers)).toBe(1);
  act(() => {
    vi.advanceTimersByTime(2 * 60_000);
  });
  expect(times().every((text) => text !== '23:00' && text.includes('19'))).toBe(true);
});

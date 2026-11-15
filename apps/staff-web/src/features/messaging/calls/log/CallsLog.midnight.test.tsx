import type { CallView } from '@ab/shared';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { CallsLog } from './CallsLog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const AT = new Date(2026, 9, 19, 23, 0).toISOString();
const call = (id: string): CallView => ({
  id, phone_e164: '+966501234567', direction: 'outbound', status: 'ended', end_reason: 'completed',
  display_name: 'أم سهيلة', staff_id: 'u1', started_at: AT, answered_at: null, ended_at: null, duration_seconds: 60,
});

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

describe('«المكالمات» at midnight (compiled)', () => {
  it('one clock for the log: today\'s «23:00» turns into the date without a remount', async () => {
    const timers = vi.spyOn(globalThis, 'setInterval');
    routeFetch(apiFetch, [['/calls?limit=100', [call('c1'), call('c2')]]]);
    renderWithClient(<CallsLog />);
    const list = await screen.findByRole('list', { name: t.calls.log.title });
    const firstLine = () => [...list.querySelectorAll('li')].map((li) => li.querySelector('.tabular-nums span')?.textContent);
    expect(firstLine()).toEqual(['23:00', '23:00']);
    expect(minuteTimers(timers)).toBe(1);
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(firstLine().every((text) => text !== '23:00' && (text ?? '').includes('19'))).toBe(true);
  });
});

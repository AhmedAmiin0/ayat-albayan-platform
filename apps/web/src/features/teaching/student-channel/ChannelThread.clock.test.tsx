import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { channelPage } from './channel.fixtures';
import { ChannelThread } from './ChannelThread';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn(() => Promise.resolve({})) }));

// 23:59 in Riyadh on the 27th; the fixture's messages are at 13:00 and 13:05 that day.
beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-27T20:59:00Z'), toFake: ['Date', 'setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
});

it('the bubbles (compiled) share the thread\'s one clock: «13:00» gains its date after midnight', async () => {
  const timers = vi.spyOn(globalThis, 'setInterval');
  apiFetch.mockResolvedValue(channelPage());
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChannelThread refs={{ audience: 'portal', studentId: 's1' }} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
  await screen.findByText('غدًا إن شاء الله');
  const times = () => [...document.querySelectorAll('ol li p.text-end')].map((p) => p.textContent);
  expect(times()).toEqual(['13:00', '13:05']);
  expect(timers.mock.calls.filter((c) => c[1] === 60_000)).toHaveLength(1);
  act(() => {
    vi.advanceTimersByTime(2 * 60_000);
  });
  expect(times().every((text) => text.includes('27') && text !== '13:00' && text !== '13:05')).toBe(true);
});

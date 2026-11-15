import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadList } from './ThreadList';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

// 23:59 local, a message from 23:00: «23:00» until midnight, then the date (the compiled list).
const LATE = new Date(2026, 9, 19, 23, 59);
const AT = new Date(2026, 9, 19, 23, 0).toISOString();
const rows = [thread({ last_message_at: AT }), thread({ phone_e164: '+966501234568', last_message_at: AT })];

beforeEach(() => vi.useFakeTimers({ now: LATE, toFake: ['Date', 'setInterval', 'clearInterval'] }));
afterEach(() => vi.useRealTimers());

describe('ThreadList times at midnight (compiled)', () => {
  it('today\'s clock turns into the date after midnight, without a remount', () => {
    renderWithClient(<ThreadList search={{ page: 1 }} threads={rows} onFilter={vi.fn()} />);
    const times = () => [...document.querySelectorAll('li time')].map((el) => el.textContent);
    expect(times()).toEqual(['23:00', '23:00']);
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(times().every((text) => text !== '23:00' && text.includes('19'))).toBe(true);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('one timer for the whole list, not one per row', () => {
    renderWithClient(<ThreadList search={{ page: 1 }} threads={rows} onFilter={vi.fn()} />);
    expect(vi.getTimerCount()).toBe(1);
  });
});

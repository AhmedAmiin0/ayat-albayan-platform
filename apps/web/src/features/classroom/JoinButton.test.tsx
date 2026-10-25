import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { JoinButton } from './JoinButton';

// GET /settings/public never answers here: the window stays on the registry defaults (15 / 120 min).
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: () => new Promise(() => undefined) }));

const L = lesson({ id: 'l-5', status: 'confirmed', starts_at: '2026-10-03T16:00:00.000Z', minutes: 60 });
const at = (iso: string) => vi.setSystemTime(new Date(iso));
/** The window comes from GET /settings/public; with no answer yet, the registry defaults (15 / 120 min). */
const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('JoinButton «ادخل الحلقة»', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is disabled with «تُفتح الساعة …» before the window', () => {
    at('2026-10-03T15:30:00.000Z');
    render(<JoinButton lesson={L} />);
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens by itself on the minute tick, and links to the classroom', () => {
    at('2026-10-03T15:44:30.000Z');
    render(<JoinButton lesson={L} />);
    expect(screen.queryByRole('link')).toBeNull();
    act(() => {
      vi.setSystemTime(new Date('2026-10-03T15:45:30.000Z'));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('link', { name: t.classroom.enter }).getAttribute('href')).toBe('/classroom/l-5');
  });

  it('closes again 2 hours after the end', () => {
    at('2026-10-03T19:00:01.000Z');
    render(<JoinButton lesson={L} />);
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
    expect(screen.getByText(t.classroom.closedHint)).toBeTruthy();
  });

  it('is not offered on a cancelled lesson', () => {
    at('2026-10-03T16:10:00.000Z');
    render(<JoinButton lesson={{ ...L, status: 'cancelled_by_admin' }} />);
    expect(screen.queryByText(t.classroom.enter)).toBeNull();
  });
});

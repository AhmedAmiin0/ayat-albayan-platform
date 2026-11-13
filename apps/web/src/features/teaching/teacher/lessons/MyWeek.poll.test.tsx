import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { MyWeek } from './MyWeek';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const SUNDAY = lesson({ id: 'a', starts_at: '2026-10-04T14:00:00.000Z' });
const failLessons = (path: string) =>
  path.startsWith('/teachers/me/lessons') ? Promise.reject(new Error('down')) : Promise.resolve([]);
const lessonCalls = () =>
  apiFetch.mock.calls.filter(([p]) => String(p).startsWith('/teachers/me/lessons')).length;

// docs/48: «جدولي» re-reads her lessons every 30 s, and a failed poll never blanks the grid.
describe('«جدولي» poll', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('polls every 30 s and keeps the grid when a poll fails', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.startsWith('/teachers/me/lessons') ? [SUNDAY] : []),
    );
    renderWithClient(<MyWeek />);
    await screen.findByRole('table', { name: t.schedule.grid });
    expect(lessonCalls()).toBe(1);
    apiFetch.mockImplementation(failLessons);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(lessonCalls()).toBe(2));
    expect(screen.getByRole('table', { name: t.schedule.grid })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('an error with nothing cached offers a retry', async () => {
    apiFetch.mockImplementation(failLessons);
    renderWithClient(<MyWeek />);
    expect(await screen.findByRole('button', { name: t.teacherStudents.retry })).toBeTruthy();
  });
});

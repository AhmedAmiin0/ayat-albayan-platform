import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonActions } from './LessonActions';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(),
  apiSend: vi.fn(),
}));

// docs/48 web clocks: the outcomes read useNow, not a clock frozen at mount.
describe('LessonActions clock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-03T12:59:30.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('the attendance outcomes appear at the start minute with no remount', () => {
    const l = lesson({ starts_at: '2026-10-03T13:00:00.000Z' });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LessonActions lesson={l} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: t.lessons.event.complete })).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole('button', { name: t.lessons.event.complete })).toBeTruthy();
  });
});

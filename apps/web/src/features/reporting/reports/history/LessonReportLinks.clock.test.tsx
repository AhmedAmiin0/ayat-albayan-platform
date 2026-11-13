import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { LessonReportLinks } from './LessonReportLinks';

// docs/48 web clocks: the report link reads useNow, not a clock frozen at mount.
describe('LessonReportLinks clock', async () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-03T12:59:30.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('the link appears by itself at the start minute', async () => {
    const l = lesson({ id: 'l-1', starts_at: '2026-10-03T13:00:00.000Z' });
    render(<LessonReportLinks lesson={l} role="teacher" />);
    expect(screen.queryByRole('link')).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('link', { name: t.reports.open })).toBeTruthy();
  });
});

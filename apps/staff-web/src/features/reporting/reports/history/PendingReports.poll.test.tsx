import type { PendingReportView } from '@ab/shared';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { PendingReports } from './PendingReports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const ROW: PendingReportView = {
  lesson_id: 'l-1',
  starts_at: '2026-10-03T08:00:00.000Z',
  status: 'scheduled',
  report_id: null,
  student: { id: 's-1', code: 'AB-0183', name: 'سهيلة' },
};

// docs/48: the pending block re-reads every 30 s; a failed poll keeps the cached rows.
describe('PendingReports poll', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('polls every 30 s and keeps its rows when a poll fails', async () => {
    apiFetch.mockResolvedValue([ROW]);
    renderWithClient(<PendingReports tz="Africa/Cairo" />);
    expect(await screen.findByRole('region', { name: t.reports.pending })).toBeTruthy();
    apiFetch.mockRejectedValue(new Error('down'));
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText('سهيلة')).toBeTruthy();
  });
});

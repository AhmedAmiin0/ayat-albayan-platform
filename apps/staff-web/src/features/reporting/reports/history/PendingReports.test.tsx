import type { PendingReportView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { PendingReports } from './PendingReports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const row = (n: number, studentId = 's-1'): PendingReportView => ({
  lesson_id: `l-${n}`,
  starts_at: `2026-10-0${n}T08:00:00.000Z`,
  status: 'completed',
  report_id: null,
  student: { id: studentId, code: 'AB-0183', name: `طالب ${n}` },
});
const FIVE = [1, 2, 3, 4, 5].map((n) => row(n));

// docs/48: three rows, the rest in a native <details>; the hero's lesson left out; no skeleton.
describe('PendingReports (docs/48 compact block)', () => {
  afterEach(() => apiFetch.mockReset());

  it('5 rows → 3, then «عرض الباقي (2)» unfolding the rest', async () => {
    apiFetch.mockResolvedValue(FIVE);
    renderWithClient(<PendingReports tz="Africa/Cairo" />);
    const block = await screen.findByRole('region', { name: t.reports.pending });
    const more = within(block).getByText(t.reports.pendingMore.replace('{n}', '2'));
    const fold = more.closest('details');
    expect(fold?.open).toBe(false);
    const [first] = within(block).getAllByRole('list');
    expect(within(first ?? block).getAllByRole('listitem')).toHaveLength(3);
    expect(within(fold ?? block).getAllByRole('listitem')).toHaveLength(2);
  });

  it('`except` hides the hero’s lesson', async () => {
    apiFetch.mockResolvedValue([row(1), row(2)]);
    renderWithClient(<PendingReports tz="Africa/Cairo" except="l-1" />);
    expect(await screen.findByText('طالب 2')).toBeTruthy();
    expect(screen.queryByText('طالب 1')).toBeNull();
    expect(screen.getByText('تقرير واحد معلّق')).toBeTruthy();
  });

  it('`studentId` keeps only that student’s', async () => {
    apiFetch.mockResolvedValue([row(1), row(2, 's-2')]);
    renderWithClient(<PendingReports tz="Africa/Cairo" studentId="s-2" />);
    expect(await screen.findByText('طالب 2')).toBeTruthy();
    expect(screen.queryByText('طالب 1')).toBeNull();
  });

  it('loading renders nothing', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderWithClient(<PendingReports tz="Africa/Cairo" />);
    expect(document.body.textContent).toBe('');
  });

  it('an error with no data shows the alert and a retry that refetches', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    renderWithClient(<PendingReports tz="Africa/Cairo" />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(t.reports.pendingError);
    apiFetch.mockResolvedValue([row(1)]);
    fireEvent.click(within(alert).getByRole('button', { name: t.teacherStudents.retry }));
    await waitFor(() => expect(screen.getByText('طالب 1')).toBeTruthy());
  });
});

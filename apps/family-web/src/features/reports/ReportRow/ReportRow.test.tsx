import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEEN_REPORTS_KEY } from '@ab/client-core';
import { markReportSeen, t } from '@ab/web-kit';
import { kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { ReportRow } from './ReportRow';

const report = (over: { id?: string; recording_id?: string | null } = {}) => ({
  id: 'r1',
  lesson_id: 'l1',
  lesson_starts_at: '2026-10-20T16:00:00.000Z',
  sent_at: '2026-10-20T17:00:00.000Z',
  teacher: { display_name_ar: 'أبرار', display_name_en: null },
  recording_id: null,
  ...over,
});

const show = (row = report()) =>
  renderAt(
    <ul>
      <ReportRow report={row} student={kid()} />
    </ul>,
    '/reports',
  );

beforeEach(() => {
  localStorage.clear();
});

describe('ReportRow', () => {
  it('the teacher, and «جديد» on a report not opened on this device', async () => {
    show(report({ id: 'r-new' }));
    expect(await screen.findByText(t.portal.newReport)).toBeTruthy();
    expect(screen.getByText(/أبرار/)).toBeTruthy();
  });

  it('a report seen before has no «جديد»', async () => {
    markReportSeen('r-seen');
    show(report({ id: 'r-seen' }));
    expect(await screen.findByRole('button', { name: t.portal.openReport })).toBeTruthy();
    expect(screen.queryByText(t.portal.newReport)).toBeNull();
  });

  it('«فتح التقرير» marks it seen and opens it for this child, with its recording', async () => {
    const { router } = show(report({ id: 'r-open', recording_id: 'rec1' }));
    fireEvent.click(await screen.findByRole('button', { name: t.portal.openReport }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/report/r-open'));
    expect(router.state.location.search).toEqual({ studentId: 's1', recording: 'rec1' });
    expect(localStorage.getItem(SEEN_REPORTS_KEY)).toContain('r-open');
    expect(screen.queryByText(t.portal.newReport)).toBeNull();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { LessonReportView } from './LessonReportView';
import { pageView } from './page.fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonReportView reportId="r-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('LessonReportView: the report inside its lesson row (docs/49)', () => {
  it('reads the report by id: its lines and the PDF, without the page header', async () => {
    apiFetch.mockResolvedValue(pageView());
    open();
    expect(await screen.findByText(t.reports.v2.attendanceTitle)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/report-pages/by-report/r-1');
    expect(screen.getByText(t.reports.v2.attendance.on_time)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.reportPage.downloadPdf })).toBeTruthy();
    expect(screen.getByRole('article', { name: t.reportPage.title })).toBeTruthy();
    expect(screen.queryByText(/^حلقة .* بتاريخ /)).toBeNull();
    expect(screen.queryByText(t.reportPage.teacher.replace('{name}', 'أبرار'))).toBeNull();
  });

  it('a report under another teacher id (404): a quiet line, no alert', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, { error: 'not_found' }));
    open();
    const line = await screen.findByText(t.common.error);
    expect(line.tagName).toBe('P');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

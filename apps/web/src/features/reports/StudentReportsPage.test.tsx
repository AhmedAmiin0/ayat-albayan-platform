import type { GradePoint, ReportSummaryView, StudentReportsResponse } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentReportsPage } from './StudentReportsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const item = (id: string, over: Partial<ReportSummaryView> = {}): ReportSummaryView => ({
  id,
  lesson_id: `l-${id}`,
  starts_at: '2026-10-03T13:00:00.000Z',
  lesson_no: 7,
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  attendance: 'on_time',
  grade_overall: 'very_good',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
  ...over,
});
const point = (id: string, day: number, overall: number | null): GradePoint => ({
  report_id: id,
  lesson_id: `l-${id}`,
  starts_at: `2026-09-${String(day).padStart(2, '0')}T13:00:00.000Z`,
  overall,
  rubrics: { recitation: 5, memorization: 4, revision: 3, tajweed: 1, engagement: 2, commitment: null },
});
const DATA: StudentReportsResponse = {
  items: [item('b'), item('a', { pdf_status: 'failed', lesson_no: null, version: 2 })],
  total: 2,
  page: 1,
  pageSize: 10,
  series: [point('a', 26, 3), point('b', 29, 4)],
};

function renderPage(data: StudentReportsResponse, role: 'admin' | 'teacher' = 'admin') {
  apiFetch.mockImplementation((path: string) => (path.startsWith('/students/s-1/reports') ? Promise.resolve(data) : Promise.resolve({ url: 'https://x/pdf' })));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentReportsPage studentId="s-1" name="سهيلة" role={role} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
}

describe('StudentReportsPage (R-REP-05, issue D2)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('chart of the overall grade with a summary; every report in the list with its PDF state', async () => {
    renderPage(DATA);
    const chart = await screen.findByRole('region', { name: t.reports.progress });
    expect(within(chart).getByText(/التقدير العام للحلقة: آخر تقييم جيد جدًا، من 2 تقارير/)).toBeTruthy();
    expect(within(chart).getAllByRole('img')).toHaveLength(2);
    const list = screen.getByRole('region', { name: t.reports.title });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText(t.reports.lessonNoShort.replace('{n}', '7'))).toBeTruthy();
    expect(within(list).getByRole('button', { name: t.reports.downloadPdf })).toBeTruthy();
    expect(within(list).getByRole('button', { name: t.reports.retryPdf })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s-1/reports?page=1&pageSize=10');
  });

  it('switching the series shows that rubric; an ungraded rubric has no dot', async () => {
    renderPage(DATA);
    const chart = await screen.findByRole('region', { name: t.reports.progress });
    fireEvent.click(within(chart).getByRole('button', { name: t.reports.rubric.commitment }));
    expect(within(chart).queryAllByRole('img')).toHaveLength(0);
    expect(within(chart).getByText(/الالتزام والحضور: آخر تقييم بدون تقييم/)).toBeTruthy();
    fireEvent.click(within(chart).getByRole('button', { name: t.reports.rubric.tajweed }));
    expect(within(chart).getAllByRole('img')[1]?.getAttribute('aria-label')).toContain(t.enums.grade.needs_review);
  });

  it('hover / focus on a point shows its grade first, then the date', async () => {
    renderPage(DATA);
    const chart = await screen.findByRole('region', { name: t.reports.progress });
    fireEvent.focus(within(chart).getAllByRole('img')[0] as HTMLElement);
    expect(within(chart).getByRole('tooltip').textContent).toBe(`${t.enums.grade.good}26 سبتمبر`);
  });

  it('a teacher never gets the PDF retry; the PDF tab opens in the click, then goes to the signed URL', async () => {
    const tab = { opener: {}, location: { assign: vi.fn() }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    renderPage(DATA, 'teacher');
    const list = await screen.findByRole('region', { name: t.reports.title });
    expect(within(list).queryByRole('button', { name: t.reports.retryPdf })).toBeNull();
    fireEvent.click(within(list).getByRole('button', { name: t.reports.downloadPdf }));
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.opener).toBeNull();
    await waitFor(() => expect(tab.location.assign).toHaveBeenCalledWith('https://x/pdf'));
    expect(apiFetch).toHaveBeenCalledWith('/reports/b/pdf');
  });

  it('no reports yet → the empty state', async () => {
    renderPage({ items: [], total: 0, page: 1, pageSize: 10, series: [] });
    expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
  });
});

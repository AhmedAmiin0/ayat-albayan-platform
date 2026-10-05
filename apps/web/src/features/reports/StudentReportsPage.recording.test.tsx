import type { ReportSummaryView, StudentReportsResponse } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentReportsPage } from './StudentReportsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const item = (id: string): ReportSummaryView => ({
  id,
  lesson_id: `l-${id}`,
  starts_at: '2026-10-03T13:00:00.000Z',
  lesson_no: 7,
  teacher: { id: 't-1', display_name_ar: 'أبرار' },
  attendance: 'on_time',
  grade_overall: 'very_good',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
});
const LINK = new RegExp(t.studentRecordings.reportLinkOf.split(' {')[0] ?? '');
const DATA: StudentReportsResponse = { items: [item('a'), item('b')], total: 2, page: 1, pageSize: 10, series: [] };

function renderPage(role: 'admin' | 'teacher', recordings: unknown) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes('/recorded-lesson-ids')) {
      if (recordings instanceof Error) throw recordings;
      return recordings;
    }
    return DATA;
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentReportsPage studentId="s-1" role={role} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('report history → the lesson’s recording', () => {
  it('only the report whose lesson has a finished recording links to it (admin: the student profile)', async () => {
    renderPage('admin', ['l-a']);
    const link = await screen.findByRole('link', { name: LINK });
    expect(link.getAttribute('href')).toBe('/admin/students/s-1');
    expect(screen.getAllByRole('link', { name: LINK })).toHaveLength(1);
  });

  it('a teacher’s link stays on their own student page', async () => {
    renderPage('teacher', ['l-b']);
    const link = await screen.findByRole('link', { name: LINK });
    expect(link.getAttribute('href')).toBe('/teacher/reports/s-1');
  });

  it('asks only for the ids: no signed recording list is requested', async () => {
    renderPage('admin', ['l-a']);
    await screen.findByRole('link', { name: LINK });
    expect(apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('/recordings'))).toEqual([]);
  });

  it('no recordings, or a refused request: no links and the history still shows', async () => {
    renderPage('teacher', new Error('403'));
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
    expect(screen.queryByRole('link', { name: LINK })).toBeNull();
  });
});

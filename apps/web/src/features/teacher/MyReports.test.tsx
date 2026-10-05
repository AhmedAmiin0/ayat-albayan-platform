import type { PendingReportView, TeacherMe, TeacherReportView } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { MyReports } from './MyReports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/dashboard/link-mock')).Link,
}));

const ME = {
  id: 't-abrar',
  tz: 'Africa/Cairo',
  meeting_link: null,
  students: [{ id: 's-1', code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', status: 'active' }],
} as unknown as TeacherMe;
const PENDING = [{ lesson_id: 'l-9', starts_at: '2026-10-02T14:00:00.000Z', student: { id: 's-1', name: 'سهيلة' }, report_id: null }] as unknown as PendingReportView[];
const sent = (over: Partial<TeacherReportView>): TeacherReportView => ({
  id: 'r-1',
  lesson_id: 'l-1',
  starts_at: '2026-10-01T14:00:00.000Z',
  student: { id: 's-1', code: 'AB-0183', name: 'سهيلة' },
  attendance: 'on_time',
  grade_overall: 'excellent',
  status: 'submitted',
  submitted_at: '2026-10-01T15:00:00.000Z',
  can_edit: true,
  edit_until: '2026-10-02T15:00:00.000Z',
  pdf_status: 'ready',
  sent_at: null,
  ...over,
});
const OPEN = sent({});
const CLOSED = sent({ id: 'r-2', lesson_id: 'l-2', student: { id: 's-2', code: 'AB-0184', name: 'جود' }, can_edit: false, edit_until: null });

afterEach(() => apiFetch.mockReset());

describe('/teacher/reports (R-REP-01/02/05)', () => {
  it('pending first, then my sent reports: edit while the window is open, view after it', async () => {
    routeFetch(apiFetch, [
      ['/teachers/me/pending-reports', PENDING],
      ['/teachers/me/reports', { items: [OPEN, CLOSED], total: 2, page: 1, pageSize: 20 }],
      ['/teachers/me', ME],
    ]);
    renderWithClient(<MyReports />);
    const pending = await screen.findByRole('region', { name: t.reports.pending });
    expect(within(pending).getByRole('link', { name: t.reports.open }).getAttribute('href')).toBe('/teacher/report/l-9');
    const sentList = await screen.findByRole('region', { name: t.reports.submittedTitle });
    const [open, closed] = within(sentList).getAllByRole('listitem');
    expect(within(open as HTMLElement).getByRole('link', { name: t.reports.edit }).getAttribute('href')).toBe('/teacher/report/l-1');
    expect(within(open as HTMLElement).getByText(/يمكنك تعديل التقرير حتى/)).toBeTruthy();
    expect(within(open as HTMLElement).getByRole('button', { name: t.reports.downloadPdf })).toBeTruthy();
    expect(within(closed as HTMLElement).getByRole('link', { name: t.reports.view })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/reports?page=1&pageSize=20');
    const history = await screen.findByRole('region', { name: t.reports.history });
    expect(within(history).getByRole('link', { name: 'سهيلة' }).getAttribute('href')).toBe('/teacher/reports/s-1');
  });

  it('nothing sent yet says so', async () => {
    routeFetch(apiFetch, [
      ['/teachers/me/pending-reports', []],
      ['/teachers/me/reports', { items: [], total: 0, page: 1, pageSize: 20 }],
      ['/teachers/me', ME],
    ]);
    renderWithClient(<MyReports />);
    expect(await screen.findByText(t.reports.noSubmitted)).toBeTruthy();
  });
});

import type { PendingReportView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { LessonReportLinks } from './LessonReportLinks';
import { PendingReports } from './PendingReports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const STARTED = '2026-10-03T13:00:00.000Z';
const AYA = { ...SUHAILA, id: 's-2', name: 'آية', code: 'AB-0184' };

describe('LessonReportLinks (R-REP-01: «تقرير الحلقة» from the lesson)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('teacher: one link to the lesson form once it started', () => {
    render(<LessonReportLinks lesson={lesson({ id: 'l-1', starts_at: STARTED, students: [SUHAILA, AYA] })} role="teacher" />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([[t.reports.formTitle, '/teacher/report/l-1']]);
  });

  it('admin: one per student of a group lesson', () => {
    render(<LessonReportLinks lesson={lesson({ id: 'l-1', starts_at: STARTED, students: [SUHAILA, AYA] })} role="admin" />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      `/admin/students/${SUHAILA.id}/reports/l-1`,
      '/admin/students/s-2/reports/l-1',
    ]);
    expect(screen.getByRole('link', { name: t.reports.entryFor.replace('{name}', 'آية') })).toBeTruthy();
  });

  it('nothing before the start or for a cancelled lesson', () => {
    const { container } = render(<LessonReportLinks lesson={lesson({ starts_at: '2026-10-03T15:00:00.000Z' })} role="teacher" />);
    expect(container.textContent).toBe('');
    render(<LessonReportLinks lesson={lesson({ starts_at: STARTED, status: 'cancelled_by_admin' })} role="admin" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('PendingReports (R11, R-TCH-03)', () => {
  const row = (over: Partial<PendingReportView>): PendingReportView => ({
    lesson_id: 'l-1',
    starts_at: STARTED,
    status: 'completed',
    student: { id: 's-1', code: 'AB-0183', name: 'سهيلة' },
    report_id: null,
    ...over,
  });

  it('lists the missing reports with a count; a draft reads «أكمل التقرير»', async () => {
    apiFetch.mockResolvedValue([row({}), row({ lesson_id: 'l-2', report_id: 'r-2', student: { id: 's-2', code: 'AB-0184', name: 'آية' } })]);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PendingReports tz="Africa/Cairo" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('تقريران معلّقان')).toBeTruthy();
    expect(screen.getByRole('link', { name: t.reports.open }).getAttribute('href')).toBe('/teacher/report/l-1');
    expect(screen.getByRole('link', { name: t.reports.resume }).getAttribute('href')).toBe('/teacher/report/l-2');
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/pending-reports');
  });
});

import { PUBLIC_SETTING_DEFAULTS, type StudentAttendanceTable } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AttendanceLog } from './AttendanceLog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const NO_RETRY = { defaultOptions: { queries: { retry: false } } };
const base = {
  duration_min: 45, teacher_name: 'أبرار', report_id: null, cancel_reason: null,
  is_trial: false, is_makeup: false, is_rescheduled: false,
};
const totals = {
  held: 1, late: 0, absent: 0, excused: 0,
  cancelled_by_teacher: 1, cancelled_by_admin: 0,
  rescheduled: 0, unmarked: 1,
};
const LOG: StudentAttendanceTable = {
  month: '2026-10',
  months: ['2026-10'],
  totals,
  mine: true,
  items: [
    { ...base, lesson_id: 'a', starts_at: '2026-10-08T13:00:00.000Z', status: 'completed', attendance: null, kind: 'unmarked', report_sent: false },
    { ...base, lesson_id: 'b', starts_at: '2026-10-06T13:00:00.000Z', status: 'cancelled_by_teacher', attendance: null, kind: 'cancelled', report_sent: false, cancel_reason: 'سفر' },
    { ...base, lesson_id: 'c', starts_at: '2026-10-04T13:00:00.000Z', status: 'completed', attendance: 'on_time', kind: 'present', report_sent: true },
  ],
};

function renderLog(answer: Promise<unknown>) {
  apiFetch.mockImplementation((path: string) =>
    path === '/settings/public' ? Promise.resolve({ ...PUBLIC_SETTING_DEFAULTS, custom: {} }) : answer,
  );
  render(
    <QueryClientProvider client={new QueryClient(NO_RETRY)}>
      <AttendanceLog studentId="s-1" tz="Africa/Cairo" />
    </QueryClientProvider>,
  );
}

describe('AttendanceLog (docs/46 C5)', () => {
  afterEach(() => apiFetch.mockReset());

  it('rows: auto-held reads «لم يُسجَّل», a cancel shows its reason, reports sent or not', async () => {
    renderLog(Promise.resolve(LOG));
    const table = await screen.findByRole('table', { name: t.teacherBoard.attendanceLog });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0] as HTMLElement).getByText(t.sales.student.kind.unmarked)).toBeTruthy();
    expect(within(rows[0] as HTMLElement).getByText(t.sales.student.log.notSent)).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText(/سفر/)).toBeTruthy();
    expect(within(rows[2] as HTMLElement).getByText(t.sales.student.kind.present)).toBeTruthy();
    expect(within(rows[2] as HTMLElement).getByText(t.sales.student.log.sent)).toBeTruthy();
    expect(screen.getByRole('option', { name: 'أكتوبر 2026' })).toBeTruthy();
  });

  it('a failed read says so', async () => {
    renderLog(Promise.reject(new Error('down')));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
  });
});

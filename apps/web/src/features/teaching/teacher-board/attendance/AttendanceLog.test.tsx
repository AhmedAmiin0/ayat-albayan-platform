import { PUBLIC_SETTING_DEFAULTS, type StudentAttendanceTable } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AttendanceLog } from './AttendanceLog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const NOW = new Date('2026-10-08T14:00:00.000Z');
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
const sent = (editUntil: string) => ({
  status: 'submitted' as const, submitted_at: '2026-10-08T13:50:00.000Z', sent_at: null,
  can_edit: true, edit_until: editUntil,
});
// docs/47: the report cell (write / edit / view / «—») and the move lines.
const LOG_47: StudentAttendanceTable = {
  ...LOG,
  items: [
    { ...base, lesson_id: 'w', starts_at: '2026-10-08T13:00:00.000Z', status: 'completed', attendance: null, kind: 'unmarked', report_sent: false, report: null },
    { ...base, lesson_id: 'e', report_id: 'r-e', starts_at: '2026-10-07T13:00:00.000Z', status: 'completed', attendance: 'on_time', kind: 'present', report_sent: true, report: sent('2026-10-08T15:00:00.000Z') },
    { ...base, lesson_id: 'v', report_id: 'r-v', starts_at: '2026-10-05T13:00:00.000Z', status: 'completed', attendance: 'on_time', kind: 'present', report_sent: true, report: sent('2026-10-05T15:00:00.000Z') },
    { ...base, lesson_id: 'm', starts_at: '2026-10-04T13:00:00.000Z', status: 'rescheduled', attendance: null, kind: null, report_sent: false, report: null, moved_to: '2026-10-06T13:00:00.000Z', move_reason: 'سفر الأسرة' },
    { ...base, lesson_id: 'x', starts_at: '2026-10-03T13:00:00.000Z', status: 'cancelled_by_admin', attendance: null, kind: 'cancelled', report_sent: false, report: null, cancel_reason: 'مرض' },
  ],
};

function renderLog(answer: Promise<unknown>) {
  const fixed: Record<string, unknown> = {
    '/settings/public': { ...PUBLIC_SETTING_DEFAULTS, custom: {} },
    '/students/s-1/recorded-lesson-ids': [],
  };
  const reply = (path: string) => (path in fixed ? Promise.resolve(fixed[path]) : answer);
  apiFetch.mockImplementation(reply);
  render(
    <QueryClientProvider client={new QueryClient(NO_RETRY)}>
      <AttendanceLog studentId="s-1" tz="Africa/Cairo" />
    </QueryClientProvider>,
  );
}

async function tableRows(log: StudentAttendanceTable): Promise<HTMLElement[]> {
  renderLog(Promise.resolve(log));
  const table = await screen.findByRole('table', { name: t.teacherBoard.attendanceLog });
  return within(table).getAllByRole('row').slice(1);
}

describe('AttendanceLog (docs/46 C5)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('rows: auto-held reads «لم يُسجَّل», a cancel shows its reason and offers no report', async () => {
    const [held, cancelled, present] = await tableRows(LOG);
    expect(within(held as HTMLElement).getByText(t.sales.student.kind.unmarked)).toBeTruthy();
    expect(within(cancelled as HTMLElement).getByText(/سفر/)).toBeTruthy();
    expect(within(cancelled as HTMLElement).getByText('—')).toBeTruthy();
    expect(within(present as HTMLElement).getByText(t.sales.student.kind.present)).toBeTruthy();
    expect(screen.getByRole('option', { name: 'أكتوبر 2026' })).toBeTruthy();
  });

  it('report cell (docs/47, docs/49): write → the form, edit inside the window, then read in the row', async () => {
    const [write, edit, view, moved, cancelled] = await tableRows(LOG_47);
    const link = (row: HTMLElement | undefined, name: string) =>
      within(row as HTMLElement).getByRole('link', { name }).getAttribute('href');
    expect(link(write, t.teacherBoard.writeReport)).toBe('/teacher/report/w');
    expect(link(edit, t.reports.edit)).toBe('/teacher/report/e');
    expect(within(view as HTMLElement).queryByRole('link')).toBeNull();
    expect(within(view as HTMLElement).getByText(t.reports.view).tagName).toBe('SUMMARY');
    expect(within(moved as HTMLElement).getByText('—')).toBeTruthy();
    expect(within(moved as HTMLElement).queryByRole('link')).toBeNull();
    expect(within(cancelled as HTMLElement).getByText('—')).toBeTruthy();
  });

  it('a moved row says where it went and why, in her zone (docs/47)', async () => {
    const [, , , moved] = await tableRows(LOG_47);
    const log = t.sales.student.log;
    expect(within(moved as HTMLElement).getByText(new RegExp(log.movedTo.replace('{when}', 'الثلاثاء 6 أكتوبر 16:00')))).toBeTruthy();
    expect(within(moved as HTMLElement).getByText(new RegExp(log.moveReason.replace('{reason}', 'سفر الأسرة')))).toBeTruthy();
  });

  it('a failed read says so', async () => {
    renderLog(Promise.reject(new Error('down')));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
  });
});

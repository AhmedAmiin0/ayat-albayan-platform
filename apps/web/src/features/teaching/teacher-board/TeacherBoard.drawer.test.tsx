import { PUBLIC_SETTING_DEFAULTS, type StudentAttendanceTable, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { TeacherBoard } from './TeacherBoard';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const NO_RETRY = { defaultOptions: { queries: { retry: false } } };
const TZ = 'Africa/Cairo';
const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: TZ,
  meeting_link: null, meeting_mode: null, platform_classroom: false,
  students: [{ id: 's-1', code: 'AB-0183', name: 'سهيلة', tz: TZ, status: 'active' }],
};
const LESSONS = [
  lesson({ id: 'a', starts_at: '2026-10-01T13:00:00.000Z', status: 'completed' }),
  lesson({ id: 'c', starts_at: '2026-10-07T13:00:00.000Z' }),
];
const totals = {
  held: 3, late: 0, absent: 1, excused: 0,
  cancelled_by_teacher: 1, cancelled_by_admin: 0,
  rescheduled: 0, unmarked: 0,
};
const LOG: StudentAttendanceTable = { month: '2026-10', months: ['2026-10', '2026-09'], items: [], totals, mine: true };
const EMPTY_REPORTS = { items: [], total: 0, page: 1, pageSize: 10, series: [] };

function answer(path: string) {
  if (path === '/settings/public') return { ...PUBLIC_SETTING_DEFAULTS, custom: {} };
  if (path.startsWith('/teachers/me/students/s-1/attendance')) return LOG;
  if (path.startsWith('/students/s-1/reports')) return EMPTY_REPORTS;
  return [];
}

function openDrawer() {
  apiFetch.mockImplementation((path: string) => Promise.resolve(answer(path)));
  render(
    <QueryClientProvider client={new QueryClient(NO_RETRY)}>
      <TeacherBoard me={ME} lessons={LESSONS} now={new Date('2026-10-05T12:00:00.000Z')} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'سهيلة' }));
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

describe('TeacherBoard drawer «الحلقات | التقارير | الحضور» (docs/46 C1)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('opens on «الحلقات»: her cards for the student, with «سأحضر» on the coming one', () => {
    const drawer = openDrawer();
    const tabs = within(drawer).getByRole('tablist', { name: t.teacherBoard.drawerTabs });
    expect(within(tabs).getAllByRole('tab').map((x) => x.textContent)).toEqual([
      t.teacherBoard.lessonsTab, t.teacherBoard.reportsTab, t.teacherBoard.attendanceTab,
    ]);
    expect(within(drawer).getAllByRole('article')).toHaveLength(2);
    expect(within(drawer).getAllByRole('button', { name: t.teacherBoard.confirm })).toHaveLength(1);
  });

  it('«ملف الطالب» opens the student file (docs/47)', () => {
    const drawer = openDrawer();
    const link = within(drawer).getByRole('link', { name: t.teacherBoard.openFile });
    expect(link.getAttribute('href')).toBe('/teacher/students/s-1');
  });

  it('a row click opens the same drawer', () => {
    openDrawer();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.common.close }));
    const cell = screen.getByText('AB-0183').closest('tr');
    if (!cell) throw new Error('no row');
    fireEvent.click(cell);
    expect(screen.getByRole('dialog', { name: 'سهيلة' })).toBeTruthy();
  });

  it('«التقارير» reads the student report history', async () => {
    const drawer = openDrawer();
    fireEvent.click(within(drawer).getByRole('tab', { name: t.teacherBoard.reportsTab }));
    expect(await within(drawer).findByText(t.reports.noReports)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s-1/reports?page=1&pageSize=10');
  });

  it('«الحضور» reads her own log for the student, a month at a time', async () => {
    const drawer = openDrawer();
    fireEvent.click(within(drawer).getByRole('tab', { name: t.teacherBoard.attendanceTab }));
    expect(await within(drawer).findByText(/حضر 3 · غاب 1/)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students/s-1/attendance');
    fireEvent.change(within(drawer).getByLabelText(t.sales.student.log.months), { target: { value: '2026-09' } });
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students/s-1/attendance?month=2026-09'),
    );
  });
});

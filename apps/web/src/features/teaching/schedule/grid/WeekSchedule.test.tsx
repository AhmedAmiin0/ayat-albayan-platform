import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { FATMA, lesson } from '../lesson/lesson-fixture';
import { overview } from '../overview-fixture';
import type { ScheduleSearch } from '../filters/search';
import { WeekSchedule } from './WeekSchedule';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

const SUNDAY = lesson({ id: 'a', status: 'scheduled' }); // Sun 4 Oct 17:00 Riyadh, Abrar
const MONDAY = lesson({ id: 'b', status: 'confirmed', teacher: FATMA, starts_at: '2026-10-05T10:00:00.000Z' });
const MOVED = lesson({ id: 'c', status: 'rescheduled', starts_at: '2026-10-06T10:00:00.000Z' });

function renderWeek(search: ScheduleSearch = {}) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/lessons/overview') ? overview([SUNDAY, MONDAY, MOVED]) : []),
  );
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WeekSchedule search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

const rowNames = (grid: HTMLElement) =>
  within(grid).getAllByRole('rowheader').map((r) => within(r).getByRole('link').textContent);

describe('WeekSchedule (R-SCH-01, R-SCH-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z')); // Saturday 12:00 Riyadh
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('loads the Riyadh week in UTC and gives every teacher a row, lessons or not', async () => {
    renderWeek();
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(apiFetch).toHaveBeenCalledWith('/lessons/overview?from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z');
    expect(rowNames(grid)).toEqual(['أبرار', FATMA.display_name_ar, 'نور']);
    const abrar = within(grid).getAllByRole('row')[1] as HTMLElement;
    expect(within(abrar).getByRole('button', { name: /17:00/ }).textContent).toContain(t.enums.lessonStatus.scheduled);
    expect(within(abrar).getByText(t.dashboard.ofMax.replace('{n}', '4').replace('{max}', '10'))).toBeTruthy();
    expect(within(abrar).getByText(t.schedule.freeTotal.replace('{h}', '3:15'))).toBeTruthy();
  });

  it('a whole day of time off is one «إجازة» note with the reason', async () => {
    renderWeek();
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    const fatma = within(grid).getAllByRole('row')[2] as HTMLElement;
    expect(within(fatma).getByText(`${t.schedule.dayOff} · سفر`)).toBeTruthy();
  });

  it('hides moved lessons until «إظهار الملغية…», counts lessons and the ones needing a confirm', async () => {
    renderWeek();
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(within(grid).queryByText(t.enums.lessonStatus.rescheduled)).toBeNull();
    expect(screen.getByText(t.schedule.lessonCount.two)).toBeTruthy();
    expect(screen.getByText(t.schedule.needsConfirmCount.replace('{n}', '1')).className).toContain('text-act');
  });

  it('shows closed lessons with the toggle on, and sends filter changes to the URL', async () => {
    const onSearch = renderWeek({ closed: true });
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(within(grid).getByText(t.enums.lessonStatus.rescheduled)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextWeek }));
    expect(onSearch).toHaveBeenCalledWith({ closed: true, week: '2026-10-10' });
    openFilters();
    fireEvent.change(screen.getByLabelText(t.schedule.statusFilter), { target: { value: 'confirmed' } });
    expect(onSearch).toHaveBeenLastCalledWith({ closed: true, status: 'confirmed' });
    fireEvent.change(screen.getByLabelText(t.teachers.gender), { target: { value: 'male' } });
    expect(onSearch).toHaveBeenLastCalledWith({ closed: true, gender: 'male' });
  });

  it('picked teachers, program and gender filter the rows on the client', async () => {
    renderWeek({ teachers: ['t-abrar', 't-nour'], program: 'quran' });
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(rowNames(grid)).toEqual(['أبرار']);
    expect(apiFetch).toHaveBeenCalledWith(expect.not.stringContaining('teacherId'));
  });

  it('filters that leave no teacher say so', async () => {
    renderWeek({ gender: 'male', program: 'quran' });
    expect(await screen.findByRole('heading', { name: t.booking.noTeachers })).toBeTruthy();
  });

  it('a chip opens the lesson drawer with Riyadh and the student time', async () => {
    renderWeek();
    fireEvent.click(await screen.findByRole('button', { name: /17:00/ }));
    const drawer = screen.getByRole('dialog', { name: 'سهيلة' });
    expect(within(drawer).getByText(new RegExp(t.schedule.riyadhTime)).textContent).toContain('17:00');
    expect(within(drawer).getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: new RegExp(t.lessons.join) }).getAttribute('href')).toBe(SUNDAY.meeting_link);
  });
});

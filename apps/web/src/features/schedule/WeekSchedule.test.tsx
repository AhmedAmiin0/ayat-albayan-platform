import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FATMA, lesson } from './lesson-fixture';
import type { ScheduleSearch } from './search';
import { WeekSchedule } from './WeekSchedule';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
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
    Promise.resolve(path.startsWith('/lessons') ? [SUNDAY, MONDAY, MOVED] : []),
  );
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WeekSchedule search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

describe('WeekSchedule (R-SCH-01, R-SCH-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z')); // Saturday 12:00 Riyadh
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('loads the Riyadh week in UTC and lays lessons out per teacher and day', async () => {
    renderWeek();
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(apiFetch).toHaveBeenCalledWith('/lessons?from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z');
    const rows = within(grid).getAllByRole('row');
    expect(rows.map((r) => within(r).queryByRole('rowheader')?.textContent)).toEqual([undefined, 'أبرار', FATMA.display_name_ar]);
    expect(within(rows[1] as HTMLElement).getByRole('button', { name: /17:00/ }).textContent).toContain(t.enums.lessonStatus.scheduled);
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
    fireEvent.change(screen.getByLabelText(t.schedule.statusFilter), { target: { value: 'confirmed' } });
    expect(onSearch).toHaveBeenLastCalledWith({ closed: true, status: 'confirmed' });
  });

  it('asks the API for one teacher when filtered', async () => {
    renderWeek({ teacher: 't-abrar', week: '2026-10-10' });
    await screen.findByRole('table', { name: t.schedule.grid });
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/lessons\?from=2026-10-09T21.*&teacherId=t-abrar$/));
  });

  it('a chip opens the lesson drawer with Riyadh and the student time', async () => {
    renderWeek();
    fireEvent.click(await screen.findByRole('button', { name: /17:00/ }));
    const drawer = screen.getByRole('dialog', { name: 'سهيلة' });
    expect(within(drawer).getByText(new RegExp(t.schedule.riyadhTime)).textContent).toContain('17:00');
    expect(within(drawer).getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: new RegExp(t.lessons.join) }).getAttribute('href')).toBe(SUNDAY.meeting_link);
  });

  it('an empty week says so', async () => {
    apiFetch.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <WeekSchedule search={{}} onSearch={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: t.schedule.empty })).toBeTruthy();
  });
});

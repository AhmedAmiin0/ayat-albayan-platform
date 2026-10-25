import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { overview } from './overview-fixture';
import type { ScheduleSearch } from './search';
import { WeekSchedule } from './WeekSchedule';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, className }: { to: string; search?: Record<string, string>; children: ReactNode; className?: string }) => (
    <a href={search ? `${to}?${new URLSearchParams(search)}` : to} className={className}>{children}</a>
  ),
}));

const TRIAL = lesson({ id: 'a', trial: true }); // Sunday 17:00–17:45 Riyadh, Abrar

function renderDay(search: ScheduleSearch) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path.startsWith('/lessons/overview') ? overview([TRIAL]) : []));
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WeekSchedule search={{ view: 'day', ...search }} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

const row = (name: string) => screen.findByRole('region', { name });

describe('DayBoard — one day across every teacher (R-SCH-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z')); // Saturday 12:00 Riyadh
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('asks for the Riyadh day and gives every teacher a row', async () => {
    renderDay({ day: '2026-10-04' });
    const board = await screen.findByRole('region', { name: t.schedule.dayBoard });
    expect(apiFetch).toHaveBeenCalledWith('/lessons/overview?from=2026-10-03T21%3A00%3A00.000Z&to=2026-10-04T21%3A00%3A00.000Z');
    expect(within(board).getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['أبرار', 'فاطمة الزهراء', 'نور']);
    expect(within(await row('نور')).getByText(t.schedule.noLessons)).toBeTruthy();
    expect(within(await row('نور')).getByText(t.schedule.noWindows)).toBeTruthy();
  });

  it('a teacher row: profile link, load, the trial chip and free gaps that open the booking', async () => {
    renderDay({ day: '2026-10-04' });
    const abrar = await row('أبرار');
    expect(within(abrar).getByRole('link', { name: 'أبرار' }).getAttribute('href')).toBe('/admin/teachers/$teacherId');
    expect(within(abrar).getByText(t.dashboard.ofMax.replace('{n}', '4').replace('{max}', '10'))).toBeTruthy();
    const chip = within(abrar).getByRole('button', { name: /17:00/ });
    expect(within(chip).getByText(t.schedule.trialTag)).toBeTruthy();
    const gaps = within(abrar).getAllByRole('link', { name: /متاح/ });
    expect(gaps.map((g) => g.textContent)).toEqual([
      `${t.schedule.book}: متاح 16:00 – 17:00`,
      `${t.schedule.book}: متاح 17:45 – 20:00`,
    ]);
    expect(gaps[0]?.getAttribute('href')).toBe('/admin/book?teacherId=t-abrar&startsAt=2026-10-04T13%3A00%3A00.000Z');
  });

  it('a chip opens the lesson drawer', async () => {
    renderDay({ day: '2026-10-04' });
    fireEvent.click(within(await row('أبرار')).getByRole('button', { name: /17:00/ }));
    expect(screen.getByRole('dialog', { name: 'سهيلة' })).toBeTruthy();
  });

  it('a day off is one note instead of the track', async () => {
    renderDay({ day: '2026-10-05' });
    expect(within(await row('فاطمة الزهراء')).getByText(`${t.schedule.dayOff} · سفر`)).toBeTruthy();
  });

  it('steps a day, goes back to today and switches to the week', async () => {
    const onSearch = renderDay({ day: '2026-10-04' });
    await row('أبرار');
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextDay }));
    expect(onSearch).toHaveBeenLastCalledWith({ view: 'day', day: '2026-10-05' });
    fireEvent.click(screen.getByRole('button', { name: t.schedule.today }));
    expect(onSearch).toHaveBeenLastCalledWith({ view: 'day' });
    fireEvent.click(screen.getByRole('button', { name: t.schedule.viewWeek }));
    expect(onSearch).toHaveBeenLastCalledWith({});
  });

  it('today is the default day, so «اليوم» is off and the week view opens on today', async () => {
    const onSearch = renderDay({});
    await row('أبرار');
    expect(screen.getByRole('button', { name: t.schedule.today }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.schedule.prevDay }));
    expect(onSearch).toHaveBeenLastCalledWith({ view: 'day', day: '2026-10-02' });
  });
});

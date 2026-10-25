import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson, teacher } from '../academy.fixtures';
import { renderWithQuery } from '../academy.test-utils';
import { SalesSchedule } from './SalesSchedule';
import type { SalesScheduleSearch } from './schedule-search';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const iso = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const NOW_LESSON = scheduleLesson({ id: 'l-now', starts_at: iso(-5), ends_at: iso(25), trial: true });
const LATER = scheduleLesson({ id: 'l-later', starts_at: iso(120), ends_at: iso(150), status: 'scheduled' });
const OTHER = scheduleLesson({ id: 'l-b', teacher: { id: 'tc2', display_name_ar: 'محمد', display_name_en: null }, students: [{ id: 's3', code: 'AB-0200', name: 'يوسف' }], status: 'completed', makeup: true });

function renderDay(search: SalesScheduleSearch, lessons = [NOW_LESSON, LATER, OTHER]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/sales/schedule')) return { date: search.date ?? '2026-10-12', lessons };
    if (path === '/sales/teachers') return [teacher(), teacher({ id: 'c2000000-0000-4000-8000-0000000000c2', name: 'محمد' })];
    throw new Error(path);
  });
  const onSearch = vi.fn();
  renderWithQuery(<SalesSchedule search={search} onSearch={onSearch} />);
  return onSearch;
}

afterEach(() => apiFetch.mockReset());

describe('SalesSchedule «جدول الحلقات» (read-only)', () => {
  it('the day by teacher: time, students, status, trial / makeup badges; join only on the running lesson', async () => {
    renderDay({ date: '2026-10-12' });
    const board = await screen.findByRole('region', { name: t.schedule.dayBoard });
    expect(apiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12');
    const abrar = within(board).getByRole('region', { name: 'أبرار' });
    expect(within(abrar).getAllByText('سهيلة')).toHaveLength(2);
    expect(within(abrar).getByText(t.schedule.trialTag)).toBeTruthy();
    expect(within(abrar).getByText(t.sales.academySchedule.liveNow)).toBeTruthy();
    expect(within(abrar).getAllByText(t.classroom.enter)).toHaveLength(1);
    const mohamed = within(board).getByRole('region', { name: 'محمد' });
    expect(within(mohamed).getByText(t.enums.lessonStatus.completed)).toBeTruthy();
    expect(within(mohamed).getByText(t.booking.makeup.tag)).toBeTruthy();
    expect(within(mohamed).queryByText(t.classroom.enter)).toBeNull();
  });

  it("never shows a teacher's fixed link (docs/16 row 14), though /sales/teachers carries it", async () => {
    renderDay({ date: '2026-10-12' });
    await screen.findByRole('region', { name: t.schedule.dayBoard });
    expect(document.body.textContent).not.toContain('meet.example.org');
  });

  it('no edit, cancel, move, book or report action: lesson chips are not buttons', async () => {
    renderDay({ date: '2026-10-12' });
    const board = await screen.findByRole('region', { name: t.schedule.dayBoard });
    expect(within(board).queryAllByRole('button').filter((b) => !b.hasAttribute('disabled'))).toEqual([]);
    expect(board.textContent).not.toMatch(new RegExp([t.lessons.event.cancel_by_admin, t.lessons.event.reschedule, t.schedule.book].join('|')));
  });

  it('date navigation and the teacher filter go to the URL; today stays out of it', async () => {
    const onSearch = renderDay({ date: '2030-11-20' });
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(t.schedule.nextDay) }));
    expect(onSearch).toHaveBeenLastCalledWith({ date: '2030-11-21' });
    fireEvent.click(screen.getByRole('button', { name: t.schedule.today }));
    expect(onSearch).toHaveBeenLastCalledWith({});
    const select = screen.getByRole('combobox', { name: t.schedule.teacherFilter });
    await within(select).findByText('محمد');
    fireEvent.change(select, { target: { value: 'c2000000-0000-4000-8000-0000000000c2' } });
    expect(onSearch).toHaveBeenLastCalledWith({ date: '2030-11-20', teacherId: 'c2000000-0000-4000-8000-0000000000c2' });
  });

  it('an empty day for one teacher says so; the API gets the teacher', async () => {
    renderDay({ date: '2026-10-12', teacherId: 'c2000000-0000-4000-8000-0000000000c2' }, []);
    expect(await screen.findByText(t.sales.academySchedule.emptyTeacher)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12&teacherId=c2000000-0000-4000-8000-0000000000c2');
  });
});

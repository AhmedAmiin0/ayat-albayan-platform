import { PUBLIC_SETTING_DEFAULTS, type LessonView, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import type { DashboardTab } from './home-search';
import { TeacherDashboard } from './TeacherDashboard';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: 'https://meet.jit.si/ayat-abrar', meeting_mode: null, platform_classroom: false, students: [],
};
// Saturday 3 Oct, 12:00 Cairo (09:00Z): 16:00 and 18:00 today, one ended at 10:00, Monday's.
const HERO = lesson({ id: 'h', starts_at: '2026-10-03T13:00:00.000Z' });
const LATER = lesson({ id: 'l', starts_at: '2026-10-03T15:00:00.000Z', students: [{ ...HERO.students[0], id: 's-9', name: 'جود' } as LessonView['students'][number]] });
const ENDED = lesson({ id: 'e', starts_at: '2026-10-03T07:00:00.000Z' });
const MONDAY = lesson({ id: 'm', starts_at: '2026-10-05T13:00:00.000Z' });

type Lessons = LessonView[] | Error;

function renderDash(lessons: Lessons = [HERO, LATER, ENDED, MONDAY], tab: DashboardTab = 'students', onTab = vi.fn()) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/teachers/me') return Promise.resolve(ME);
    if (path === '/settings/public') return Promise.resolve({ ...PUBLIC_SETTING_DEFAULTS, custom: {} });
    if (path.startsWith('/teachers/me/lessons')) return lessons instanceof Error ? Promise.reject(lessons) : Promise.resolve(lessons);
    return Promise.resolve([]);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherDashboard tab={tab} onTab={onTab} />
    </QueryClientProvider>,
  );
  return onTab;
}

const tabCount = (name: string) => screen.getByRole('tab', { name: new RegExp(name) }).textContent;

describe('TeacherDashboard — hero and tabs (docs/48)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the hero sits above the tabs, with no fixed-link banner; «اليوم» counts 2', async () => {
    renderDash();
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    const tabs = screen.getByRole('tablist');
    expect(hero.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.teacherDash.joinLink })).toBeNull();
    expect(tabCount(t.teacherDash.today)).toBe(`${t.teacherDash.today}2`);
  });

  it('no hero today in Meet mode: the banner shows her link', async () => {
    renderDash([MONDAY]);
    const banner = await screen.findByRole('region', { name: t.teacherDash.joinLink });
    expect(within(banner).getByRole('link', { name: t.teacherDash.join }).getAttribute('href')).toBe(ME.meeting_link);
  });

  it('tab=today: the rest of the day as rows, the ended fold; a tab click goes to onTab', async () => {
    const onTab = renderDash(undefined, 'today');
    const panel = await screen.findByRole('tabpanel');
    expect(await within(panel).findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'جود') })).toBeTruthy();
    expect(within(panel).getByText('انتهت حلقة واحدة اليوم')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: t.teacherDash.week }));
    expect(onTab).toHaveBeenCalledWith('week');
  });

  it('a row opens the drawer; the toast waits while it is open', async () => {
    renderDash(undefined, 'today');
    const panel = await screen.findByRole('tabpanel');
    fireEvent.click(await within(panel).findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'جود') }));
    expect(screen.getByRole('dialog', { name: 'جود' })).toBeTruthy();
  });

  it('opening a drawer clears the last notice (review: no stale message in the next lesson)', async () => {
    apiSend.mockResolvedValue(HERO);
    renderDash(undefined, 'today');
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    fireEvent.click(within(hero).getByRole('button', { name: t.teacherBoard.confirm }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.teacherBoard.confirmedOk));
    const panel = screen.getByRole('tabpanel');
    fireEvent.click(within(panel).getByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'جود') }));
    const drawer = screen.getByRole('dialog', { name: 'جود' });
    expect(within(drawer).getByRole('status').textContent).toBe('');
  });

  it('a lessons error with nothing cached offers a retry', async () => {
    renderDash(new Error('down'), 'today');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(t.teacherDash.loadError);
    expect(within(alert).getByRole('button', { name: t.teacherStudents.retry })).toBeTruthy();
  });

  it('«سأحضر» never refetches /teachers/me', async () => {
    apiSend.mockResolvedValue(HERO);
    renderDash();
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    const meCalls = () => apiFetch.mock.calls.filter(([p]) => p === '/teachers/me').length;
    const before = meCalls();
    fireEvent.click(within(hero).getByRole('button', { name: t.teacherBoard.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.teacherBoard.confirmedOk));
    expect(meCalls()).toBe(before);
  });
});

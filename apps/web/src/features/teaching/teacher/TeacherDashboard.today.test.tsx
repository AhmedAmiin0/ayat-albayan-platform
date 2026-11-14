import { PUBLIC_SETTING_DEFAULTS, type LessonView, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
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

function renderDash(lessons: Lessons = [HERO, LATER, ENDED, MONDAY]) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/teachers/me') return Promise.resolve(ME);
    if (path === '/settings/public') return Promise.resolve({ ...PUBLIC_SETTING_DEFAULTS, custom: {} });
    if (path.startsWith('/teachers/me/lessons')) return lessons instanceof Error ? Promise.reject(lessons) : Promise.resolve(lessons);
    return Promise.resolve([]);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherDashboard />
    </QueryClientProvider>,
  );
}

const openRow = (name: string) => ({ name: t.lessons.sheet.openRow.replace('{names}', name) });

describe('TeacherDashboard — the hero and today\'s list (owner 2026-11-14)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the hero sits above today\'s rows, with no fixed-link banner', async () => {
    renderDash();
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    const row = await screen.findByRole('button', openRow('جود'));
    expect(hero.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.teacherDash.joinLink })).toBeNull();
  });

  it('no hero today in Meet mode: the banner shows her link', async () => {
    renderDash([MONDAY]);
    const banner = await screen.findByRole('region', { name: t.teacherDash.joinLink });
    expect(within(banner).getByRole('link', { name: t.teacherDash.join }).getAttribute('href')).toBe(ME.meeting_link);
  });

  it('the rest of the day as rows and the ended fold; no tabs', async () => {
    renderDash();
    expect(await screen.findByRole('button', openRow('جود'))).toBeTruthy();
    expect(screen.getByText('انتهت حلقة واحدة اليوم')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('a row opens the drawer; the toast waits while it is open', async () => {
    renderDash();
    fireEvent.click(await screen.findByRole('button', openRow('جود')));
    expect(screen.getByRole('dialog', { name: 'جود' })).toBeTruthy();
  });

  it('opening a drawer clears the last notice (review: no stale message in the next lesson)', async () => {
    apiSend.mockResolvedValue(HERO);
    renderDash();
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    fireEvent.click(within(hero).getByRole('button', { name: t.teacherBoard.confirm }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.teacherBoard.confirmedOk));
    fireEvent.click(screen.getByRole('button', openRow('جود')));
    const drawer = screen.getByRole('dialog', { name: 'جود' });
    expect(within(drawer).getByRole('status').textContent).toBe('');
  });

  it('a lessons error with nothing cached offers a retry', async () => {
    renderDash(new Error('down'));
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

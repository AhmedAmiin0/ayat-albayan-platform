import { PUBLIC_SETTING_DEFAULTS, type LessonView, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
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
  id: 't-abrar',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: 'https://meet.jit.si/ayat-abrar',
  meeting_mode: null,
  platform_classroom: false,
  students: [{ id: 's-1', code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', status: 'active' }],
};
// Saturday 3 Oct, 12:00 Cairo. Today: 16:00 Cairo; later this week: Monday.
const TODAY = lesson({ id: 'a', starts_at: '2026-10-03T13:00:00.000Z', students: [{ ...SUHAILA, tz: 'Asia/Riyadh' }], meeting_link: null });
const MONDAY = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z', status: 'confirmed' });

const BOARD_CALL = '/teachers/me/lessons?from=2026-09-18T21%3A00%3A00.000Z&to=2026-10-16T21%3A00%3A00.000Z';

/** Today's 16:00 lesson is the hero («الحلقة التالية»); «التفاصيل» opens it in the drawer. */
async function openHero() {
  const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
  fireEvent.click(within(hero).getByRole('button', { name: t.today.details }));
  return { hero, drawer: within(screen.getByRole('dialog', { name: 'سهيلة' })) };
}

/** `auto`: settings.meeting_link_auto in GET /settings/public (the per-teacher flag wins, so it is ignored). */
function renderDash(me: TeacherMe | Error = ME, auto = false, lessons: LessonView[] = [TODAY, MONDAY]) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/teachers/me') return me instanceof Error ? Promise.reject(me) : Promise.resolve(me);
    // An academy that still requires lesson confirmation (the confirm button is asserted below).
    const config = {
      ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto, lesson_confirmation_required: true,
    };
    if (path === '/settings/public') return Promise.resolve(config);
    if (path.startsWith('/teachers/me/lessons')) return Promise.resolve(lessons);
    return Promise.resolve([]);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherDashboard />
    </QueryClientProvider>,
  );
}

describe('TeacherDashboard (R-TCH-03, R-SCH-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('today: the hero leads with «سأحضر»; the drawer has her link, the clock, one cancel', async () => {
    renderDash();
    const { hero, drawer } = await openHero();
    expect(within(hero).getByRole('button', { name: t.teacherBoard.confirm }).className).toContain('bg-primary');
    // Cairo = Riyadh on 3 October (summer time): the student's clock reads the same, no extra line.
    expect(drawer.queryByText(/عند الطالب/)).toBeNull();
    // No link of its own, not platform: the classroom, and her profile link as a peer (owner Q3).
    expect(drawer.getByRole('link', { name: t.teacherDash.joinLink }).getAttribute('href')).toBe(ME.meeting_link);
    // One query: the board window, 14 days back and ahead of today in her zone (docs/46 D4).
    expect(apiFetch).toHaveBeenCalledWith(BOARD_CALL);
    // Her own «إلغاء الحلقة» only (docs/46 C6), never the admin's; no family «تأكيد».
    expect(drawer.getAllByRole('button', { name: t.teacherBoard.cancel })).toHaveLength(1);
    expect(drawer.queryByRole('button', { name: t.lessons.event.confirm })).toBeNull();
  });

  it('«سأحضر» on the hero posts her own confirm and says so', async () => {
    apiSend.mockResolvedValue(TODAY);
    renderDash();
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    fireEvent.click(within(hero).getByRole('button', { name: t.teacherBoard.confirm }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.teacherBoard.confirmedOk));
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/a/confirm-attendance');
  });

  it('«طلابي» (the board) is the first tab; the week tab lists every day', async () => {
    renderDash();
    const table = await screen.findByRole('table', { name: t.teacherBoard.tab });
    expect(screen.getAllByRole('tab')[0]?.getAttribute('aria-selected')).toBe('true');
    expect(within(table).getByRole('button', { name: 'سهيلة' })).toBeTruthy();
    expect(within(table).getByText(t.enums.studentStatus.active)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: t.teacherDash.week }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('the week is the next 7 days from today (on a Friday too), with its dates as a heading', async () => {
    vi.setSystemTime(new Date('2026-10-09T09:00:00.000Z')); // Friday 9 Oct, 12:00 Cairo
    renderDash();
    fireEvent.click(await screen.findByRole('tab', { name: t.teacherDash.week }));
    const from = '2026-09-24T21%3A00%3A00.000Z';
    expect(apiFetch).toHaveBeenCalledWith(`/teachers/me/lessons?from=${from}&to=2026-10-22T21%3A00%3A00.000Z`);
    expect(screen.getByRole('heading', { name: 'من 9 أكتوبر إلى 15 أكتوبر' })).toBeTruthy();
  });

  it('a login without a teachers row is told to call the admin', async () => {
    renderDash(new ApiError(404, { code: 'teacher_not_linked', message: 'teacher_not_linked' }));
    expect(await screen.findByText(t.teacherDash.notLinked)).toBeTruthy();
  });

  it('no hero and no fixed link: the banner says so', async () => {
    renderDash({ ...ME, meeting_link: null }, false, [MONDAY]);
    expect(await screen.findByText(t.teacherDash.noLink)).toBeTruthy();
  });

  it('me.platform_classroom: no banner; the drawer offers the classroom only', async () => {
    const inClassroom = [TODAY, MONDAY].map((l) => ({ ...l, platform_classroom: true }));
    renderDash({ ...ME, platform_classroom: true }, false, inClassroom);
    const { drawer } = await openHero();
    expect(screen.queryByRole('region', { name: t.teacherDash.joinLink })).toBeNull();
    expect(drawer.queryByRole('link', { name: t.teacherDash.join })).toBeNull();
    expect(drawer.queryByRole('link', { name: t.teacherDash.joinLink })).toBeNull();
    expect(drawer.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
  });

  it('academy switch ON but the teacher is static: with no hero, the banner stays', async () => {
    renderDash(ME, true, [{ ...MONDAY, platform_classroom: false }]);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/public'));
    expect(await screen.findByRole('region', { name: t.teacherDash.joinLink })).toBeTruthy();
  });
});

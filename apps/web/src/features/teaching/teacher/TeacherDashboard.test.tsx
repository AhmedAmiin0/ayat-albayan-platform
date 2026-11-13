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

/** «اليوم» is the second tab now (the board leads): open it, then its 16:00 card. */
async function openToday() {
  fireEvent.click(await screen.findByRole('tab', { name: t.teacherDash.today }));
  return screen.findByRole('article', { name: /16:00 سهيلة/ });
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

  it('today: own time, the student clock, the fixed join link and «سأحضر»', async () => {
    renderDash();
    const card = await openToday();
    // Cairo = Riyadh on 3 October (summer time): the student's clock reads the same, no extra line.
    expect(within(card).queryByText(/عند الطالب/)).toBeNull();
    expect(within(card).getByRole('link', { name: t.classroom.joinMeeting }).getAttribute('href')).toBe(ME.meeting_link);
    // One query: the board window, 14 days back and ahead of today in her zone (docs/46 D4).
    expect(apiFetch).toHaveBeenCalledWith(BOARD_CALL);
    // Her own «إلغاء الحلقة» only (docs/46 C6), never the admin's.
    expect(within(card).getAllByRole('button', { name: t.teacherBoard.cancel })).toHaveLength(1);
    expect(within(card).getByRole('button', { name: t.teacherBoard.confirm })).toBeTruthy();
  });

  it('«سأحضر» posts her own confirm (never the family-style one) and says so', async () => {
    apiSend.mockResolvedValue(TODAY);
    renderDash();
    const card = await openToday();
    expect(within(card).queryByRole('button', { name: t.lessons.event.confirm })).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: t.teacherBoard.confirm }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.teacherBoard.confirmedOk));
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/a/confirm-attendance');
  });

  it('«طلابي» (the board) is the first tab; the week tab lists every day', async () => {
    renderDash();
    const table = await screen.findByRole('table', { name: t.teacherBoard.tab });
    expect(screen.getAllByRole('tab')[0]?.getAttribute('aria-selected')).toBe('true');
    expect(within(table).getByRole('link', { name: 'سهيلة' }).getAttribute('href')).toBe('/teacher/students/s-1');
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

  it('no fixed link says so', async () => {
    renderDash({ ...ME, meeting_link: null });
    expect(await screen.findByText(t.teacherDash.noLink)).toBeTruthy();
  });

  it('me.platform_classroom: no fixed link at the top; classroom lessons hide it on the cards', async () => {
    const inClassroom = [TODAY, MONDAY].map((l) => ({ ...l, platform_classroom: true }));
    renderDash({ ...ME, platform_classroom: true }, false, inClassroom);
    const card = await openToday();
    await waitFor(() => expect(screen.queryByRole('region', { name: t.teacherDash.joinLink })).toBeNull());
    expect(within(card).queryByRole('link', { name: t.classroom.joinMeeting })).toBeNull();
    expect(within(card).queryByText(t.lessons.noLink)).toBeNull();
  });

  it('academy switch ON but the teacher is on the fixed link: the top link and card links stay', async () => {
    const fixed = [TODAY, MONDAY].map((l) => ({ ...l, platform_classroom: false }));
    renderDash(ME, true, fixed);
    const card = await openToday();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/public'));
    expect(screen.getByRole('region', { name: t.teacherDash.joinLink })).toBeTruthy();
    expect(within(card).getByRole('link', { name: t.classroom.joinMeeting })).toBeTruthy();
  });
});

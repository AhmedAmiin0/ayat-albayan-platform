import { PUBLIC_SETTING_DEFAULTS, type LessonView, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/schedule/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherDashboard } from './TeacherDashboard';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: (await import('@/features/dashboard/link-mock')).Link,
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

/** `auto`: settings.meeting_link_auto in GET /settings/public (the per-teacher flag wins, so it is ignored). */
function renderDash(me: TeacherMe | Error = ME, auto = false, lessons: LessonView[] = [TODAY, MONDAY]) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/teachers/me') return me instanceof Error ? Promise.reject(me) : Promise.resolve(me);
    if (path === '/settings/public') return Promise.resolve({ ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
    if (path.startsWith('/teachers/me/lessons')) return Promise.resolve(lessons);
    return Promise.resolve([]);
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
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

  it('today: own time, the student clock, the fixed join link and a confirm', async () => {
    renderDash();
    const card = await screen.findByRole('article', { name: /16:00 سهيلة/ });
    expect(within(card).getByText(/عند الطالب 16:00 بتوقيت الرياض/)).toBeTruthy();
    expect(within(card).getByRole('link', { name: t.classroom.joinMeeting }).getAttribute('href')).toBe(ME.meeting_link);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/lessons?from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z');
    expect(within(card).queryByRole('button', { name: t.lessons.cancelSubmit })).toBeNull();
  });

  it('confirming a lesson posts it and says so', async () => {
    apiSend.mockResolvedValue(TODAY);
    renderDash();
    const card = await screen.findByRole('article', { name: /16:00 سهيلة/ });
    fireEvent.click(within(card).getByRole('button', { name: t.lessons.event.confirm }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.lessons.confirmed));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/a/confirm');
  });

  it('the week tab lists every day; the students tab lists my students', async () => {
    renderDash();
    await screen.findByRole('article', { name: /16:00/ });
    fireEvent.click(screen.getByRole('tab', { name: t.teacherDash.week }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: t.teacherDash.myStudents }));
    const table = screen.getByRole('table', { name: t.teacherDash.myStudents });
    expect(within(table).getByRole('cell', { name: 'سهيلة' })).toBeTruthy();
    // Each name opens the student's «سجل التقارير» (R-REP-05).
    expect(within(table).getByRole('link', { name: 'سهيلة' }).getAttribute('href')).toBe('/teacher/reports/s-1');
    expect(within(table).getByText(t.enums.studentStatus.active)).toBeTruthy();
  });

  it('the week is the next 7 days from today (on a Friday too), with its dates as a heading', async () => {
    vi.setSystemTime(new Date('2026-10-09T09:00:00.000Z')); // Friday 9 Oct, 12:00 Cairo
    renderDash();
    fireEvent.click(await screen.findByRole('tab', { name: t.teacherDash.week }));
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/lessons?from=2026-10-08T21%3A00%3A00.000Z&to=2026-10-15T21%3A00%3A00.000Z');
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
    const card = await screen.findByRole('article', { name: /16:00 سهيلة/ });
    await waitFor(() => expect(screen.queryByRole('region', { name: t.teacherDash.joinLink })).toBeNull());
    expect(within(card).queryByRole('link', { name: t.classroom.joinMeeting })).toBeNull();
    expect(within(card).queryByText(t.lessons.noLink)).toBeNull();
  });

  it('academy switch ON but the teacher is on the fixed link: the top link and card links stay', async () => {
    const fixed = [TODAY, MONDAY].map((l) => ({ ...l, platform_classroom: false }));
    renderDash(ME, true, fixed);
    const card = await screen.findByRole('article', { name: /16:00 سهيلة/ });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/public'));
    expect(screen.getByRole('region', { name: t.teacherDash.joinLink })).toBeTruthy();
    expect(within(card).getByRole('link', { name: t.classroom.joinMeeting })).toBeTruthy();
  });
});

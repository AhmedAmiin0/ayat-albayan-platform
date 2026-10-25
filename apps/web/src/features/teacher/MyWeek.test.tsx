import type { TeacherMe } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { lesson } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { MyWeek } from './MyWeek';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
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
  students: [],
};
// Sunday 4 Oct, 17:00 Riyadh.
const SUNDAY = lesson({ id: 'a', starts_at: '2026-10-04T14:00:00.000Z' });
const lessonCalls = () => apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.startsWith('/teachers/me/lessons'));

describe('«جدولي» — my week (R-TCH-03, R-SCH-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    apiFetch.mockImplementation((path: string) => {
      if (path === '/teachers/me') return Promise.resolve(ME);
      if (path.startsWith('/teachers/me/lessons')) return Promise.resolve(path.includes('2026-10-02T21') ? [SUNDAY] : []);
      return Promise.resolve([]);
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('this Riyadh week from my own lessons; a lesson opens my lesson card', async () => {
    renderWithClient(<MyWeek />);
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(lessonCalls()[0]).toBe('/teachers/me/lessons?from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z');
    fireEvent.click(within(grid).getByRole('button', { name: /17:00/ }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('link', { name: t.classroom.joinMeeting }).getAttribute('href')).toBe(ME.meeting_link);
  });

  it('next / this week move the window; an empty week says so', async () => {
    renderWithClient(<MyWeek />);
    await screen.findByRole('table', { name: t.schedule.grid });
    expect(screen.getByRole('button', { name: t.schedule.thisWeek })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextWeek }));
    expect(await screen.findByText(t.teacherDash.noLessonsWeek)).toBeTruthy();
    expect(lessonCalls().at(-1)).toContain('from=2026-10-09T21');
    fireEvent.click(screen.getByRole('button', { name: t.schedule.thisWeek }));
    await waitFor(() => expect(screen.getByRole('table', { name: t.schedule.grid })).toBeTruthy());
  });
});

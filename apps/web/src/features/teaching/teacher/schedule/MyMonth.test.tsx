import { PUBLIC_SETTING_DEFAULTS, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { MyMonth } from './MyMonth';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));

const ME: TeacherMe = {
  id: 't-1', display_name_ar: 'معلمة', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null, platform_classroom: false, students: [],
};
// Saturday 14 November 2026, 09:00 UTC; lessons at midday on the 14th and the 20th.
const TODAY = lesson({ id: 'l-1', starts_at: '2026-11-14T12:00:00.000Z' });
const LATER = lesson({ id: 'l-2', starts_at: '2026-11-20T12:00:00.000Z', students: [{ ...SUHAILA, name: 'جود' }] });

const ANSWERS: [string, unknown][] = [
  ['/teachers/me/lessons', [TODAY, LATER]],
  ['/teachers/me', ME],
];
const answer = (path: string) => ANSWERS.find(([p]) => path.startsWith(p))?.[1] ?? [];

function renderMonth() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-14T09:00:00.000Z'));
  apiFetch.mockImplementation((path: string) => Promise.resolve(answer(path)));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  render(
    <QueryClientProvider client={client}>
      <MyMonth />
    </QueryClientProvider>,
  );
}

const lessonsPath = () => String(apiFetch.mock.calls.find(([p]) => String(p).includes('/lessons?'))?.[0]);

describe('MyMonth «جدولي» month (owner 2026-11-14)', () => {
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('reads one window for the whole grid and counts each day', async () => {
    renderMonth();
    const grid = await screen.findByRole('table', { name: t.teacherSchedule.monthGrid });
    expect(lessonsPath()).toContain('from=2026-10-');
    expect(within(grid).getAllByRole('button')).toHaveLength(35);
    expect(await within(grid).findAllByText('1')).not.toHaveLength(0);
  });

  it("shows today's lessons first, another day's on a tap, and a lesson opens the drawer", async () => {
    renderMonth();
    expect(await screen.findByRole('button', { name: /سهيلة/ })).toBeTruthy();
    const grid = screen.getByRole('table', { name: t.teacherSchedule.monthGrid });
    const day20 = within(grid).getAllByRole('button').find((b) => b.getAttribute('aria-label')?.startsWith('20 '));
    fireEvent.click(day20 ?? grid);
    const row = await screen.findByRole('button', { name: /جود/ });
    expect(screen.queryByRole('button', { name: /سهيلة/ })).toBeNull();
    fireEvent.click(row);
    expect(await screen.findByRole('dialog', { name: /جود/ })).toBeTruthy();
  });

  it('steps a month and back with «هذا الشهر»', async () => {
    renderMonth();
    await screen.findByRole('table', { name: t.teacherSchedule.monthGrid });
    const thisMonth = screen.getByRole('button', { name: t.teacherSchedule.thisMonth });
    expect(thisMonth).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: t.teacherSchedule.nextMonth }));
    expect(thisMonth).toHaveProperty('disabled', false);
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(thisMonth);
    expect(thisMonth).toHaveProperty('disabled', true);
  });
});

import type { TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { CalendarPeriod } from './calendar-search';
import { TeacherCalendar } from './TeacherCalendar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ME: TeacherMe = {
  id: 't-1', display_name_ar: 'معلمة', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null, platform_classroom: false, students: [],
};

function renderCalendar(period: CalendarPeriod) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/teachers/me' ? ME : []));
  const onPeriod = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherCalendar period={period} onPeriod={onPeriod} />
    </QueryClientProvider>,
  );
  return onPeriod;
}

const seg = (name: string) => screen.getByRole('button', { name });

describe('TeacherCalendar «الأسبوع | الشهر» (owner 2026-11-14)', () => {
  it('week: the week grid; the toggle asks for the month', async () => {
    const onPeriod = renderCalendar('week');
    expect(await screen.findByText(t.teacherDash.noLessonsWeek)).toBeTruthy();
    expect(seg(t.teacherSchedule.week).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(seg(t.teacherSchedule.month));
    expect(onPeriod).toHaveBeenCalledWith('month');
  });

  it('month: the month grid with its own arrows, and no availability toggle', async () => {
    renderCalendar('month');
    expect(await screen.findByRole('table', { name: t.teacherSchedule.monthGrid })).toBeTruthy();
    expect(seg(t.teacherSchedule.month).getAttribute('aria-pressed')).toBe('true');
    expect(seg(t.teacherSchedule.nextMonth)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.availability.title })).toBeNull();
  });
});

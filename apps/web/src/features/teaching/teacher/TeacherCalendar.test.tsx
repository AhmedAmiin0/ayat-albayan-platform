import type { TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { CalendarView } from './calendar-search';
import { TeacherCalendar } from './TeacherCalendar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ME: TeacherMe = {
  id: 't-1', display_name_ar: 'معلمة', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null, platform_classroom: false, students: [],
};

function renderCalendar(view: CalendarView) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/teachers/me' ? ME : []));
  const onView = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherCalendar view={view} onView={onView} />
    </QueryClientProvider>,
  );
  return onView;
}

const seg = (name: string) => screen.getByRole('button', { name });

describe('TeacherCalendar «الحلقات | المواعيد المتاحة» (owner 2026-11-14)', () => {
  it('lessons: the week grid; the toggle asks for the availability view', async () => {
    const onView = renderCalendar('lessons');
    expect(await screen.findByText(t.teacherDash.noLessonsWeek)).toBeTruthy();
    expect(seg(t.teacherCalendar.lessons).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(seg(t.availability.title));
    expect(onView).toHaveBeenCalledWith('availability');
  });

  it('availability: her own availability, read for her id', async () => {
    renderCalendar('availability');
    expect(seg(t.availability.title).getAttribute('aria-pressed')).toBe('true');
    await vi.waitFor(() => expect(apiFetch.mock.calls.some(([p]) => String(p).includes('t-1'))).toBe(true));
    expect(screen.queryByText(t.teacherDash.noLessonsWeek)).toBeNull();
  });
});

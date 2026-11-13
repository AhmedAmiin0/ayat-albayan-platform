import type { TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { DashboardPanel, type DashboardPanelProps } from './DashboardPanel';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(() => Promise.resolve([])),
}));
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
  meeting_link: null,
  meeting_mode: null,
  platform_classroom: false,
  students: [],
};
const at = { now: new Date('2026-10-03T09:00:00.000Z'), today: '2026-10-03' };

function renderPanel(lessons: DashboardPanelProps['lessons']) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DashboardPanel tab="today" me={ME} lessons={lessons} at={at} onDone={vi.fn()} onOpen={vi.fn()} />
    </QueryClientProvider>,
  );
}

// docs/48 load-state order: data → error + retry (only with nothing cached) → skeleton.
describe('DashboardPanel data first', () => {
  it('a failed poll over cached lessons keeps the panel', () => {
    renderPanel({ data: [], isError: true, refetch: vi.fn() });
    expect(screen.getByText(t.teacherDash.noLessonsToday)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('an error with nothing cached offers a retry', () => {
    const refetch = vi.fn();
    renderPanel({ data: undefined, isError: true, refetch });
    expect(screen.getByRole('alert').textContent).toContain(t.teacherDash.loadError);
    fireEvent.click(screen.getByRole('button', { name: t.teacherStudents.retry }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('loading shows neither the alert nor the panel', () => {
    renderPanel({ data: undefined, isError: false, refetch: vi.fn() });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(t.teacherDash.noLessonsToday)).toBeNull();
  });
});

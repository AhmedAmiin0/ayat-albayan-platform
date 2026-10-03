import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { lesson } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n';
import { TeacherLessonCard } from './TeacherLessonCard';

const LINK = 'https://meet.jit.si/ayat-abrar'; // the fixture lesson's own link

function card(status: Parameters<typeof lesson>[0]) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherLessonCard lesson={lesson(status)} tz="Africa/Cairo" fallbackLink={null} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

it('«ادخل الحلقة» on an open lesson', () => {
  card({ status: 'confirmed' });
  expect(screen.getByRole('link', { name: t.classroom.joinMeeting }).getAttribute('href')).toBe(LINK);
});

it.each(['rescheduled', 'cancelled_by_admin'] as const)('no way in to a %s lesson (the old slot)', (status) => {
  card({ status });
  expect(screen.queryByRole('link', { name: t.classroom.joinMeeting })).toBeNull();
  expect(screen.queryByText(t.lessons.noLink)).toBeNull();
});

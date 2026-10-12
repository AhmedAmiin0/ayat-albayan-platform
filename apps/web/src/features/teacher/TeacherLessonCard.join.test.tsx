import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { lesson } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import { TeacherLessonCard } from './TeacherLessonCard';

const LINK = 'https://meet.jit.si/ayat-abrar'; // the fixture lesson's own link

/** `auto`: settings.meeting_link_auto as GET /settings/public answered it. */
function card(status: Parameters<typeof lesson>[0], auto = false) {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
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

it('settings.meeting_link_auto: no fixed link and no «no link» note; the platform classroom is the way in', () => {
  card({ status: 'confirmed' }, true);
  expect(screen.queryByRole('link', { name: t.classroom.joinMeeting })).toBeNull();
  expect(screen.queryByText(t.lessons.noLink)).toBeNull();
  expect(screen.getAllByText(t.classroom.enter).length).toBeGreaterThan(0);
});

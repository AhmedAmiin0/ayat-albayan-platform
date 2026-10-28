import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { TeacherLessonCard } from './TeacherLessonCard';

const LINK = 'https://meet.jit.si/ayat-abrar'; // the fixture lesson's own link

/**
 * `over`: the lesson (status, platform_classroom); `auto`: settings.meeting_link_auto as GET
 * /settings/public answered it, which the card ignores (the lesson's own teacher decides).
 */
function card(over: Parameters<typeof lesson>[0], auto = false) {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <TeacherLessonCard lesson={lesson(over)} tz="Africa/Cairo" fallbackLink={null} onDone={vi.fn()} />
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

it('lesson.platform_classroom: no fixed link and no «no link» note; the platform classroom is the way in', () => {
  card({ status: 'confirmed', platform_classroom: true });
  expect(screen.queryByRole('link', { name: t.classroom.joinMeeting })).toBeNull();
  expect(screen.queryByText(t.lessons.noLink)).toBeNull();
  expect(screen.getAllByText(t.classroom.enter).length).toBeGreaterThan(0);
});

it('academy switch ON but the lesson is on the fixed link (its teacher is static): the link shows', () => {
  card({ status: 'confirmed', platform_classroom: false }, true);
  expect(screen.getByRole('link', { name: t.classroom.joinMeeting }).getAttribute('href')).toBe(LINK);
});

it('docs/07 «الأزرار»: the actions stack in one column (no wrapped row of mixed buttons)', () => {
  card({ status: 'confirmed' });
  const column = screen.getByRole('link', { name: t.classroom.joinMeeting }).parentElement;
  expect(column?.className).toContain('grid');
  expect(column?.className).not.toContain('flex-wrap');
});

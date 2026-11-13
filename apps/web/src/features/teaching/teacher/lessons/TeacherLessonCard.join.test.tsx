import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { TeacherLessonCard } from './TeacherLessonCard';

const LINK = 'https://meet.jit.si/ayat-abrar'; // the fixture lesson's own link
const MINE = 'https://meet.jit.si/ayat-mine'; // her profile link

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z')); // the lesson is tomorrow
});
afterEach(() => vi.useRealTimers());

/** `over`: the lesson; `auto`: settings.meeting_link_auto (the lesson's own teacher wins). */
function card(over: Parameters<typeof lesson>[0], auto = false) {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <TeacherLessonCard lesson={lesson(over)} tz="Africa/Cairo" fallbackLink={MINE} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

const classroom = () => screen.queryByRole('button', { name: t.classroom.enter });
const more = () => screen.queryByRole('button', { name: t.common.more });

it('her own link on a static lesson: one «ادخل الحلقة», no classroom, no copy (owner Q3)', () => {
  card({ status: 'confirmed', platform_classroom: false });
  const links = screen.getAllByRole('link', { name: t.teacherDash.join });
  expect(links.map((a) => a.getAttribute('href'))).toEqual([LINK]);
  expect(classroom()).toBeNull();
  expect(screen.queryByRole('button', { name: t.classroom.openNow })).toBeNull();
  expect(more()).toBeNull();
});

it('no link of its own: the classroom, her profile link as a peer, «انسخ رابط الطالب» under «المزيد»', () => {
  card({ status: 'confirmed', platform_classroom: false, meeting_link: null });
  expect(classroom()).toBeTruthy();
  expect(screen.getByRole('link', { name: t.teacherDash.joinLink }).getAttribute('href')).toBe(MINE);
  expect(more()).toBeTruthy();
});

it('a platform lesson: the classroom only', () => {
  card({ status: 'confirmed', platform_classroom: true });
  expect(classroom()).toBeTruthy();
  expect(screen.queryByRole('link', { name: t.teacherDash.join })).toBeNull();
  expect(screen.queryByRole('link', { name: t.teacherDash.joinLink })).toBeNull();
});

it.each(['rescheduled', 'cancelled_by_admin'] as const)('no way in to a %s lesson (the old slot)', (status) => {
  card({ status });
  expect(screen.queryByRole('link', { name: t.teacherDash.join })).toBeNull();
  expect(classroom()).toBeNull();
});

it('docs/07 §6: while live, one filled control («ادخل الحلقة»), the report a peer', () => {
  vi.setSystemTime(new Date('2026-10-04T14:10:00.000Z'));
  card({ status: 'confirmed', platform_classroom: false });
  expect(screen.getByRole('link', { name: t.teacherDash.join }).className).toContain('bg-primary');
  expect(screen.getByRole('link', { name: t.reports.open }).className).not.toContain('bg-primary');
  expect(document.querySelectorAll('.bg-primary')).toHaveLength(1);
});

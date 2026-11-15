import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { lesson } from './lesson-fixture';
import { LessonDetails } from './LessonDetails';

/**
 * The drawer's lesson details: `platform` is lesson.platform_classroom (its teacher's mode); `auto` is
 * settings.meeting_link_auto as GET /settings/public answered it, which the row ignores.
 */
function details(platform: boolean | undefined, auto = false) {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <LessonDetails lesson={lesson({ platform_classroom: platform })} />
    </QueryClientProvider>,
  );
}

const joinLink = () => screen.queryByRole('link', { name: new RegExp(t.lessons.join) });

it('the lesson link row shows the copied fixed link', () => {
  details(false);
  expect(joinLink()?.getAttribute('href')).toBe('https://meet.jit.si/ayat-abrar');
});

it('lesson.platform_classroom: the row says the lesson is held in the platform classroom', () => {
  details(true);
  expect(screen.getByText(t.lessons.viaClassroom)).toBeTruthy();
  expect(joinLink()).toBeNull();
});

it('academy switch ON but the lesson is on the fixed link: the link shows', () => {
  details(false, true);
  expect(joinLink()?.getAttribute('href')).toBe('https://meet.jit.si/ayat-abrar');
  expect(screen.queryByText(t.lessons.viaClassroom)).toBeNull();
});

it('a payload cached without platform_classroom: the academy default decides', () => {
  details(undefined, true);
  expect(screen.getByText(t.lessons.viaClassroom)).toBeTruthy();
  expect(joinLink()).toBeNull();
});

it('a payload cached without platform_classroom, academy default OFF: the fixed link', () => {
  details(undefined, false);
  expect(joinLink()).toBeTruthy();
});

import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import { lesson } from './lesson-fixture';
import { LessonDetails } from './LessonDetails';

/** The drawer's lesson details with settings.meeting_link_auto as GET /settings/public answered it. */
function details(auto: boolean) {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <LessonDetails lesson={lesson()} />
    </QueryClientProvider>,
  );
}

const joinLink = () => screen.queryByRole('link', { name: new RegExp(t.lessons.join) });

it('the lesson link row shows the copied fixed link', () => {
  details(false);
  expect(joinLink()?.getAttribute('href')).toBe('https://meet.jit.si/ayat-abrar');
});

it('settings.meeting_link_auto: the row says the lesson is held in the platform classroom', () => {
  details(true);
  expect(screen.getByText(t.lessons.viaClassroom)).toBeTruthy();
  expect(joinLink()).toBeNull();
});

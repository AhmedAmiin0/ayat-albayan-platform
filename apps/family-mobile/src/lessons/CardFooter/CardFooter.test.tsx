import { PUBLIC_CONFIG_QUERY_KEY, PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { CardFooter } from './CardFooter';

jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual('@ab/mobile-kit/room'),
  useNativeRoom: () => ({ data: {} }),
}));

const now = new Date('2026-11-16T10:00:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12', locale: 'ar' } as const;
const N = t.portal.app.lesson;
const inAppClient = () => {
  const client = freshQueryClient();
  const config = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, family_meetings_in_app: true };
  client.setQueryData(PUBLIC_CONFIG_QUERY_KEY, config);
  return client;
};
const show = (l: ReturnType<typeof lesson>, live: boolean, client = freshQueryClient()) =>
  renderWithQuery(
    <CardFooter
      lesson={l}
      student={student()}
      clock={clock}
      now={now}
      live={live}
      onNotice={jest.fn()}
    />,
    client,
  );

const ownLesson = () =>
  lesson(now, 24 * 60, {
    status: 'scheduled',
    family: { group: false, counts: false, request: null },
  });

test('a classroom lesson, not live: the browser room note and the options menu', async () => {
  await show(ownLesson(), false);
  expect(screen.getByText(N.roomNote)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.portal.actions.menuTitle })).toBeTruthy();
});

test('live and opened in the app: the mic-on note instead of the browser one', async () => {
  await show(lesson(now, -4), true, inAppClient());
  expect(screen.getByText(N.roomNoteLive)).toBeTruthy();
  expect(screen.queryByText(N.roomNote)).toBeNull();
});

test('live but the app does not open rooms: still the browser room note', async () => {
  await show(lesson(now, -4), true);
  expect(screen.getByText(N.roomNote)).toBeTruthy();
});

test('a lesson outside our classroom: no room note', async () => {
  await show(
    lesson(now, 60, { way_in: 'external', meeting_url: 'https://meet.example.com/x' }),
    false,
  );
  expect(screen.queryByText(N.roomNote)).toBeNull();
  expect(screen.queryByText(N.roomNoteLive)).toBeNull();
});

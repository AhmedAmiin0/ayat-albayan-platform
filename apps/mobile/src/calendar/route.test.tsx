import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TabStack } from '@/core/nav/TabStack';
import TabsLayout from '../../app/(tabs)/_layout';

// The More tab's stack gets the teacher calendar and «الجدول» (a static route beside teachers/[id]).
// The tabs' permission and badge reads need the API: allow everything, no badge, in this routing test.
jest.mock('@/auth/use-permissions', () => ({ usePermissions: () => () => true }));
jest.mock('@/core/nav/use-inbox-badge', () => ({ useInboxBadge: () => undefined }));
jest.mock('@/core/push/usePushRegistration', () => ({ usePushRegistration: () => undefined }));

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: TabsLayout,
  index: stub('today-screen'),
  schedule: stub('schedule-tab'),
  'inbox/_layout': TabStack,
  'inbox/index': stub('inbox-screen'),
  'students/_layout': TabStack,
  'students/index': stub('students-screen'),
  'more/_layout': TabStack,
  'more/index': stub('more-screen'),
  'more/teachers/[id]': stub('teacher-screen'),
  'more/teachers/schedule': stub('day-schedule'),
  'more/teachers/calendar/[id]': stub('teacher-calendar'),
};

async function open(initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return pending.getPathname();
}

test('a teacher calendar opens inside the More tab', async () => {
  expect(await open('/more/teachers/calendar/t1')).toBe('/more/teachers/calendar/t1');
  expect(screen.getByText('teacher-calendar')).toBeTruthy();
  expect(screen.getByRole('button', { selected: true, name: t.mobile.more })).toBeTruthy();
});

test('«الجدول» is a tab of its own, after اليوم', async () => {
  expect(await open('/schedule')).toBe('/schedule');
  expect(screen.getByText('schedule-tab')).toBeTruthy();
  expect(screen.getByRole('button', { selected: true, name: t.schedule.nav })).toBeTruthy();
});

test('«الجدول» under More is its own screen, not a teacher id', async () => {
  expect(await open('/more/teachers/schedule')).toBe('/more/teachers/schedule');
  expect(screen.getByText('day-schedule')).toBeTruthy();
  await open('/more/teachers/t1');
  expect(screen.getByText('teacher-screen')).toBeTruthy();
});

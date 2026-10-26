import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TabStack } from '@/core/nav/TabStack';
import TabsLayout from '../../../app/(tabs)/_layout';
import MakeupRoute from '../../../app/(tabs)/students/makeup/[lessonId]';
import { makeupParams } from '../makeup/makeup-draft';
import { lesson, yusuf } from '@/today/testing/fixtures';

// The makeup wizard is a screen of the Students tab's stack, so the root stack's admin gate
// (Stack.Protected on (tabs)) covers it: a teacher never reaches it.
// The tabs' permission and badge reads need the API: allow everything, no badge, in this routing test.
jest.mock('@/auth/use-permissions', () => ({ usePermissions: () => () => true }));
jest.mock('@/core/nav/use-inbox-badge', () => ({ useInboxBadge: () => undefined }));
jest.mock('@/core/push/usePushRegistration', () => ({ usePushRegistration: () => undefined }));
jest.mock('../makeup/MakeupWizard', () => ({
  MakeupWizard: ({ source }: { source: { studentName: string; durationMin: number } }) => {
    const { Text: T } = jest.requireActual('react-native');
    return <T>{`wizard:${source.studentName}:${source.durationMin}`}</T>;
  },
}));

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: TabsLayout,
  index: stub('today-screen'),
  schedule: stub('schedule-tab'),
  'inbox/_layout': TabStack,
  'inbox/index': stub('inbox-screen'),
  'students/_layout': TabStack,
  'students/index': stub('students-screen'),
  'students/makeup/[lessonId]': MakeupRoute,
  'more/_layout': TabStack,
  'more/index': stub('more-screen'),
};

const missed = lesson({ id: 'm1', status: 'no_show' });
// The lesson id travels in the path (router.push fills [lessonId] from params); the rest as query.
const { lessonId, ...rest } = makeupParams(missed, yusuf);
const query = new URLSearchParams(rest).toString();

test('a missed lesson’s row opens the makeup wizard with its facts', async () => {
  const pending = renderRouter(app, { initialUrl: `/students/makeup/${lessonId}?${query}` });
  await pending;
  expect(pending.getPathname()).toBe('/students/makeup/m1');
  expect(screen.getByText('wizard:يوسف أحمد:45')).toBeTruthy();
});

test('a link without the lesson’s facts says «مش لاقيين» instead of guessing', async () => {
  const pending = renderRouter(app, { initialUrl: '/students/makeup/m1' });
  await pending;
  expect(screen.getByText(t.common.notFound)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.booking.makeup.title })).toBeTruthy();
});

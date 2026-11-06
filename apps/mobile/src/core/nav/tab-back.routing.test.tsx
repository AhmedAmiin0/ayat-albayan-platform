import { QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pushInTab } from '@/core/nav/back-within';
import { TabStack, tabStackSettings } from '@/core/nav/TabStack';
import { AppNativeTabs } from '@/core/ui/layout/AppNativeTabs';
import { StudentScreen } from '@/students/screens/StudentScreen';
import { createTestQueryClient } from '@/test/query';

// The real tab stacks and StudentScreen (its profile still loading) under the real tabs.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const client = createTestQueryClient();
const stub = (label: string) => () => <Text>{label}</Text>;
const TABS = [
  { name: 'index', title: 'today', icon: 'today' },
  { name: 'students', title: 'students', icon: 'students' },
  { name: 'more', title: 'more', icon: 'more' },
] as const;
const tabStack = { default: TabStack, unstable_settings: tabStackSettings };
const app = {
  _layout: () => (
    <QueryClientProvider client={client}>
      <AppNativeTabs tabs={TABS} />
    </QueryClientProvider>
  ),
  index: stub('today-screen'),
  'students/_layout': tabStack,
  'students/index': stub('students-list'),
  'students/[id]': StudentScreen,
  'more/_layout': tabStack,
  'more/index': stub('more-list'),
  'more/teachers/[id]': stub('teacher-detail'),
};

async function open(initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return () => pending.getPathname();
}

const go = (move: () => void) => act(async () => move());
const pressHeaderBack = () => fireEvent.press(screen.getByRole('button', { name: t.common.back }));

afterEach(() => jest.restoreAllMocks());

test('StudentScreen alone in its tab (pushed from Today): header back opens the students list', async () => {
  const path = await open('/');
  await go(() => router.push('/students/s1'));
  expect(path()).toBe('/students/s1');
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(screen.getByText('students-list')).toBeTruthy();
});

test('StudentScreen opened from the list: header back pops to it', async () => {
  const path = await open('/students');
  const replace = jest.spyOn(router, 'replace');
  await go(() => router.push('/students/s1'));
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(replace).not.toHaveBeenCalled();
});

test('a cross-tab pushInTab loads the list beneath: back pops to it', async () => {
  const path = await open('/');
  await go(() => pushInTab('/students/s1'));
  expect(router.canDismiss()).toBe(true);
  const replace = jest.spyOn(router, 'replace');
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(replace).not.toHaveBeenCalled();
});

import { router } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { TabStack, tabStackSettings } from '@/core/nav/TabStack';
import { AppNativeTabs } from '@/core/ui/layout/AppNativeTabs';
import { trackBackPress } from '@/test/back-press';

// Android's back on the real tabs and tab stacks (stub screens).
const stub = (label: string) => () => <Text>{label}</Text>;
const TABS = [
  { name: 'index', title: 'today', icon: 'today' },
  { name: 'students', title: 'students', icon: 'students' },
  { name: 'more', title: 'more', icon: 'more' },
] as const;
const tabStack = { default: TabStack, unstable_settings: tabStackSettings };
const app = {
  _layout: () => <AppNativeTabs tabs={TABS} />,
  index: stub('today-screen'),
  'students/_layout': tabStack,
  'students/index': stub('students-list'),
  'students/[id]': stub('student-detail'),
  'more/_layout': tabStack,
  'more/index': stub('more-list'),
  'more/teachers/[id]': stub('teacher-detail'),
};

async function open(initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return () => pending.getPathname();
}

let pressBack: () => void = () => undefined;
const go = (move: () => void) => act(async () => move());

beforeEach(() => {
  pressBack = trackBackPress();
});
afterEach(() => jest.restoreAllMocks());

test('a lone student detail (pushed from Today): Android back opens the students list', async () => {
  const path = await open('/');
  await go(() => router.push('/students/s1'));
  await go(pressBack);
  expect(path()).toBe('/students');
  expect(screen.getByText('students-list')).toBeTruthy();
});

test('a lone detail in the more tab: Android back opens the more list, not Today', async () => {
  const path = await open('/');
  await go(() => router.push('/more/teachers/t1'));
  await go(pressBack);
  expect(path()).toBe('/more');
  expect(screen.getByText('more-list')).toBeTruthy();
});

test('a detail opened from its list: Android back pops to the list', async () => {
  const path = await open('/students');
  await go(() => router.push('/students/s1'));
  await go(pressBack);
  expect(path()).toBe('/students');
});

test('the tab list itself: Android back keeps going to Today', async () => {
  const path = await open('/');
  await go(() => router.navigate('/students'));
  await go(pressBack);
  expect(path()).toBe('/');
  expect(screen.getByText('today-screen')).toBeTruthy();
});

test('a deep link or a push tap on a detail screen: Android back opens its tab list', async () => {
  const path = await open('/more/teachers/t1');
  await go(pressBack);
  expect(path()).toBe('/more');
});

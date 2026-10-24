import { Tabs } from 'expo-router/js-tabs';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/lib/i18n';
import { AppNativeTabs, type TabItem } from './AppNativeTabs';
import { GlassTabBar } from './GlassTabBar';
import { useTabBarInset } from './tab-bar-inset';

// The real tabs + glass bar over stub screens; each screen prints the bar inset it is given.
const TABS: TabItem[] = [
  { name: 'a', title: 'a', icon: 'today' },
  { name: 'b', title: 'b', icon: 'inbox', badge: '3' },
  { name: 'c', title: 'c', icon: 'students', hidden: true },
  { name: 'd', title: 'd', icon: 'more' },
];
function Plain() {
  const inset = useTabBarInset();
  return <Text>{`inset ${inset}`}</Text>;
}
const screens = { a: Plain, b: Plain, c: Plain, d: Plain };
const app = { _layout: () => <AppNativeTabs tabs={TABS} />, ...screens };
// The bar with `hidden` set, as AppNativeTabs sets it while a chat is open (useHideTabBar; that path
// end to end: inbox/tab-bar.flow.test.tsx). No import of ./tab-bar here: a branch deletes it.
const hiddenBar = {
  _layout: () => (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} tabs={TABS} hidden />}
    />
  ),
  ...screens,
};

async function open(routes: typeof app, initialUrl: string) {
  const pending = renderRouter(routes, { initialUrl });
  await pending;
  return { pathname: () => pending.getPathname() };
}
const names = () => screen.getAllByRole('button').map((tab) => tab.props.accessibilityLabel);

test('the tabs in order, the hidden one off the bar, a count in its tab’s name', async () => {
  await open(app, '/a');
  expect(names()).toEqual(['a', t.mobileNav.tabUnread.replace('{title}', 'b').replace('{n}', '3'), 'd']);
  expect(screen.getByRole('button', { selected: true }).props.accessibilityLabel).toBe('a');
  // The tab bar container for VoiceOver (UIAccessibilityTraitTabBar); the tabs inside stay one by one.
  expect(screen.getByLabelText(t.mobileNav.tabsLabel).props.accessibilityRole).toBe('tabbar');
});

test('the screens know how far the bar reaches: a 16pt gap (no inset in jest) + the 64pt capsule', async () => {
  await open(app, '/a');
  expect(await screen.findByText('inset 80')).toBeTruthy();
});

test('a tap opens its tab; a tap on the open tab stays there', async () => {
  const router = await open(app, '/a');
  await fireEvent.press(screen.getByRole('button', { name: 'a' }));
  expect(router.pathname()).toBe('/a');
  await fireEvent.press(screen.getByRole('button', { name: /^b/ }));
  expect(router.pathname()).toBe('/b');
  expect(screen.getByRole('button', { selected: true }).props.accessibilityLabel).toMatch(/^b/);
});

test('hidden (a chat open): no bar and no inset, so no dead strip is left', async () => {
  await open(hiddenBar, '/a');
  expect(await screen.findByText('inset 0')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryByLabelText(t.mobileNav.tabsLabel)).toBeNull();
});

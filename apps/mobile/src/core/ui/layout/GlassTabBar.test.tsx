import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppNativeTabs, type TabItem } from './AppNativeTabs';
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

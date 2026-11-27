import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Tabs } from 'expo-router/js-tabs';
import { Dimensions, Text } from 'react-native';
import type { TabItem } from '../../AppNativeTabs';
import { GlassTabBar } from '../GlassTabBar';

// The bar mounted straight on expo-router's tabs, with a listener that may cancel a tab press.
const TABS: TabItem[] = [
  { name: 'a', title: 'a', icon: 'today' },
  { name: 'b', title: 'b', icon: 'inbox' },
  { name: 'c', title: 'c', icon: 'more' },
];
const stub = () => <Text>screen</Text>;
const pressed = jest.fn<undefined, [string]>();

function Layout({ blocked }: { blocked: string }) {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} tabs={TABS} />}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={{
            tabPress: (event) => {
              pressed(tab.name);
              const cancel = { [blocked]: () => event.preventDefault() }[tab.name];
              cancel?.();
            },
          }}
        />
      ))}
    </Tabs>
  );
}

async function open(blocked: string) {
  const app = { _layout: () => <Layout blocked={blocked} />, a: stub, b: stub, c: stub };
  const pending = renderRouter(app, { initialUrl: '/a' });
  await pending;
  return () => pending.getPathname();
}

afterEach(() => pressed.mockClear());

test('a press on another tab tells its listener, then opens it', async () => {
  const pathname = await open('none');
  await fireEvent.press(screen.getByRole('button', { name: 'c' }));
  expect(pressed.mock.calls).toEqual([['c']]);
  expect(pathname()).toBe('/c');
});

test('a press its listener cancels stays on the open tab', async () => {
  const pathname = await open('b');
  await fireEvent.press(screen.getByRole('button', { name: 'b' }));
  expect(pressed.mock.calls).toEqual([['b']]);
  expect(pathname()).toBe('/a');
});

test('a press on the open tab tells its listener and stays', async () => {
  const pathname = await open('none');
  await fireEvent.press(screen.getByRole('button', { name: 'a' }));
  expect(pressed.mock.calls).toEqual([['a']]);
  expect(pathname()).toBe('/a');
});

test('the pill is one tab wide: the capsule less its sides and padding, split per route', async () => {
  await open('none');
  const width = (Dimensions.get('window').width - 2 * 20 - 8) / TABS.length;
  expect(screen.getByTestId('tab-pill')).toHaveStyle({ width });
});

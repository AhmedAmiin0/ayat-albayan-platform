import { renderRouter, screen, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { glass, palette } from '@/theme';
import { AppNativeTabs, type TabItem } from './AppNativeTabs';

// The capsule «like iOS» (docs/29 §7): where it floats, its active capsule, and that nothing around
// it swallows taps meant for the screen (the Android dead strip, react-native-screens #4132).
const TABS: TabItem[] = [
  { name: 'a', title: 'a', icon: 'today' },
  { name: 'b', title: 'b', icon: 'inbox', badge: '3' },
  { name: 'c', title: 'c', icon: 'students', hidden: true },
  { name: 'd', title: 'd', icon: 'more' },
];
const stub = () => <Text>screen</Text>;
const app = { _layout: () => <AppNativeTabs tabs={TABS} />, a: stub, b: stub, c: stub, d: stub };

test('floats 20pt from both sides and 24pt above the safe area: 62pt high, fully rounded, 0.5pt edge', async () => {
  await renderRouter(app, { initialUrl: '/a' });
  expect(screen.getByTestId('glass-capsule')).toHaveStyle({
    start: 20,
    end: 20,
    bottom: 24,
    height: 62,
    borderRadius: 31,
    padding: 4,
    borderWidth: 0.5,
    borderColor: glass.light.border,
    boxShadow: glass.light.shadow,
  });
});

test('the active tab sits on a 54pt grey capsule, tinted lapis; the count stays on its tab', async () => {
  await renderRouter(app, { initialUrl: '/b' });
  expect(screen.getByTestId('tab-pill')).toHaveStyle({
    top: 4,
    bottom: 4,
    borderRadius: 27,
    backgroundColor: glass.light.pill.fill,
    boxShadow: glass.light.pill.shadow,
  });
  const active = screen.getByRole('button', { selected: true });
  expect(within(active).getByText('b')).toHaveStyle({ color: palette.light.lapis, fontSize: 11 });
  expect(within(active).getByText('3', { includeHiddenElements: true })).toBeTruthy();
  // The role-hidden tab stays off the bar.
  expect(screen.queryByRole('button', { name: 'c' })).toBeNull();
});

test('no dead strip: the fade behind the capsule lets every touch through to the screen', async () => {
  await renderRouter(app, { initialUrl: '/a' });
  expect(screen.getByTestId('tab-edge')).toHaveStyle({ pointerEvents: 'none' });
  // The capsule is the only touch target of the bar: inset from both sides, nothing spans the width.
  const capsule = screen.getByTestId('glass-capsule');
  expect(capsule).not.toHaveStyle({ start: 0 });
  expect(capsule).not.toHaveStyle({ end: 0 });
  expect(within(capsule).getAllByRole('button')).toHaveLength(3);
});

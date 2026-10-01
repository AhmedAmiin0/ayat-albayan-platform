import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/lib/i18n';
import { TabStack } from '@/nav/TabStack';
import TabsLayout from '../../app/(tabs)/_layout';
import RootLayout from '../../app/_layout';

// The real root + tabs layouts with stub screens: proves the gate decides what can be reached.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/auth/use-auth-gate', () => {
  const { useState } = jest.requireActual('react');
  const gate = { initial: 'out', set: (() => undefined) as (mockStatus: string) => void };
  return {
    mockGate: gate,
    useAuthGate: () => {
      const [status, set] = useState(gate.initial);
      gate.set = set;
      return status;
    },
  };
});
const { mockGate } = jest.requireMock('@/auth/use-auth-gate') as {
  mockGate: { initial: string; set: (s: string) => void };
};

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('today-screen'),
  '(tabs)/inbox/_layout': TabStack,
  '(tabs)/inbox/index': stub('inbox-screen'),
  '(tabs)/students/_layout': TabStack,
  '(tabs)/students/index': stub('students-screen'),
  '(tabs)/more/_layout': TabStack,
  '(tabs)/more/index': stub('more-screen'),
};

afterEach(() => jest.useRealTimers());

/** RNTL 14 renders asynchronously, so renderRouter hands back the pending render with getters on it. */
async function open(initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return { pathname: () => pending.getPathname() };
}

test('signed out: every route lands on /login', async () => {
  mockGate.initial = 'out';
  const router = await open('/students');
  expect(screen.getByText('login-screen')).toBeTruthy();
  expect(router.pathname()).toBe('/login');
});

test('admin: tabs in RTL order النهارده، المحادثات، الطلاب، المزيد', async () => {
  mockGate.initial = 'admin';
  const router = await open('/');
  expect(screen.getByText('today-screen')).toBeTruthy();
  expect(router.pathname()).toBe('/');
  // Arabic-only names (React Navigation would append an English «tab, 1 of 4»).
  const tabs = screen.getAllByRole('button'); // the stub screens have none: these are the tabs
  expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
    t.mobile.today,
    t.nav.leads,
    t.nav.students,
    t.mobile.more,
  ]);
  expect(screen.getByRole('button', { selected: true, name: t.mobile.today })).toBeTruthy();
});

test('admin cannot sit on /login', async () => {
  mockGate.initial = 'admin';
  const router = await open('/login');
  expect(router.pathname()).toBe('/');
});

test('the gate flipping moves the screen: sign-in opens the tabs, sign-out returns to login', async () => {
  mockGate.initial = 'out';
  const router = await open('/');
  expect(router.pathname()).toBe('/login');
  await act(async () => mockGate.set('admin'));
  expect(screen.getByText('today-screen')).toBeTruthy();
  await act(async () => mockGate.set('out'));
  expect(screen.getByText('login-screen')).toBeTruthy();
  expect(router.pathname()).toBe('/login');
});

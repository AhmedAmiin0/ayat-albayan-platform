import { render as renderRaw, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient, pathKey } from '@ab/mobile-kit';
import { fullAccessMe } from '@/test/staff-me';
import RootLayout from '../../../../../app/_layout';

// The startup is interactive once a signed-in tree can render whole (fonts, session, /auth/me):
// never on the sign-in screen or while the session or profile is still unknown.
const mockGate = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@ab/mobile-kit/auth/use-auth-gate', () => ({ useAuthGate: () => mockGate() }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => {
  const { createElement, Fragment } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Stack = () => createElement(Text, null, 'stack');
  Stack.Protected = ({ children }: { children: unknown }) =>
    createElement(Fragment, null, children);
  Stack.Screen = () => null;
  return { Stack };
});

const MARKER = 'observe-interactive';
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const render = () =>
  renderRaw(
    <SafeAreaProvider initialMetrics={metrics}>
      <RootLayout />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  queryClient.clear();
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
});

test('the mark comes once when the signed-in tree is ready', async () => {
  mockGate.mockReturnValue('admin');
  queryClient.setQueryData(pathKey('/auth/me'), fullAccessMe('admin'));
  await render();
  expect(screen.getByText('stack')).toBeTruthy();
  expect(screen.getAllByTestId(MARKER)).toHaveLength(1);
});

test('no mark on the sign-in screen', async () => {
  mockGate.mockReturnValue('out');
  await render();
  expect(screen.getByText('stack')).toBeTruthy();
  expect(screen.queryByTestId(MARKER)).toBeNull();
});

test('no mark while the profile is still loading', async () => {
  mockGate.mockReturnValue('teacher');
  await render();
  expect(screen.queryByText('stack')).toBeNull();
  expect(screen.queryByTestId(MARKER)).toBeNull();
});

test('no mark while the stored session is being checked', async () => {
  mockGate.mockReturnValue('booting');
  await render();
  expect(screen.queryByTestId(MARKER)).toBeNull();
});

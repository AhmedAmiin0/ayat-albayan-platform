import { render, screen } from '@testing-library/react-native';
import RootLayout from '../app/_layout';

// Fonts and the auth gate are mocked: the root layout's waiting is what is tested here
// (src/nav/routing.test.tsx drives the real router through the gate).
const mockUseFonts = jest.fn();
const mockGate = jest.fn();
jest.mock('expo-font', () => ({ useFonts: (map: object) => mockUseFonts(map) }));
jest.mock('@/auth/use-auth-gate', () => ({ useAuthGate: () => mockGate() }));
jest.mock('expo-router', () => {
  const { createElement, Fragment } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Stack = () => createElement(Text, null, 'stack');
  Stack.Protected = ({ children }: { children: unknown }) =>
    createElement(Fragment, null, children);
  Stack.Screen = () => null;
  return { Stack };
});

beforeEach(() => mockGate.mockReturnValue('admin'));

test('loads the four Noto Sans Arabic weights named in the theme', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(Object.keys(mockUseFonts.mock.calls[0][0]).sort()).toEqual([
    'NotoSansArabic_400Regular',
    'NotoSansArabic_500Medium',
    'NotoSansArabic_600SemiBold',
    'NotoSansArabic_700Bold',
  ]);
  expect(screen.getByText('stack')).toBeTruthy();
});

test('renders nothing until the fonts are loaded', async () => {
  mockUseFonts.mockReturnValue([false, null]);
  await render(<RootLayout />);
  expect(screen.queryByText('stack')).toBeNull();
});

test('a font error still opens the app with the system font', async () => {
  mockUseFonts.mockReturnValue([false, new Error('font')]);
  await render(<RootLayout />);
  expect(screen.getByText('stack')).toBeTruthy();
});

test('renders nothing while the stored session is being checked (no login flash)', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  mockGate.mockReturnValue('booting');
  await render(<RootLayout />);
  expect(screen.queryByText('stack')).toBeNull();
});

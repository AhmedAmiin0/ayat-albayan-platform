import { render, screen } from '@testing-library/react-native';
import RootLayout from '../app/_layout';

// Fonts are mocked: the gate is what is tested, not expo-font.
const mockUseFonts = jest.fn();
jest.mock('expo-font', () => ({ useFonts: (map: object) => mockUseFonts(map) }));
jest.mock('expo-router', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { Stack: () => createElement(Text, null, 'stack') };
});

test('loads Amiri 700 and the four Plex weights named in the theme', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(Object.keys(mockUseFonts.mock.calls[0][0]).sort()).toEqual([
    'Amiri_700Bold',
    'IBMPlexSansArabic_400Regular',
    'IBMPlexSansArabic_500Medium',
    'IBMPlexSansArabic_600SemiBold',
    'IBMPlexSansArabic_700Bold',
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

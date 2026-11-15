import { act, render, screen } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { palette } from '../../theme';
import { BrandStartupScreen } from './BrandStartupScreen';
import type { StartupBrand } from './startup-brand';

// An app's own cover (the family app): the native splash's image at its size in the exact centre
// on its colour, the wordmark under it, the status in the brand's ink; no spinner.
jest.useFakeTimers();
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const scheme = jest.mocked(useColorScheme);
const brand: StartupBrand = {
  mark: 1,
  markSize: 160,
  title: 'Ayat Al-Bayan',
  subtitle: 'آيات البيان',
  tone: {
    light: {
      background: palette.light.coverInk,
      ink: palette.light.leather,
      accent: palette.light.goldSoft,
    },
    dark: { background: palette.dark.cover, ink: palette.dark.coverInk, accent: palette.dark.gold },
  },
};
const open = () =>
  render(<BrandStartupScreen brand={brand} mode="loading" onRetry={jest.fn()} fontsLoaded />);

test('the mark at the splash size in the centre, on the splash colour; the wordmark under it', async () => {
  await open();
  const mark = screen.getByTestId('startup-mark', { includeHiddenElements: true });
  expect(screen.getByTestId('startup-screen')).toHaveStyle({
    backgroundColor: palette.light.coverInk,
  });
  expect(mark).toHaveStyle({ width: 160, height: 160 });
  expect(screen.getByText('Ayat Al-Bayan')).toHaveStyle({
    color: palette.light.leather,
    letterSpacing: -0.6,
  });
  expect(screen.getByText('آيات البيان')).toBeOnTheScreen();
  expect(screen.queryByTestId('connecting-ring')).toBeNull();
});

test('«جارٍ الاتصال» in the brand ink; the retry at 10 s', async () => {
  await open();
  const status = screen.getByText(t.mobile.connection.startupConnecting);
  expect(status).toHaveStyle({ color: palette.light.leather });
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole('button', { name: t.mobile.connection.retry })).toBeOnTheScreen();
});

test('dark: the dark splash colour', async () => {
  scheme.mockReturnValue('dark');
  await open();
  expect(screen.getByTestId('startup-screen')).toHaveStyle({ backgroundColor: palette.dark.cover });
  scheme.mockReturnValue('light');
});

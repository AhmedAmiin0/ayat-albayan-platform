import { render, screen } from '@testing-library/react-native';
import { I18nManager, useColorScheme } from 'react-native';
import { palette } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import { ExpoHost, NativeSlot } from '..';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const scheme = jest.mocked(useColorScheme);

const setRtl = (value: boolean) =>
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true });

afterEach(() => setRtl(false));

test('Arabic: right-to-left, the light scheme, the brand seed, sized to its content', async () => {
  setRtl(true);
  await render(<ExpoHost testID="host" />);
  const host = screen.getByTestId('host');
  expect(host.props.layoutDirection).toBe('rightToLeft');
  expect(host.props.colorScheme).toBe('light');
  expect(host.props.seedColor).toBe(palette.light.lapisFill);
  expect(host.props.matchContents).toBe(true);
});

test('dark mode: the dark scheme and its seed; English: left-to-right', async () => {
  scheme.mockReturnValue('dark');
  await render(<ExpoHost testID="host" />);
  const host = screen.getByTestId('host');
  expect(host.props.layoutDirection).toBe('leftToRight');
  expect(host.props.colorScheme).toBe('dark');
  expect(host.props.seedColor).toBe(palette.dark.lapisFill);
  scheme.mockReturnValue('light');
});

test('a left-to-right value stays left-to-right in Arabic; a caller may fill its parent', async () => {
  setRtl(true);
  await render(<ExpoHost testID="host" ltr matchContents={false} />);
  const host = screen.getByTestId('host');
  expect(host.props.layoutDirection).toBe('leftToRight');
  expect(host.props.matchContents).toBe(false);
});

test('React Native content sits in a native slot sized to it, readable and pressable', async () => {
  await render(
    <ExpoHost>
      <NativeSlot>
        <AppText accessibilityRole="header">الإعدادات</AppText>
      </NativeSlot>
    </ExpoHost>,
  );
  expect(screen.getByTestId('native-slot').props.matchContents).toBe(true);
  expect(screen.getByRole('header', { name: 'الإعدادات' })).toBeTruthy();
});

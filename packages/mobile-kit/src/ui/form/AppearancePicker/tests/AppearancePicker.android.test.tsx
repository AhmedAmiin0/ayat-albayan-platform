import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Appearance, I18nManager, useColorScheme } from 'react-native';
import { APPEARANCE_KEY } from '../../../../lib/appearance/appearance';
import { t } from '../../../../lib/i18n/i18n';
import { palette, type } from '../../../../theme';
import { AppearancePicker } from '../AppearancePicker.android';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const setRtl = (value: boolean) =>
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true });

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});
afterEach(() => {
  setRtl(false);
  jest.restoreAllMocks();
});

test('Material segments under the section heading: one named radio group of three', async () => {
  await render(<AppearancePicker />);
  expect(screen.getByRole('header', { name: t.theme.label })).toBeTruthy();
  const group = screen.getByLabelText(t.theme.label);
  expect(group.props.accessibilityRole).toBe('radiogroup');
  expect(group.props.compose).toBe(true);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(await screen.findByRole('radio', { name: t.theme.auto, checked: true })).toBeTruthy();
});

test('a press on a segment applies the theme at once and saves it', async () => {
  await render(<AppearancePicker />);
  await screen.findByRole('radio', { name: t.theme.auto, checked: true });
  await fireEvent.press(screen.getByRole('radio', { name: t.theme.dark }));
  expect(screen.getByRole('radio', { name: t.theme.dark, checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.theme.auto, checked: false })).toBeTruthy();
  expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  expect(await AsyncStorage.getItem(APPEARANCE_KEY)).toBe('dark');
});

test('a saved choice is the selected segment on open', async () => {
  await AsyncStorage.setItem(APPEARANCE_KEY, 'light');
  await render(<AppearancePicker />);
  expect(await screen.findByRole('radio', { name: t.theme.light, checked: true })).toBeTruthy();
});

test('the pill look in Material: the green on its wash when chosen, ink on raised when not', async () => {
  await render(<AppearancePicker />);
  const { colors } = screen.getByTestId('appearance-dark').props;
  const c = palette.light;
  expect(colors.activeContainerColor).toBe(c.lapisWash);
  expect(colors.activeContentColor).toBe(c.lapis);
  expect(colors.inactiveContainerColor).toBe(c.raised);
  expect(colors.inactiveContentColor).toBe(c.ink);
  expect(colors.activeBorderColor).toBe(c.rule);
  expect(colors.inactiveBorderColor).toBe(c.rule);
});

test('labels in the brand face; the row spans the width at the 44 pt touch size', async () => {
  await render(<AppearancePicker />);
  const label = screen.getByText(t.theme.dark);
  expect(label.props.composeStyle.fontFamily).toBe(type.ui[600]);
  expect(label.props.composeStyle.fontSize).toBe(type.size.sm);
  const { modifiers } = screen.getByLabelText(t.theme.label).props;
  const kinds = modifiers.map((m: { $type: string }) => m.$type);
  expect(kinds).toContain('fillMaxWidth');
  const min = modifiers.find((m: { $type: string }) => m.$type === 'defaultMinSize');
  expect(min.params.minHeight).toBeGreaterThanOrEqual(44);
});

test('the segments sit in the kit host, in the app direction', async () => {
  setRtl(true);
  await render(<AppearancePicker />);
  const host = screen.getByTestId('appearance-host');
  expect(host.props.layoutDirection).toBe('rightToLeft');
});

test('dark: the segments take the dark palette', async () => {
  jest.mocked(useColorScheme).mockReturnValue('dark');
  await render(<AppearancePicker />);
  const { colors } = screen.getByTestId('appearance-auto').props;
  expect(colors.activeContainerColor).toBe(palette.dark.lapisWash);
  expect(colors.inactiveContainerColor).toBe(palette.dark.raised);
  expect(screen.getByTestId('appearance-host').props.colorScheme).toBe('dark');
});

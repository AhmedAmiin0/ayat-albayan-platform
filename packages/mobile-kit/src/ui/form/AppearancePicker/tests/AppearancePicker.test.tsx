import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { APPEARANCE_KEY } from '../../../../lib/appearance/appearance';
import { t } from '../../../../lib/i18n/i18n';
import { AppearancePicker } from '../AppearancePicker';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('the brand pills: one named radio group of three under the heading', async () => {
  await render(<AppearancePicker />);
  expect(screen.getByRole('header', { name: t.theme.label })).toBeTruthy();
  expect(screen.getByLabelText(t.theme.label).props.accessibilityRole).toBe('radiogroup');
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(await screen.findByRole('radio', { name: t.theme.auto, checked: true })).toBeTruthy();
});

test('a pill applies the theme at once and saves it', async () => {
  await render(<AppearancePicker />);
  await screen.findByRole('radio', { name: t.theme.auto, checked: true });
  await fireEvent.press(screen.getByRole('radio', { name: t.theme.light }));
  expect(screen.getByRole('radio', { name: t.theme.light, checked: true })).toBeTruthy();
  expect(Appearance.setColorScheme).toHaveBeenCalledWith('light');
  expect(await AsyncStorage.getItem(APPEARANCE_KEY)).toBe('light');
});

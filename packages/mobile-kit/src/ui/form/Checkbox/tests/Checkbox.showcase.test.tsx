import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { palette } from '../../../../theme';
import { CheckboxShowcase } from '../Checkbox.showcase';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const scheme = jest.mocked(useColorScheme);

test('every state renders, two disabled, and a press toggles a live row', async () => {
  await render(<CheckboxShowcase />);
  expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  expect(screen.getAllByRole('checkbox', { disabled: true })).toHaveLength(2);
  const yes = screen.getByRole('checkbox', { name: t.common.yes });
  expect(yes.props.accessibilityState.checked).toBe(false);
  await fireEvent.press(yes);
  expect(
    screen.getByRole('checkbox', { name: t.common.yes }).props.accessibilityState.checked,
  ).toBe(true);
});

test('dark: the checked box takes the dark accent', async () => {
  scheme.mockReturnValue('dark');
  await render(<CheckboxShowcase />);
  const boxes = screen.getAllByTestId('checkbox-box', { includeHiddenElements: true });
  const fills = boxes.map((b) => StyleSheet.flatten(b.props.style).backgroundColor);
  expect(fills).toContain(palette.dark.lapisFill);
});

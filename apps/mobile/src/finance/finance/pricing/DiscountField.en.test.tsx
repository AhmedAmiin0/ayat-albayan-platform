import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { DiscountField } from './DiscountField';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the same LTR island, centred, with an English label', async () => {
  await render(<DiscountField value="12.5" onChange={jest.fn()} />);
  const style = StyleSheet.flatten(screen.getByLabelText(t.pricing.steps.discount).props.style);
  expect(t.pricing.steps.discount).toMatch(/[A-Za-z]/);
  expect(style.direction).toBe('ltr');
  expect(style.writingDirection).toBeUndefined();
  expect(style.textAlign).toBe('center');
});

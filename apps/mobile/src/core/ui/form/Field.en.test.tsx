import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from './Field';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const inputStyle = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style);

test('English UI: free Arabic text sets no textAlign or writingDirection', async () => {
  await render(<Field label={t.auth.password} value="السلام عليكم" />);
  expect(inputStyle(t.auth.password).textAlign).toBeUndefined();
  expect(inputStyle(t.auth.password).writingDirection).toBeUndefined();
});

test('English UI: an ltr field is still wrapped in direction ltr, its eye in the same View', async () => {
  await render(<Field label={t.auth.email} ltr secureTextEntry value="a@b.c" />);
  const input = screen.getByLabelText(t.auth.email);
  expect(input.parent?.props.style).toEqual({ direction: 'ltr' });
  expect(screen.getByTestId('password-toggle').parent).toBe(input.parent);
});

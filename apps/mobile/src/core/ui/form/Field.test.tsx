import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from './Field';

test('a password field hides its text until the eye is pressed, then hides it again', async () => {
  await render(<Field label={t.auth.password} secureTextEntry value="pw" />);
  const input = screen.getByLabelText(t.auth.password);
  const eye = screen.getByRole('togglebutton', { name: t.auth.showPassword });
  expect(input).toHaveProp('secureTextEntry', true);
  expect(eye.props.accessibilityState).toMatchObject({ checked: false });
  await fireEvent.press(eye);
  expect(input).toHaveProp('secureTextEntry', false);
  expect(eye.props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(eye);
  expect(input).toHaveProp('secureTextEntry', true);
});

test('a plain field has no eye', async () => {
  await render(<Field label={t.auth.email} value="a@b.c" />);
  expect(screen.queryByTestId('password-toggle')).toBeNull();
});

// The Arabic UI (jest.setup: RTL). Free text aligns by what is typed; an ltr value is an LTR island.
const inputStyle = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style);

test('a free-text field sets no textAlign or writingDirection (the typed text decides)', async () => {
  await render(<Field label={t.auth.password} value="Hello" />);
  expect(inputStyle(t.auth.password).textAlign).toBeUndefined();
  expect(inputStyle(t.auth.password).writingDirection).toBeUndefined();
  expect(screen.getByLabelText(t.auth.password).parent?.props.style).toBeUndefined();
});

test('an ltr field sits in a direction ltr View, with its eye toggle in that same View', async () => {
  await render(<Field label={t.auth.password} ltr secureTextEntry value="pw" />);
  const input = screen.getByLabelText(t.auth.password);
  expect(input.parent?.props.style).toEqual({ direction: 'ltr' });
  expect(inputStyle(t.auth.password).textAlign).toBeUndefined();
  expect(screen.getByTestId('password-toggle').parent).toBe(input.parent);
});

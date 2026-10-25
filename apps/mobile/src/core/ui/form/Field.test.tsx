import { fireEvent, render, screen } from '@testing-library/react-native';
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

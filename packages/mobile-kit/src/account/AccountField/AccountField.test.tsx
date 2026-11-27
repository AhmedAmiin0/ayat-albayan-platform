import { render, screen } from '@testing-library/react-native';
import { AccountField, passwordInput } from './AccountField';

test('the hint shows under the input and is its accessibility hint', async () => {
  await render(<AccountField label="الهاتف" value="" hint="بالصيغة الدولية" />);
  expect(screen.getByText('بالصيغة الدولية')).toBeTruthy();
  expect(screen.getByLabelText('الهاتف').props.accessibilityHint).toBe('بالصيغة الدولية');
});

test('an error takes the accessibility hint and shows as a line under the input', async () => {
  await render(
    <AccountField label="الهاتف" value="" hint="بالصيغة الدولية" error="رقم غير صالح" />,
  );
  expect(screen.getByText('رقم غير صالح')).toBeTruthy();
  expect(screen.getByLabelText('الهاتف').props.accessibilityHint).toBe('رقم غير صالح');
});

test('the password input hides the text and keeps it left to right', () => {
  expect(passwordInput('كلمة المرور')).toMatchObject({
    label: 'كلمة المرور',
    secureTextEntry: true,
    autoComplete: 'current-password',
    ltr: true,
  });
});

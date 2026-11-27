import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import type { Forgot } from '../use-forgot';
import { ForgotCodeStep } from './ForgotCodeStep';

const fakeForgot = (more: Partial<Forgot> = {}): Forgot => ({
  step: 'code',
  identifier: 'sara.t',
  setIdentifier: jest.fn(),
  error: null,
  busy: false,
  resendIn: 0,
  send: jest.fn(),
  reset: jest.fn(),
  ...more,
});

test('sends the typed code and the new password twice', async () => {
  const forgot = fakeForgot();
  await render(<ForgotCodeStep forgot={forgot} />);
  expect(screen.getByText(t.familyAuth.codeSent)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '123456');
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.newPassword), 'new-secret');
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.confirmPassword), 'new-secre');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.savePassword }));
  expect(forgot.reset).toHaveBeenCalledWith({
    code: '123456',
    password: 'new-secret',
    confirm: 'new-secre',
  });
});

test('shows the refusal, and resend asks for a new code once the wait is over', async () => {
  const forgot = fakeForgot({ error: t.familyAuth.errors.invalid_code });
  await render(<ForgotCodeStep forgot={forgot} />);
  expect(screen.getByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.resend }));
  expect(forgot.send).toHaveBeenCalledTimes(1);
});

test('while busy the save reads as saving', async () => {
  await render(<ForgotCodeStep forgot={fakeForgot({ busy: true })} />);
  expect(screen.getByRole('button', { name: t.familyAuth.saving })).toBeBusy();
});

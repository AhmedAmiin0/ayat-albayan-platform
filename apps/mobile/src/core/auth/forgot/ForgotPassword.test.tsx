import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ForgotPassword } from './ForgotPassword';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const onBack = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ available: true });
  mockApiSend.mockResolvedValue(undefined);
});

async function toCodeStep() {
  await render(<ForgotPassword onBack={onBack} />);
  await fireEvent.changeText(await screen.findByLabelText(t.familyAuth.identifier), ' sara.t ');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.codeSent)).toBeTruthy();
}

async function typeNewPassword(code: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), code);
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.newPassword), 'new-secret');
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.confirmPassword), confirm);
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.savePassword }));
}

test.each([
  ['codes are off', () => mockApiFetch.mockResolvedValue({ available: false })],
  ['the status check fails', () => mockApiFetch.mockRejectedValue(new TypeError('Network request failed'))],
])('when %s the staff are told to ask the admins', async (_name, arrange) => {
  arrange();
  await render(<ForgotPassword onBack={onBack} />);
  expect(await screen.findByText(t.familyAuth.staffResetByAdmin)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/auth/code/status');
  expect(screen.queryByLabelText(t.familyAuth.identifier)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.backToLogin }));
  expect(onBack).toHaveBeenCalled();
});

test('identifier → code → new password → saved, then back to login', async () => {
  await toCodeStep();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/password/forgot', { identifier: 'sara.t' });
  // Resend waits RESEND_SECONDS.
  expect(screen.getByRole('button', { name: t.familyAuth.resendIn.replace('{seconds}', '60') })).toBeDisabled();
  await typeNewPassword('١٢٣ ٤٥٦', 'new-secret');
  expect(await screen.findByText(t.familyAuth.passwordSaved)).toBeTruthy();
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', '/auth/password/reset', {
    identifier: 'sara.t',
    code: '123456',
    password: 'new-secret',
  });
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.backToLogin }));
  expect(onBack).toHaveBeenCalled();
});

test('a wrong or expired code says so and stays on the code step', async () => {
  await toCodeStep();
  mockApiSend.mockRejectedValue(new ApiError(401, { code: 'invalid_code' }));
  await typeNewPassword('123456', 'new-secret');
  expect(await screen.findByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
  expect(screen.getByLabelText(t.familyAuth.code)).toBeTruthy();
});

test('a short password reads the API rule', async () => {
  await toCodeStep();
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'password_too_short', min: 8 }));
  await typeNewPassword('123456', 'new-secret');
  expect(await screen.findByText(t.users.errors.password_too_short)).toBeTruthy();
});

test('passwords that differ are refused before any call', async () => {
  await toCodeStep();
  await typeNewPassword('123456', 'other');
  expect(await screen.findByText(t.familyAuth.passwordsDiffer)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('an incomplete code is refused before any call', async () => {
  await toCodeStep();
  await typeNewPassword('123', 'new-secret');
  expect(await screen.findByText(t.familyAuth.errors.code_incomplete)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('too many requests on send says to wait', async () => {
  mockApiSend.mockRejectedValue(new ApiError(429, { code: 'too_many_requests' }));
  await render(<ForgotPassword onBack={onBack} />);
  await fireEvent.changeText(await screen.findByLabelText(t.familyAuth.identifier), 'a@b.c');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.errors.too_many_requests)).toBeTruthy();
});

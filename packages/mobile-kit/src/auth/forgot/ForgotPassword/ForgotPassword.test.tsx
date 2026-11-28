import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiError } from '../../../lib/http/api';
import { t } from '../../../lib/i18n/i18n';
import { ForgotPassword } from './ForgotPassword';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const onBack = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(() => ({ available: false, staff: true }));
  mockApi.onWrite(() => undefined);
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
  ['codes are off', () => mockApi.onRead(() => ({ available: true, staff: false }))],
  [
    'the status check fails',
    () => mockApi.onRead(() => Promise.reject(new TypeError('Network request failed'))),
  ],
])('when %s the staff are told to ask the admins', async (_name, arrange) => {
  arrange();
  await render(<ForgotPassword onBack={onBack} />);
  expect(await screen.findByText(t.familyAuth.staffResetByAdmin)).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/auth/code/status' });
  expect(screen.queryByLabelText(t.familyAuth.identifier)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.backToLogin }));
  expect(onBack).toHaveBeenCalled();
});

test('identifier → code → new password → saved, then back to login', async () => {
  await toCodeStep();
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/auth/password/forgot',
    body: {
      identifier: 'sara.t',
    },
  });
  // Resend waits RESEND_SECONDS.
  expect(
    screen.getByRole('button', { name: t.familyAuth.resendIn.replace('{seconds}', '60') }),
  ).toBeDisabled();
  await typeNewPassword('١٢٣ ٤٥٦', 'new-secret');
  expect(await screen.findByText(t.familyAuth.passwordSaved)).toBeTruthy();
  expect(mockApi.writes().at(-1)).toEqual({
    method: 'POST',
    path: '/auth/password/reset',
    body: {
      identifier: 'sara.t',
      code: '123456',
      password: 'new-secret',
    },
  });
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.backToLogin }));
  expect(onBack).toHaveBeenCalled();
});

test('a wrong or expired code says so and stays on the code step', async () => {
  await toCodeStep();
  mockApi.onWrite(() => Promise.reject(new ApiError(401, { code: 'invalid_code' })));
  await typeNewPassword('123456', 'new-secret');
  expect(await screen.findByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
  expect(screen.getByLabelText(t.familyAuth.code)).toBeTruthy();
});

test('a short password reads the API rule', async () => {
  await toCodeStep();
  mockApi.onWrite(() => Promise.reject(new ApiError(400, { code: 'password_too_short', min: 8 })));
  await typeNewPassword('123456', 'new-secret');
  expect(await screen.findByText(t.users.errors.password_too_short)).toBeTruthy();
});

test('passwords that differ are refused before any call', async () => {
  await toCodeStep();
  await typeNewPassword('123456', 'other');
  expect(await screen.findByText(t.familyAuth.passwordsDiffer)).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(1);
});

test('an incomplete code is refused before any call', async () => {
  await toCodeStep();
  await typeNewPassword('123', 'new-secret');
  expect(await screen.findByText(t.familyAuth.errors.code_incomplete)).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(1);
});

test('too many requests on send says to wait', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(429, { code: 'too_many_requests' })));
  await render(<ForgotPassword onBack={onBack} />);
  await fireEvent.changeText(await screen.findByLabelText(t.familyAuth.identifier), 'a@b.c');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.errors.too_many_requests)).toBeTruthy();
});

test('the identifier asks for username autofill (the native input reads autoComplete)', async () => {
  await render(<ForgotPassword onBack={onBack} />);
  const identifier = await screen.findByLabelText(t.familyAuth.identifier);
  expect(identifier).toHaveProp('autoComplete', 'username');
});

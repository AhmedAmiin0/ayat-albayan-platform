import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { TeacherCodeSignIn } from './TeacherCodeSignIn';

const mockApiSend = jest.fn();
const mockSignInWithCode = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@/core/auth/sign-in', () => ({ signInWithCode: (b: unknown) => mockSignInWithCode(b) }));

const onBack = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
});

async function toCodeStep() {
  await render(<TeacherCodeSignIn onBack={onBack} />);
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.phone), '00966 50 000 0005');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.codeSent)).toBeTruthy();
}

test('phone → the staff route with the normalised number → the code step', async () => {
  await toCodeStep();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/staff-code/request', {
    phone: '+966500000005',
  });
  expect(screen.getByRole('button', { name: /يمكنك إعادة الإرسال|You can resend/ })).toBeDisabled();
});

test('a right code signs in with the folded digits and stays busy for the auth gate', async () => {
  mockSignInWithCode.mockResolvedValue({ ok: true });
  await toCodeStep();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '١٢٣ ٤٥٦');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.verify }));
  await waitFor(() =>
    expect(mockSignInWithCode).toHaveBeenCalledWith({ phone: '+966500000005', code: '123456' }),
  );
  expect(screen.getByRole('button', { name: t.familyAuth.verifying })).toBeDisabled();
});

test('a refusal is said in words; an incomplete code never reaches the API', async () => {
  mockSignInWithCode.mockResolvedValue({ ok: false, error: t.familyAuth.errors.invalid_code });
  await toCodeStep();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.verify }));
  expect(await screen.findByText(t.familyAuth.errors.code_incomplete)).toBeTruthy();
  expect(mockSignInWithCode).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '123456');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.verify }));
  expect(await screen.findByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
});

test('a bad number is refused before any request; 429 is said; back returns to the password', async () => {
  await render(<TeacherCodeSignIn onBack={onBack} />);
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.phone), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.errors.invalid_phone)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiSend.mockRejectedValue(new ApiError(429, { code: 'too_many_requests' }));
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.phone), '+966500000005');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.errors.too_many_requests)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.teacherAuth.withPassword }));
  expect(onBack).toHaveBeenCalled();
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { FamilySignInScreen } from './FamilySignInScreen';

// docs/50 §6: guardian = phone + WhatsApp code, hidden while codes are off; student = code +
// password, «أول دخول؟» / «نسيت» with a code to the guardian.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockSignIn = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@ab/mobile-kit/auth/sign-in', () => ({
  ...jest.requireActual('@ab/mobile-kit/auth/sign-in'),
  signIn: (c: unknown) => mockSignIn(c),
}));

const codes = (available: boolean) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/code/status' ? { available, staff: false } : {},
  );
const show = () => renderWithQuery(<FamilySignInScreen />, freshQueryClient());
const toStudent = () => fireEvent.press(screen.getByText(t.familyApp.signIn.student));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
});

test('guardian (default): phone → the family code route with the E.164 number', async () => {
  codes(true);
  await show();
  await fireEvent.changeText(await screen.findByLabelText(t.familyAuth.phone), '+966 50 000 0005');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.codeSent)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/code/request', {
    phone: '+966500000005',
  });
});

test('codes off: no phone path, the note says students can still sign in', async () => {
  codes(false);
  await show();
  expect(await screen.findByText(t.familyApp.signIn.codesOff)).toBeTruthy();
  expect(screen.queryByLabelText(t.familyAuth.phone)).toBeNull();
  await toStudent();
  expect(screen.getByLabelText(t.familyApp.signIn.studentCode)).toBeTruthy();
  expect(screen.queryByText(t.familyAuth.firstTime)).toBeNull();
});

test('student: code + password → signIn with the trimmed code', async () => {
  codes(true);
  mockSignIn.mockResolvedValue({ ok: true });
  await show();
  await toStudent();
  await fireEvent.changeText(screen.getByLabelText(t.familyApp.signIn.studentCode), ' AB-1234 ');
  await fireEvent.changeText(screen.getByLabelText(t.auth.password), 'pw');
  await fireEvent.press(screen.getByRole('button', { name: t.auth.submit }));
  await waitFor(() =>
    expect(mockSignIn).toHaveBeenCalledWith({ identifier: 'AB-1234', password: 'pw' }),
  );
});

test('student refused: the alert says why (a staff login gets the wrong-app words)', async () => {
  codes(true);
  mockSignIn.mockResolvedValue({ ok: false, error: t.familyApp.wrongApp });
  await show();
  await toStudent();
  await fireEvent.press(screen.getByRole('button', { name: t.auth.submit }));
  expect(await screen.findByRole('alert')).toHaveTextContent(t.familyApp.wrongApp);
});

test('«أول دخول؟»: the student code → a code to the guardian (password/forgot)', async () => {
  codes(true);
  await show();
  await toStudent();
  await fireEvent.press(await screen.findByRole('button', { name: t.familyAuth.firstTime }));
  expect(await screen.findByText(t.familyAuth.firstTimeIntro)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.username), 'AB-1234');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/password/forgot', {
      identifier: 'AB-1234',
    }),
  );
});

test('«نسيت كلمة السر؟» opens the family reset (not the staff «ask the admins»)', async () => {
  codes(true);
  await show();
  await toStudent();
  await fireEvent.press(await screen.findByRole('button', { name: t.familyAuth.forgot }));
  expect(await screen.findByText(t.familyAuth.forgotIntro)).toBeTruthy();
  expect(screen.queryByText(t.familyAuth.staffResetByAdmin)).toBeNull();
});

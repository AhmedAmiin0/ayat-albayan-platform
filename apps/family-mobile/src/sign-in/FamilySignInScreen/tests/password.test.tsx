import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { FamilySignInScreen } from '@/sign-in/FamilySignInScreen/FamilySignInScreen';

// docs/50 §4: the student code + password one tap from WhatsApp («أول دخول؟» / «نسيت» as before);
// while WhatsApp codes are off the screen opens on it, with one quiet line and no WhatsApp.

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
jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  notificationAsync: jest.fn(async () => undefined),
}));

const s = t.familyApp.signIn;
const show = async (available: boolean) => {
  mockApiFetch.mockResolvedValue({ available, staff: false });
  await renderWithQuery(<FamilySignInScreen />, freshQueryClient());
};
const toPassword = async () => {
  await show(true);
  await fireEvent.press(await screen.findByRole('button', { name: s.withPassword }));
  await screen.findByLabelText(s.studentCode);
};
const submit = () => screen.getByRole('button', { name: t.auth.submit });

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
});

test('codes off: the password form first, one quiet line, no WhatsApp and no «أول دخول؟»', async () => {
  await show(false);
  expect(await screen.findByLabelText(s.studentCode)).toBeTruthy();
  expect(screen.getByText(s.whatsappOff)).toBeTruthy();
  expect(screen.queryByLabelText(t.familyAuth.phone)).toBeNull();
  expect(screen.queryByRole('button', { name: s.withWhatsApp })).toBeNull();
  expect(screen.queryByText(t.familyAuth.firstTime)).toBeNull();
});

test('the plain button swaps WhatsApp for the password form, and back', async () => {
  await toPassword();
  await fireEvent.press(screen.getByRole('button', { name: s.withWhatsApp }));
  expect(await screen.findByLabelText(t.familyAuth.phone)).toBeTruthy();
});

test('inline: a typed code that cannot be a student code says so and holds the button', async () => {
  await toPassword();
  await fireEvent.changeText(screen.getByLabelText(s.studentCode), '1234');
  expect(screen.getByText(s.studentCodeBad)).toBeTruthy();
  expect(submit()).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText(s.studentCode), 'AB-12');
  expect(screen.queryByText(s.studentCodeBad)).toBeNull();
});

test('student code + password → signIn with the trimmed code', async () => {
  mockSignIn.mockResolvedValue({ ok: true });
  await toPassword();
  await fireEvent.changeText(screen.getByLabelText(s.studentCode), ' AB-1234 ');
  await fireEvent.changeText(screen.getByLabelText(t.auth.password), 'pw');
  await fireEvent.press(submit());
  await waitFor(() =>
    expect(mockSignIn).toHaveBeenCalledWith({ identifier: 'AB-1234', password: 'pw' }),
  );
});

test('a staff login is refused with the wrong-app words', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: t.familyApp.wrongApp });
  await toPassword();
  await fireEvent.press(submit());
  expect(await screen.findByRole('alert')).toHaveTextContent(t.familyApp.wrongApp);
});

test('«أول دخول؟»: the student code → a code to the guardian', async () => {
  await toPassword();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.firstTime }));
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
  await toPassword();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.forgot }));
  expect(await screen.findByText(t.familyAuth.forgotIntro)).toBeTruthy();
  expect(screen.queryByText(t.familyAuth.staffResetByAdmin)).toBeNull();
});

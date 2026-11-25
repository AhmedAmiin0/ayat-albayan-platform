import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { FamilySignInScreen } from '@/sign-in/FamilySignInScreen/FamilySignInScreen';

// docs/50 §4: ONE sign-in; the default is WhatsApp number → code → signed in, with a haptic on
// every answer. The API decides whose account a number is (the guardian row's main number).

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockWithCode = jest.fn();
const mockFeel = jest.fn(async (_kind: string) => undefined);
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@ab/mobile-kit/auth/sign-in', () => ({
  ...jest.requireActual('@ab/mobile-kit/auth/sign-in'),
  signInWithCode: (c: unknown) => mockWithCode(c),
}));
jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  notificationAsync: (kind: string) => mockFeel(kind),
}));

const s = t.familyApp.signIn;
const show = async () => {
  mockApiFetch.mockResolvedValue({ available: true, staff: false });
  await renderWithQuery(<FamilySignInScreen />, freshQueryClient());
};
const typePhone = async (typed: string) =>
  fireEvent.changeText(await screen.findByLabelText(t.familyAuth.phone), typed);
const sendButton = () => screen.getByRole('button', { name: t.familyAuth.sendCode });
const toCode = async () => {
  await show();
  await typePhone('050 000 0005');
  await fireEvent.press(sendButton());
  await screen.findByText(s.codeTitle);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
});

test('no tabs: the academy emblem, the wordmark, the welcome, the number, the password one tap away', async () => {
  await show();
  expect(await screen.findByLabelText(t.familyAuth.phone)).toBeTruthy();
  // The academy emblem (ayatalbayan.com's logo); decorative: hidden from a11y.
  expect(screen.getByTestId('mark-large', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByRole('header', { name: `${s.wordmark}، ${s.wordmarkArabic}` })).toBeTruthy();
  expect(screen.getByText(s.welcome)).toBeTruthy();
  expect(screen.getByRole('button', { name: s.withPassword })).toBeTruthy();
  expect(screen.queryByRole('tablist')).toBeNull();
});

test('inline: «send» waits for a whole number; a wrong one says why while typing', async () => {
  await show();
  await typePhone('5000');
  expect(sendButton()).toBeDisabled();
  expect(screen.getByText(s.phoneHint)).toBeTruthy();
  await typePhone('4000000001');
  expect(screen.getByText(s.phoneBad)).toBeTruthy();
  expect(sendButton()).toBeDisabled();
});

test('a Saudi 05… number → the family code route in E.164, a success haptic, the code step', async () => {
  await toCode();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/code/request', {
    phone: '+966500000005',
  });
  expect(mockFeel).toHaveBeenCalledWith('success');
  expect(screen.getAllByTestId('code-box', { includeHiddenElements: true })).toHaveLength(6);
});

test('the country picker sets the calling code', async () => {
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: /الدولة/ }));
  await fireEvent.press(screen.getByRole('radio', { name: /قطر/ }));
  await typePhone('5555 1234');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/code/request', { phone: '+97455551234' });
});

test('any country: a pasted whole number picks its own; the picker finds one by name', async () => {
  await show();
  await typePhone('+44 7700 900123');
  expect(screen.getByLabelText(t.familyAuth.phone)).toHaveProp('value', '7700900123');
  expect(screen.getByRole('button', { name: /المملكة المتحدة/ })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /الدولة/ }));
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), 'Pakistan');
  await fireEvent.press(screen.getByRole('radio', { name: /باكستان/ }));
  await typePhone('0300 1234567');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/code/request', { phone: '+923001234567' });
});

test('a pasted code fills the boxes and signs in without a tap', async () => {
  mockWithCode.mockResolvedValue({ ok: true });
  await toCode();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), 'رمزك: 123 456');
  await waitFor(() =>
    expect(mockWithCode).toHaveBeenCalledWith({ phone: '+966500000005', code: '123456' }),
  );
});

test('a refused code: the alert, an error haptic, empty boxes for the next try', async () => {
  mockWithCode.mockResolvedValue({ ok: false, error: t.familyApp.wrongApp });
  await toCode();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '123456');
  expect(await screen.findByRole('alert')).toHaveTextContent(t.familyApp.wrongApp);
  expect(mockFeel).toHaveBeenLastCalledWith('error');
  expect(screen.getByLabelText(t.familyAuth.code)).toHaveProp('value', '');
});

test('«غيّر الرقم» goes back to the number; the resend waits for its countdown', async () => {
  await toCode();
  expect(screen.getByRole('button', { name: /إعادة الإرسال|Send again/ })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.changePhone }));
  expect(await screen.findByRole('button', { name: t.familyAuth.sendCode })).toBeTruthy();
});

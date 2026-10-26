import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError, apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture, savedProfile } from '@/test/account';
import { renderWithQuery } from '@/test/query';
import { AccountScreen } from './AccountScreen';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: jest.fn(), apiSend: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true) } }));

const send = jest.mocked(apiSend);
const e = t.account.errors;
const saveIn = (title: string) => screen.getByRole('button', { name: `${t.account.save} — ${title}` });
/** The current-password inputs in screen order: phone, email, password. */
function current(i: number) {
  const input = screen.getAllByLabelText(t.account.currentPassword)[i];
  if (!input) throw new Error(`no current-password input #${i}`);
  return input;
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(apiFetch).mockResolvedValue(profileFixture);
  await renderWithQuery(<AccountScreen home="/more" />);
  await screen.findByLabelText(t.account.phone.label);
});

test('R-ACC-02: a phone change needs the current password, then sends it', async () => {
  await fireEvent.changeText(screen.getByLabelText(t.account.phone.label), '+201001234567');
  await fireEvent.press(saveIn(t.account.phone.title));
  expect(send).not.toHaveBeenCalled();
  expect(current(0).props.accessibilityHint).toBe(e.password_required);
  send.mockResolvedValue(savedProfile({ phone_e164: '+201001234567' }));
  await fireEvent.changeText(current(0), 'secret-1');
  await fireEvent.press(saveIn(t.account.phone.title));
  expect(send).toHaveBeenCalledWith('PATCH', '/me/profile', { phone_e164: '+201001234567', current_password: 'secret-1' });
  expect(await screen.findByText(t.account.toast.phone)).toBeTruthy();
});

test('wrong_password shows at the current-password field; phone reasons read invalid_phone', async () => {
  send.mockRejectedValueOnce(new ApiError(400, { code: 'wrong_password', message: 'x' }));
  await fireEvent.changeText(screen.getByLabelText(t.account.phone.label), '+201001234567');
  await fireEvent.changeText(current(0), 'nope');
  await fireEvent.press(saveIn(t.account.phone.title));
  expect(await screen.findByText(e.wrong_password)).toBeTruthy();
  expect(current(0).props.accessibilityHint).toBe(e.wrong_password);
  send.mockRejectedValueOnce(new ApiError(400, { message: 'validation_failed', issues: [{ path: ['phone_e164'], message: 'invalid_length' }] }));
  await fireEvent.press(saveIn(t.account.phone.title));
  expect(await screen.findByText(e.invalid_phone)).toBeTruthy();
  expect(screen.getByLabelText(t.account.phone.label).props.accessibilityHint).toBe(e.invalid_phone);
});

test('«إزالة الرقم» empties the field and sends null', async () => {
  send.mockResolvedValue(savedProfile({ phone_e164: null }));
  await fireEvent.press(screen.getByRole('button', { name: t.account.phone.remove }));
  await fireEvent.changeText(current(0), 'secret-1');
  await fireEvent.press(saveIn(t.account.phone.title));
  expect(send).toHaveBeenCalledWith('PATCH', '/me/profile', { phone_e164: null, current_password: 'secret-1' });
});

test('R-ACC-03: PUT /me/email; email_taken shows under the email', async () => {
  send.mockRejectedValueOnce(new ApiError(409, { code: 'email_taken', message: 'x' }));
  await fireEvent.changeText(screen.getByLabelText(t.account.email.label), ' new@example.com ');
  await fireEvent.changeText(current(1), 'secret-1');
  await fireEvent.press(saveIn(t.account.email.title));
  expect(send).toHaveBeenCalledWith('PUT', '/me/email', { email: 'new@example.com', current_password: 'secret-1' });
  expect(await screen.findByText(e.email_taken)).toBeTruthy();
  expect(screen.getByLabelText(t.account.email.label).props.accessibilityHint).toBe(e.email_taken);
});

test('R-ACC-04: a mismatched confirmation is caught here, nothing sent', async () => {
  await fireEvent.changeText(current(2), 'old-secret');
  await fireEvent.changeText(screen.getByLabelText(t.account.password.new), 'new-secret-1');
  await fireEvent.changeText(screen.getByLabelText(t.account.password.confirm), 'new-secret-2');
  await fireEvent.press(saveIn(t.account.password.title));
  expect(screen.getByText(t.account.password.mismatch)).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});

test('R-ACC-04: PUT /me/password, the note, the inputs cleared', async () => {
  send.mockResolvedValue(undefined);
  await fireEvent.changeText(current(2), 'old-secret');
  await fireEvent.changeText(screen.getByLabelText(t.account.password.new), 'new-secret-1');
  await fireEvent.changeText(screen.getByLabelText(t.account.password.confirm), 'new-secret-1');
  await fireEvent.press(saveIn(t.account.password.title));
  expect(send).toHaveBeenCalledWith('PUT', '/me/password', { current_password: 'old-secret', new_password: 'new-secret-1' });
  expect(await screen.findByText(t.account.toast.password)).toBeTruthy();
  expect(screen.getByLabelText(t.account.password.new).props.value).toBe('');
});

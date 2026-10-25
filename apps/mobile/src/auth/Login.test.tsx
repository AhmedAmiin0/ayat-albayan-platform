import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import Login from '../../app/login';
import { setLoginNotice } from './login-notice';

const mockSignIn = jest.fn();
jest.mock('@/auth/sign-in', () => ({ signIn: (c: unknown) => mockSignIn(c) }));

beforeEach(() => jest.clearAllMocks());

test('shows Arabic error on failure', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: t.auth.invalidCredentials });
  await render(<Login />);
  await fireEvent.press(screen.getByRole('button'));
  expect(await screen.findByText(t.auth.invalidCredentials)).toBeTruthy();
});

test('error is an alert with the struck glyph, not colour alone', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: t.auth.noRole });
  await render(<Login />);
  expect(screen.queryByRole('alert')).toBeNull();
  await fireEvent.press(screen.getByRole('button'));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(t.auth.noRole);
  expect(screen.getByTestId('nuqta-struck', { includeHiddenElements: true })).toBeTruthy();
});

test('success signs in with the trimmed email and stays busy for the auth gate', async () => {
  mockSignIn.mockResolvedValue({ ok: true });
  await render(<Login />);
  await fireEvent.changeText(screen.getByLabelText(t.auth.email), ' a@b.c ');
  await fireEvent.changeText(screen.getByLabelText(t.auth.password), 'pw');
  await fireEvent.press(screen.getByRole('button'));
  await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' }));
  // No navigation here: Stack.Protected in app/_layout swaps the screen when the gate says admin.
  expect(screen.getByRole('button', { name: t.auth.submitting })).toBeDisabled();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('while signing in the button says why it is disabled', async () => {
  let finish: (r: { ok: false; error: string }) => void = () => undefined;
  mockSignIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  await render(<Login />);
  // RNTL 14 awaits the press handler, which waits on signIn: start it, inspect, then let it finish.
  const pressed = fireEvent.press(screen.getByRole('button', { name: t.auth.submit }));
  expect(await screen.findByRole('button', { name: t.auth.submitting })).toBeDisabled();
  await act(async () => finish({ ok: false, error: t.auth.invalidCredentials }));
  await pressed;
  expect(await screen.findByRole('button', { name: t.auth.submit })).toBeEnabled();
});

test('brand mark and Amiri title are on the screen', async () => {
  await render(<Login />);
  expect(screen.getByLabelText(t.app.brand)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.auth.loginTitle })).toBeTruthy();
});

test('after a mid-session sign-out the login screen says why (disabled account), then clears it on the next try', async () => {
  mockSignIn.mockResolvedValue({ ok: true });
  await act(async () => setLoginNotice('accountDisabled'));
  await render(<Login />);
  expect(await screen.findByRole('alert')).toHaveTextContent(t.mobileNav.accountDisabled);
  await fireEvent.press(screen.getByRole('button'));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

test('the wrong-app message reads as an alert too', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: t.mobileRoles.wrongApp });
  await render(<Login />);
  await fireEvent.press(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent(t.mobileRoles.wrongApp);
});

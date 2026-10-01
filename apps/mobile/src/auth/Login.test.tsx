import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import Login from '../../app/login';

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

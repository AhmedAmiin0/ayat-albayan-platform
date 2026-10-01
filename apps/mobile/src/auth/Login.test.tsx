import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import Login from '../../app/login';

const mockSignIn = jest.fn();
const mockReplace = jest.fn();
jest.mock('@/auth/sign-in', () => ({ signIn: (c: unknown) => mockSignIn(c) }));
jest.mock('expo-router', () => ({ router: { replace: (p: string) => mockReplace(p) } }));

beforeEach(() => jest.clearAllMocks());

test('shows Arabic error on failure', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: t.auth.invalidCredentials });
  await render(<Login />);
  await fireEvent.press(screen.getByRole('button'));
  expect(await screen.findByText(t.auth.invalidCredentials)).toBeTruthy();
});

test('navigates home on success with trimmed email', async () => {
  mockSignIn.mockResolvedValue({ ok: true });
  await render(<Login />);
  await fireEvent.changeText(screen.getByLabelText(t.auth.email), ' a@b.c ');
  await fireEvent.changeText(screen.getByLabelText(t.auth.password), 'pw');
  await fireEvent.press(screen.getByRole('button'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' });
});

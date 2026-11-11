import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { AccountSetupScreen } from './AccountSetupScreen';

const mockApiSend = jest.fn();
const mockRefresh = jest.fn();
const mockRefetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { auth: { refreshSession: () => mockRefresh() } },
}));
jest.mock('@/core/lib/query/query-client', () => ({
  queryClient: { refetchQueries: (q: unknown) => mockRefetch(q) },
}));
jest.mock('@/core/lib/session/sign-out', () => ({ signOutDevice: () => mockSignOut() }));

const S = t.teacherAuth.setup;

async function fill(email: string, password: string, confirm = password) {
  await fireEvent.changeText(screen.getByLabelText(S.email), email);
  await fireEvent.changeText(screen.getByLabelText(S.password), password);
  await fireEvent.changeText(screen.getByLabelText(S.confirm), confirm);
  await fireEvent.press(screen.getByRole('button', { name: S.submit }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue({ error: null });
});

test('saves email + password, refreshes the session, then reloads /auth/me (the tree opens the tabs)', async () => {
  await render(<AccountSetupScreen />);
  await fill(' teacher@example.com ', 'Long-enough-1');
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/me/setup', {
    email: 'teacher@example.com',
    password: 'Long-enough-1',
  });
  expect(mockRefresh).toHaveBeenCalled();
});

test('a bad email or two different passwords send nothing', async () => {
  await render(<AccountSetupScreen />);
  await fill('t-1@family.invalid', 'Long-enough-1');
  expect(await screen.findByText(S.errors.invalid_email)).toBeTruthy();
  await fill('teacher@example.com', 'Long-enough-1', 'Other-one-1');
  expect(await screen.findByText(t.familyAuth.passwordsDiffer)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the API refusals in words; «تسجيل الخروج» leaves', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'email_taken' }));
  mockApiSend.mockRejectedValueOnce(new ApiError(400, { code: 'password_too_short', min: 8 }));
  await render(<AccountSetupScreen />);
  await fill('taken@example.com', 'Long-enough-1');
  expect(await screen.findByText(S.errors.email_taken)).toBeTruthy();
  await fill('teacher@example.com', 'short');
  expect(await screen.findByText(t.users.errors.password_too_short)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: S.signOut }));
  expect(mockSignOut).toHaveBeenCalled();
});

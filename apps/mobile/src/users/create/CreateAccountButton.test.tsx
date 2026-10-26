import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { CreateAccountButton } from './CreateAccountButton';
import { CANDIDATES, usersGet } from '../shared/fixtures';

const mockApiFetch = jest.fn();
const mockHeld = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/auth/use-permissions', () => ({ usePermissions: () => (p: string) => mockHeld(p) }));

const free = { id: CANDIDATES[0]?.id ?? '', name: 'يوسف علي', code: 'AB-0007' };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(usersGet());
  mockHeld.mockReturnValue(true);
});

test('a student without a login: «إنشاء حساب» opens the form with the record fixed', async () => {
  await renderWithQuery(<CreateAccountButton student={free} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.users.account.create }));
  expect(mockApiFetch).toHaveBeenCalledWith('/users/link-candidates?kind=student&q=AB-0007');
  expect(await screen.findByText(t.users.link.chosen)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.users.link.change })).toBeNull();
  expect(screen.getByLabelText(t.users.form.fullName).props.value).toBe('يوسف علي');
});

test('a student who already has a login, or no users.write: no button', async () => {
  await renderWithQuery(<CreateAccountButton student={{ ...free, id: 'has-login' }} />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: t.users.account.create })).toBeNull();
  mockHeld.mockReturnValue(false);
  mockApiFetch.mockClear();
  await renderWithQuery(<CreateAccountButton student={free} />);
  expect(screen.queryByRole('button', { name: t.users.account.create })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { DETAIL, usersGet, YOUSEF } from '../shared/fixtures';
import { UserDetailScreen } from './UserDetailScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) => mockApiSend(mockMethod, mockPath, mockBody),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'u1' }),
}));

const all = () => true;
const readOnly = (p: string) => p !== 'users.write';
const F = t.users.form;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.mocked(router.back).mockReset();
});

test('summary and fields: status, linked record, last sign-in, LTR identity', async () => {
  mockApiFetch.mockImplementation(usersGet({ detail: { ...DETAIL, ...YOUSEF, locale: 'ar', tz: 'Asia/Riyadh', disabled_reason: 'ترك' } }));
  await renderWithQuery(<UserDetailScreen can={all} />);
  expect(await screen.findByText(`${t.users.kinds.student}: يوسف علي ${ltr('AB-0007')}`)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/users/u1');
  expect(mockApiFetch).toHaveBeenCalledWith('/users/role-options');
  expect(screen.getByText(t.users.detail.disabledReason.replace('{reason}', 'ترك'))).toBeTruthy();
  expect(screen.getByText(t.users.never)).toBeTruthy();
  expect(screen.getByText(F.roleLocked)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.users.actions.enable })).toBeTruthy();
});

test('without users.write: read-only fields and no save or account actions', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UserDetailScreen can={readOnly} />);
  expect(await screen.findByText(t.users.detail.readOnly)).toBeTruthy();
  expect(screen.getByLabelText(F.email).props.editable).toBe(false);
  for (const name of [t.users.detail.save, t.users.actions.disable, t.users.actions.resetPassword, t.users.actions.signOut, t.users.actions.delete]) {
    expect(screen.queryByRole('button', { name })).toBeNull();
  }
});

test('edit: E.164 and email are checked before any request', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UserDetailScreen can={all} />);
  await fireEvent.changeText(await screen.findByLabelText(F.email), 'nope');
  await fireEvent.changeText(screen.getByLabelText(F.phone), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.users.detail.save }));
  expect(screen.getByText(t.users.validation.email)).toBeTruthy();
  expect(screen.getByText(t.common.phoneErrors.missing_country_code)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('edit: PATCH /users/:id with only what changed, the phone normalised, the custom role', async () => {
  mockApiFetch.mockImplementation(usersGet());
  mockApiSend.mockResolvedValue(DETAIL);
  await renderWithQuery(<UserDetailScreen can={all} />);
  await fireEvent.changeText(await screen.findByLabelText(F.fullName), ' سارة محمد ');
  await fireEvent.changeText(screen.getByLabelText(F.phone), '+20 100 123 4567');
  await fireEvent.press(screen.getByRole('radio', { name: 'محاسب' }));
  await fireEvent.press(screen.getByRole('button', { name: t.users.detail.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/users/u1', { full_name: 'سارة محمد', phone_e164: '+201001234567', role_id: 'c-acc' }),
  );
  expect(await screen.findByText(t.users.toast.saved)).toBeTruthy();
});

test('edit: a role the actor cannot grant is not choosable; nothing changed goes back without a request', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UserDetailScreen can={all} />);
  const secret = await screen.findByRole('radio', { name: t.users.form.notAssignable.replace('{name}', 'سري') });
  expect(secret.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByRole('radio', { name: t.activity.roles.admin }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: t.users.detail.save }));
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalled();
});

test('edit: the API error code shows its MSA message', async () => {
  mockApiFetch.mockImplementation(usersGet());
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'email_taken' }));
  await renderWithQuery(<UserDetailScreen can={all} />);
  await fireEvent.changeText(await screen.findByLabelText(F.email), 'other@ab.co');
  await fireEvent.press(screen.getByRole('button', { name: t.users.detail.save }));
  expect(await screen.findByText(t.users.errors.email_taken)).toBeTruthy();
});

test('a user that does not exist says so', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/users/u1') throw new ApiError(404, { code: 'user_not_found' });
    return [];
  });
  await renderWithQuery(<UserDetailScreen can={all} />);
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Share } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { DETAIL, usersGet } from './fixtures';
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

const A = t.users.actions;
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));

async function open(detail = DETAIL) {
  mockApiFetch.mockImplementation(usersGet({ detail }));
  await renderWithQuery(<UserDetailScreen can={() => true} />);
  await screen.findByText(t.users.detail.save);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue(DETAIL);
});

test('disable: the step with a reason, then POST /users/:id/disable', async () => {
  await open();
  await press(A.disable);
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.users.disable.reason), ' ترك الأكاديمية ');
  await press(t.users.disable.confirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/users/u1/disable', { reason: 'ترك الأكاديمية' }));
  expect(await screen.findByText(t.users.toast.disabled)).toBeTruthy();
});

test('enable: asks first, then POST /users/:id/enable', async () => {
  await open({ ...DETAIL, status: 'disabled' });
  await press(A.enable);
  expect(screen.getByText(t.mobileUsers.enableConfirm.replace('{name}', DETAIL.full_name))).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await press(t.common.confirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/users/u1/enable', {}));
  expect(await screen.findByText(t.users.toast.enabled)).toBeTruthy();
});

test('sign out everywhere: asks first; cancel sends nothing; confirm POSTs', async () => {
  await open();
  await press(A.signOut);
  await press(t.common.cancel);
  expect(mockApiSend).not.toHaveBeenCalled();
  await press(A.signOut);
  await press(t.common.confirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/users/u1/sign-out', {}));
  expect(await screen.findByText(t.users.toast.signedOut)).toBeTruthy();
});

test('reset password: a generated one is shown once, with share; closing drops it', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  mockApiSend.mockResolvedValue({ user: DETAIL, credential: { kind: 'password', value: 'Tmp-9xQ2-ab' } });
  await open();
  await press(A.resetPassword);
  await press(t.users.reset.confirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/users/u1/reset-password', { credential: 'generate' }));
  expect(await screen.findByText(t.users.result.once)).toBeTruthy();
  expect(screen.getByTestId('issued-credential').props.selectable).toBe(true);
  expect(screen.getByText('Tmp-9xQ2-ab')).toBeTruthy();
  await press(t.mobileUsers.share);
  expect(share).toHaveBeenCalledWith({ message: 'Tmp-9xQ2-ab' });
  await press(t.users.result.close);
  expect(screen.queryByText('Tmp-9xQ2-ab')).toBeNull();
  expect(screen.getByRole('button', { name: t.users.detail.save })).toBeTruthy();
});

test('reset password: a typed one is checked, then sent as typed', async () => {
  mockApiSend.mockResolvedValue({ user: DETAIL, credential: null });
  await open();
  await press(A.resetPassword);
  await fireEvent.press(screen.getByRole('radio', { name: t.users.credential.set }));
  await press(t.users.reset.confirm);
  expect(screen.getByText(t.users.validation.passwordBlank)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.users.credential.password), 'longenough-1');
  await press(t.users.reset.confirm);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/users/u1/reset-password', { credential: 'set', password: 'longenough-1' }),
  );
  expect(await screen.findByText(t.users.result.setDone)).toBeTruthy();
});

test('delete: confirm, DELETE /users/:id, then back to the list', async () => {
  mockApiSend.mockResolvedValue(undefined);
  await open();
  await press(A.delete);
  expect(screen.getByText(t.users.delete.body.replace('{name}', DETAIL.full_name))).toBeTruthy();
  await press(t.users.delete.confirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/users/u1', undefined));
  expect(router.back).toHaveBeenCalled();
});

test('delete with history: the tables are listed, delete is gone, «تعطيل بدلًا من الحذف» disables', async () => {
  const references = [{ table: 'payments', column: 'recorded_by', count: 3 }];
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'users_has_history', references }));
  await open();
  await press(A.delete);
  await press(t.users.delete.confirm);
  expect(await screen.findByText(t.users.delete.blocked)).toBeTruthy();
  expect(screen.getByText(t.users.tables.payments)).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.users.delete.confirm })).toBeNull();
  await press(t.users.delete.disableInstead);
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('POST', '/users/u1/disable', {}));
});

test('an action refused by the API shows the mapped message', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'cannot_disable_self' }));
  await open();
  await press(A.disable);
  await press(t.users.disable.confirm);
  expect(await screen.findByText(t.users.errors.cannot_disable_self)).toBeTruthy();
});

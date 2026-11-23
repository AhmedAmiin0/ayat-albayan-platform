import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t, PUSH_OPT_OUT_KEY } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { PROFILE_HREF } from '#/nav/index.ts';
import { AccountScreen } from './AccountScreen';

const mockRegister = jest.fn(async () => undefined);
const mockUnregister = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => undefined);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/push/registerPush', () => ({
  registerPush: () => mockRegister(),
  unregisterPush: () => mockUnregister(),
}));
jest.mock('@ab/mobile-kit/lib/session/sign-out', () => ({ signOutDevice: () => mockSignOut() }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
}));

const child = {
  id: 's1',
  code: 'AB-0001',
  name: 'سارة',
  tz: 'Asia/Riyadh',
  contact_is_self: false,
};
const mockAnswer = (path: string): unknown => {
  const answers: Record<string, unknown> = {
    '/portal/me': { kind: 'guardian', students: [child], renew_url: null },
    '/me/profile': { id: 'g1', full_name: 'أم سارة', role: {} },
  };
  return (
    answers[path.split('?')[0] ?? ''] ?? { items: [], total: 0, page: 1, pageSize: 20, unread: 0 }
  );
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

const show = () => renderWithQuery(<AccountScreen />, freshQueryClient());
const pushSwitch = () => screen.getByLabelText(t.familyApp.settings.notifications);

test('the name card opens the profile (the children live there now)', async () => {
  const { client } = await show();
  expect(await screen.findByText(t.portal.app.account.guardian)).toBeTruthy();
  // Every read is in (/portal/me lists a child), and still no children here.
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(screen.queryByText('سارة')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /أم سارة/ }));
  expect(router.push).toHaveBeenCalledWith(PROFILE_HREF);
});

test('the name, the notifications switch (on by default) and sign out', async () => {
  await show();
  expect(await screen.findByText('أم سارة')).toBeTruthy();
  expect(screen.queryByText(t.account.password.title)).toBeNull();
  await waitFor(() => expect(pushSwitch().props.value).toBe(true));
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(mockSignOut).toHaveBeenCalled();
});

test('off unregisters the token and is remembered; on registers again', async () => {
  await show();
  await waitFor(() => expect(pushSwitch().props.value).toBe(true));
  await fireEvent(pushSwitch(), 'valueChange', false);
  await waitFor(() => expect(mockUnregister).toHaveBeenCalled());
  expect(await AsyncStorage.getItem(PUSH_OPT_OUT_KEY)).toBe('1');
  await waitFor(() => expect(pushSwitch().props.value).toBe(false));
  await fireEvent(pushSwitch(), 'valueChange', true);
  await waitFor(() => expect(mockRegister).toHaveBeenCalled());
  expect(await AsyncStorage.getItem(PUSH_OPT_OUT_KEY)).toBeNull();
});

test('the privacy policy and the deletion page, on «حسابي» for guardians and students', async () => {
  await show();
  expect(await screen.findByText('أم سارة')).toBeTruthy();
  const privacy = screen.getByRole('button', { name: new RegExp(t.legal.links.privacy) });
  const deletion = screen.getByRole('button', { name: new RegExp(t.legal.links.deleteAccount) });
  expect([privacy, deletion].every(Boolean)).toBe(true);
});

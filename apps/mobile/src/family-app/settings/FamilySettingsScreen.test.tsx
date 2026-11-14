import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PUSH_OPT_OUT_KEY } from '@/core/push/device-key';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { FamilySettingsScreen } from './FamilySettingsScreen';

const mockRegister = jest.fn(async () => undefined);
const mockUnregister = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => undefined);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/core/push/registerPush', () => ({
  registerPush: () => mockRegister(),
  unregisterPush: () => mockUnregister(),
}));
jest.mock('@/core/lib/session/sign-out', () => ({ signOutDevice: () => mockSignOut() }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({ id: 'g1', full_name: 'أم سارة', role: {} })),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

const show = () => renderWithQuery(<FamilySettingsScreen />, createTestQueryClient());
const pushSwitch = () => screen.getByLabelText(t.familyApp.settings.notifications);

test('the name, the notifications switch (on by default) and sign out', async () => {
  await show();
  expect(await screen.findByText('أم سارة')).toBeTruthy();
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

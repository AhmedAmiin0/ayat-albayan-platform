import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ApiError } from '@/core/lib/http/api';
import { ensurePushPermission } from './permission';
import { registerPush, TOKEN_KEY } from './registerPush';

// A role without notifications.push (sales, a classroom assistant): PUT /me/push-tokens answers 403.
const mockApiSend = jest.fn();
// Signed in with a valid token (live-session.test.ts covers the check itself).
jest.mock('@/core/push/live-session', () => ({ hasLiveSession: jest.fn(async () => true) }));
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } } } }));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[x]' })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('./permission', () => ({ ensurePushPermission: jest.fn(async () => true) }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('a 403 from PUT /me/push-tokens is swallowed: no throw, no warning, no token kept', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockApiSend.mockRejectedValue(new ApiError(403, { code: 'forbidden' }));
  await expect(registerPush()).resolves.toBeUndefined();
  expect(ensurePushPermission).toHaveBeenCalled();
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  warn.mockRestore();
});

test('any other failure still resolves (dev builds warn why)', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockApiSend.mockRejectedValue(new ApiError(500));
  await expect(registerPush()).resolves.toBeUndefined();
  expect(warn).toHaveBeenCalledWith('registerPush', expect.any(ApiError));
  warn.mockRestore();
});

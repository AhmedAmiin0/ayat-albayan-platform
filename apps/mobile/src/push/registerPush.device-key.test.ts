import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ApiError } from '@/core/lib/http/api';
import { DEVICE_KEY, registerPush, TOKEN_KEY, unregisterPush } from './registerPush';

// Migration 720: the API hands each device a key that proves a later PUT comes from that same
// phone (a token bound to someone else's live session moves only with it).
const TOKEN = 'ExponentPushToken[x]';
const KEY = 'k'.repeat(43);
const mockApiSend = jest.fn();
const mockSilence = jest.fn();
const mockSettled = jest.fn(async () => undefined);
jest.mock('./silence-push', () => ({
  silencePush: () => mockSilence(),
  silenceSettled: () => mockSettled(),
}));
jest.mock('@/push/live-session', () => ({ hasLiveSession: jest.fn(async () => true) }));
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

test('first registration: no key sent, the answered key kept', async () => {
  mockApiSend.mockResolvedValueOnce({ deviceKey: KEY });
  await registerPush();
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/me/push-tokens', { token: TOKEN });
  expect(await AsyncStorage.getItem(DEVICE_KEY)).toBe(KEY);
});

test('later registrations send the kept key; sign-out keeps it (a handed-over phone proves itself)', async () => {
  await AsyncStorage.setItem(DEVICE_KEY, KEY);
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  mockApiSend.mockResolvedValue(undefined);
  await unregisterPush();
  await registerPush();
  expect(mockApiSend).toHaveBeenLastCalledWith('PUT', '/me/push-tokens', { token: TOKEN, deviceKey: KEY });
  expect(await AsyncStorage.getItem(DEVICE_KEY)).toBe(KEY);
});

test('409 (another person’s live device): the OS stops delivering here, nothing kept, no warning', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { message: 'push_device_in_use' }));
  await expect(registerPush()).resolves.toBeUndefined();
  expect(mockSilence).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(DEVICE_KEY)).toBeNull();
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test('any other failure does not silence the device', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockApiSend.mockRejectedValueOnce(new ApiError(500));
  await expect(registerPush()).resolves.toBeUndefined();
  expect(mockSilence).not.toHaveBeenCalled();
  warn.mockRestore();
});

test('a sign-out unregister still running is awaited before the token is fetched', async () => {
  let finish = (): void => undefined;
  mockSettled.mockReturnValueOnce(new Promise<undefined>((resolve) => (finish = () => resolve(undefined))));
  mockApiSend.mockResolvedValueOnce({ deviceKey: KEY });
  const done = registerPush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  finish();
  await done;
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
});

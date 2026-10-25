import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '@/lib/i18n';
import { hasLiveSession } from './live-session';
import { ensurePushPermission } from './permission';
import { ANDROID_CHANNEL, easProjectId, registerPush, TOKEN_KEY, unregisterPush } from './registerPush';

const mockIsDevice = jest.fn(() => true);
const mockExtra = jest.fn((): unknown => ({ eas: { projectId: 'proj-1' } }));
const mockApiSend = jest.fn();

jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() {
    return mockIsDevice();
  },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra() };
    },
  },
}));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('./permission', () => ({ ensurePushPermission: jest.fn() }));
jest.mock('./live-session', () => ({ hasLiveSession: jest.fn() }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const TOKEN = 'ExponentPushToken[abc-123]';
const getToken = jest.mocked(Notifications.getExpoPushTokenAsync);
const allowed = jest.mocked(ensurePushPermission);
const live = jest.mocked(hasLiveSession);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  allowed.mockResolvedValue(true);
  live.mockResolvedValue(true);
  getToken.mockResolvedValue({ type: 'expo', data: TOKEN });
});
afterEach(() => jest.restoreAllMocks());

test('easProjectId reads extra.eas.projectId and nothing else', () => {
  expect(easProjectId({ eas: { projectId: 'p' } })).toBe('p');
  expect(easProjectId({ eas: { projectId: '' } })).toBeNull();
  expect(easProjectId({ eas: {} })).toBeNull();
  expect(easProjectId(undefined)).toBeNull();
  expect(easProjectId({ supportsRTL: true })).toBeNull();
});

test('allowed device: token from the EAS project, PUT once, kept for sign-out', async () => {
  await registerPush();
  expect(getToken).toHaveBeenCalledWith({ projectId: 'proj-1' });
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/me/push-tokens', { token: TOKEN });
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
});

test.each([
  ['a simulator', () => mockIsDevice.mockReturnValueOnce(false)],
  ['no EAS project yet', () => mockExtra.mockReturnValueOnce({ supportsRTL: true })],
  ['permission refused', () => allowed.mockResolvedValueOnce(false)],
])('%s: skips silently, nothing sent', async (_case, arrange) => {
  arrange();
  await expect(registerPush()).resolves.toBeUndefined();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('no live session (a cold start on an expired one): no prompt, no token, no PUT', async () => {
  live.mockResolvedValueOnce(false);
  await registerPush();
  expect(allowed).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('no EAS project: does not even ask for permission', async () => {
  mockExtra.mockReturnValueOnce({});
  await registerPush();
  expect(allowed).not.toHaveBeenCalled();
});

test('Expo Go / offline token failure never throws', async () => {
  getToken.mockRejectedValueOnce(new Error('offline'));
  await expect(registerPush()).resolves.toBeUndefined();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('android: the channel exists (Arabic name) before the permission prompt', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const order: string[] = [];
  jest.mocked(Notifications.setNotificationChannelAsync).mockImplementationOnce(async () => {
    order.push('channel');
    return null;
  });
  allowed.mockImplementationOnce(async () => {
    order.push('permission');
    return true;
  });
  await registerPush();
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(ANDROID_CHANNEL, {
    name: t.mobile.pushChannel,
    importance: Notifications.AndroidImportance.HIGH,
  });
  expect(order).toEqual(['channel', 'permission']);
});

test('unregister: DELETE with the URL-encoded token, then forget it', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  await unregisterPush();
  expect(mockApiSend).toHaveBeenCalledWith('DELETE', `/me/push-tokens/${encodeURIComponent(TOKEN)}`);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('unregister: nothing registered, nothing sent', async () => {
  await unregisterPush();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('unregister offline: never throws and keeps the token for the next sign-out', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  mockApiSend.mockRejectedValueOnce(new Error('offline'));
  await expect(unregisterPush()).resolves.toBeUndefined();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
});

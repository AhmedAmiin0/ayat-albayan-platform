import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { setPushOptOut } from './device-key';
import { registerPush } from './registerPush';

// docs/50 §6: device opt-out keeps registerPush away (no prompt, no token, no PUT).

const mockApiSend = jest.fn();
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[x]' })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('./permission', () => ({ ensurePushPermission: jest.fn(async () => true) }));
jest.mock('./live-session', () => ({ hasLiveSession: jest.fn(async () => true) }));
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('switched off on this device: no token is fetched and nothing is PUT', async () => {
  await setPushOptOut(true);
  await registerPush();
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('on (the default, and always in the staff app): the token is PUT', async () => {
  await registerPush();
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  expect(mockApiSend).toHaveBeenCalledWith(
    'PUT',
    '/me/push-tokens',
    expect.objectContaining({ token: 'ExponentPushToken[x]' }),
  );
});

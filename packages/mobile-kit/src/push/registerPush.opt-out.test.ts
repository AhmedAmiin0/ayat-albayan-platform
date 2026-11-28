import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { setPushOptOut } from './device-key';
import { registerPush } from './registerPush';
import { mockCall } from '@ab/testing/mock-call';

// docs/50 §6: device opt-out keeps registerPush away (no prompt, no token, no PUT).

const mockApi = mockCall();
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
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('switched off on this device: no token is fetched and nothing is PUT', async () => {
  await setPushOptOut(true);
  await registerPush();
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(mockApi.writes()).toHaveLength(0);
});

test('on (the default, and always in the staff app): the token is PUT', async () => {
  await registerPush();
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  expect(mockApi.writes()).toContainEqual({
    method: 'PUT',
    path: '/me/push-tokens',
    body: expect.objectContaining({ token: 'ExponentPushToken[x]' }),
  });
});

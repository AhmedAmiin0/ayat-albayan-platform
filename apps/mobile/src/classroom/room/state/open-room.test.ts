import { Linking, NativeModules } from 'react-native';
import { takeHandoff } from '@/classroom/room/model/join-handoff';
import { ApiError } from '@/core/lib/http/api';
import { openRoom } from './open-room';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const meeting = { kind: 'meeting', id: ID } as const;
const modules: Record<string, unknown> = NativeModules;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiSend.mockResolvedValue({
    url: 'wss://lk',
    token: 'tok',
    room: 'meeting-x',
    role: 'admin',
  });
});
afterEach(() => {
  delete modules.LivekitReactNativeModule;
});

test('with LiveKit in the binary and the setting on: the room route, the token in memory only', async () => {
  modules.LivekitReactNativeModule = {};
  await openRoom(meeting, true);
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/meetings/${ID}/join`);
  expect(mockPush).toHaveBeenCalledWith(`/room/meeting/${ID}`);
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(takeHandoff(meeting)).toEqual({ url: 'wss://lk', token: 'tok' });
});

test('the setting off: the web room in the browser, as before', async () => {
  modules.LivekitReactNativeModule = {};
  await openRoom(meeting, false);
  expect(mockPush).not.toHaveBeenCalled();
  expect(Linking.openURL).toHaveBeenCalledWith(`https://app.ayatalbayan.com/meeting/${ID}`);
});

test('an older APK without the module: the browser', async () => {
  await openRoom({ kind: 'lesson', id: ID }, true);
  expect(Linking.openURL).toHaveBeenCalledWith(`https://app.ayatalbayan.com/classroom/${ID}`);
});

test('a refusal throws before anything opens', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'meeting_ended' }));
  await expect(openRoom(meeting, true)).rejects.toBeInstanceOf(ApiError);
  expect(mockPush).not.toHaveBeenCalled();
  expect(Linking.openURL).not.toHaveBeenCalled();
});

import { Linking } from 'react-native';
import { takeHandoff } from '@ab/mobile-kit/room';
import { ApiError } from '@ab/mobile-kit';
import { openRoom } from './open-room';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
let mockNative: unknown = {};
jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual('@ab/mobile-kit/room'),
  liveKitNative: async () => mockNative,
}));

const ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const meeting = { kind: 'meeting', id: ID } as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockNative = {};
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiSend.mockResolvedValue({ url: 'wss://lk', token: 'tok', room: 'meeting-x', role: 'admin' });
});

test('with LiveKit in the binary and the setting on: the room route, the token in memory only', async () => {
  await openRoom(meeting, true);
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/meetings/${ID}/join`, undefined);
  expect(mockPush).toHaveBeenCalledWith(`/room/meeting/${ID}`);
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(takeHandoff(meeting)).toEqual({ url: 'wss://lk', token: 'tok', role: 'admin', chat: true });
});

test('the setting off: the web room in the browser, as before', async () => {
  await openRoom(meeting, false);
  expect(mockPush).not.toHaveBeenCalled();
  expect(Linking.openURL).toHaveBeenCalledWith(`https://app.ayatalbayan.com/meeting/${ID}`);
});

test('an older APK, or LiveKit failing to load (#bug: a loop of «انتهت صلاحية الدخول»): the browser', async () => {
  mockNative = null;
  await openRoom({ kind: 'lesson', id: ID }, true);
  expect(mockPush).not.toHaveBeenCalled();
  expect(Linking.openURL).toHaveBeenCalledWith(`https://app.ayatalbayan.com/classroom/${ID}`);
});

test('from a page sheet (#bug: the room hid under the Modal): the sheet closes, then the room', async () => {
  const order: string[] = [];
  mockPush.mockImplementationOnce(() => order.push('push'));
  const closeSheet = jest.fn(() => order.push('close'));
  await openRoom({ kind: 'lesson', id: ID }, true, { closeSheet, studentId: 's1' });
  expect(order).toEqual(['close', 'push']);
  expect(mockPush).toHaveBeenCalledWith(`/room/lesson/${ID}?student=s1`);
});

test('a refusal throws before anything opens', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'meeting_ended' }));
  await expect(openRoom(meeting, true)).rejects.toBeInstanceOf(ApiError);
  expect(mockPush).not.toHaveBeenCalled();
  expect(Linking.openURL).not.toHaveBeenCalled();
});

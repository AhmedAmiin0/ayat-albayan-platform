import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ChatFileError, pickChatFile, sendChatFile } from './send-file';
import { PHONE } from '../shared/thread-fixtures';

// The pill's camera and a recorded voice note (owner 2026-10-27).
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const MB = 1024 * 1024;
const ID = '0b6f8d1e-6c1a-4a8e-9a57-2f8d1c3b4a5e';
const shot = { uri: 'file:///c.jpg', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/jpeg' };

beforeEach(() => jest.clearAllMocks());

test('the camera, allowed: a JPEG photo taken now', async () => {
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true } as never);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [shot] } as never);
  await expect(pickChatFile('camera', 10 * MB)).resolves.toMatchObject({ mime: 'image/jpeg', filename: 'photo.jpg' });
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test('the camera, never asked: the chat’s own reason (not the receipt’s); refused → nothing', async () => {
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: true } as never);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
  await expect(pickChatFile('camera', 10 * MB)).resolves.toBeNull();
  expect(alert.mock.calls[0]?.[1]).toBe(t.inbox.composer.cameraRationale);
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
});

test('a voice note (audio/mp4) passes the chat check and asks for its upload as audio/mp4', async () => {
  mockApiSend.mockResolvedValueOnce({ bucket: 'wa-media', path: `out/u1/${ID}/a.m4a`, token: 't', signed_url: 'u' }).mockResolvedValueOnce({ id: 'v' });
  const file = { mime: 'audio/mp4', bytes: new ArrayBuffer(10), size: 10, filename: 'voice.m4a' };
  await sendChatFile({ phone: PHONE, file, id: ID, maxBytes: 10 * MB });
  expect(mockApiSend.mock.calls[0]?.[2]).toEqual({ clientRequestId: ID, mime: 'audio/mp4', size: 10 });
  expect(mockApiSend.mock.calls[1]?.[2]).toMatchObject({ filename: 'voice.m4a' });
});

test('other audio is refused before any request (file_type)', async () => {
  const file = { mime: 'audio/ogg', bytes: new ArrayBuffer(10), size: 10, filename: 'x.ogg' };
  await expect(sendChatFile({ phone: PHONE, file, id: ID, maxBytes: 10 * MB })).rejects.toEqual(new ChatFileError('file_type'));
  expect(mockApiSend).not.toHaveBeenCalled();
});

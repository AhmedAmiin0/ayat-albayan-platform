import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { askMic, hold, lift, moveTo, openChat, perms, rec, replyToAsked, resetVoice, tick } from './voice-test-kit';

// Hold to record, lift to send (owner 2026-10-27) on an Arabic phone (jest.setup: RTL). No real
// recorder, upload or WhatsApp: expo-audio, the API and Storage are fakes.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('expo-audio', () => jest.requireActual<typeof import('./voice-test-kit')>('./voice-test-kit').audioMock());
jest.mock('./voice-support', () => ({ voiceSupported: () => true }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const signed = { bucket: 'wa-media', path: 'out/u1/r1/a.m4a', token: 'tok', signed_url: 'https://s.test/up' };
const bodies = () => mockApiSend.mock.calls.map((c: unknown[]) => c[2] as Record<string, unknown>);

beforeEach(() => {
  resetVoice();
  mockApiSend.mockReset();
});

test('no permission yet: the system asks, nothing is recorded; the next press records', async () => {
  perms.now = { granted: false, canAskAgain: true };
  await openChat(mockApiFetch);
  await hold();
  expect(askMic).toHaveBeenCalledTimes(1);
  expect(rec.record).not.toHaveBeenCalled();
  expect(screen.queryByTestId('recording-bar')).toBeNull();
});

test('blocked: «افتح الإعدادات» with the reason, nothing recorded', async () => {
  perms.now = { granted: false, canAskAgain: false };
  await openChat(mockApiFetch);
  await hold();
  expect(screen.getByText(t.inbox.composer.voice.micBlocked)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.calls.mic.openSettings })).toBeTruthy();
  expect(rec.record).not.toHaveBeenCalled();
});

test('too short: discarded, the hint is shown, nothing sent', async () => {
  await openChat(mockApiFetch);
  await hold();
  expect(rec.prepareToRecordAsync).toHaveBeenCalled();
  expect(rec.record).toHaveBeenCalled();
  tick(300);
  await lift();
  expect(rec.stop).toHaveBeenCalled();
  expect(screen.getByText(t.inbox.composer.voice.hint)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('slide toward the start (right in Arabic, dx > 0) past the line cancels; nothing sent', async () => {
  await openChat(mockApiFetch);
  await hold(100);
  expect(screen.getByTestId('recording-bar')).toBeTruthy();
  expect(screen.getByText(t.inbox.composer.voice.slideCancel)).toBeTruthy();
  await moveTo(100 + 400);
  expect(rec.stop).toHaveBeenCalled();
  expect(screen.queryByTestId('recording-bar')).toBeNull();
  tick(3000);
  await lift();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('lift after a hold: the m4a goes as audio/mp4 voice.m4a to this chat, answering the quoted message', async () => {
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce({ id: 'v1' });
  await openChat(mockApiFetch);
  await replyToAsked();
  await hold();
  tick(2500);
  await lift();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockApiSend.mock.calls.map((c: unknown[]) => c[1])).toEqual(['/threads/%2B966552147730/file-upload-url', '/threads/%2B966552147730/file']);
  const [upload, file] = bodies();
  expect(upload).toMatchObject({ mime: 'audio/mp4', size: 10 });
  expect(file).toMatchObject({ clientRequestId: upload?.clientRequestId, filename: 'voice.m4a', path: signed.path, replyToMessageId: 'm1' });
  await waitFor(() => expect(screen.queryByTestId('recording-bar')).toBeNull());
});

test('slide up locks: the bar shows delete and «أرسل»; «أرسل» stops then sends once', async () => {
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce({ id: 'v1' });
  await openChat(mockApiFetch);
  await hold(300, 500);
  await moveTo(300, 380);
  tick(4000);
  expect(screen.getByRole('button', { name: t.inbox.composer.voice.delete })).toBeTruthy();
  const send = screen.getByRole('button', { name: t.inbox.composer.send });
  await act(async () => {
    fireEvent.press(send);
    fireEvent.press(send);
  });
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  await act(async () => undefined);
  expect(mockApiSend).toHaveBeenCalledTimes(2); // one upload URL + one send: never twice
  expect(rec.stop).toHaveBeenCalled();
});

test('a failed send keeps the recording; the retry reuses the same request id', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'session_closed' }));
  await openChat(mockApiFetch);
  await hold();
  tick(2000);
  await lift();
  expect(await screen.findByText(t.inbox.error.session_closed)).toBeTruthy();
  expect(screen.getByTestId('recording-bar')).toBeTruthy();
  const first = bodies()[0]?.clientRequestId;
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce({ id: 'v1' });
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(3));
  expect(bodies()[1]?.clientRequestId).toBe(first);
  expect(bodies()[2]?.clientRequestId).toBe(first);
});

test('cancel, then a lift while the recorder is still stopping: never sent', async () => {
  let stopped = () => undefined as unknown;
  await openChat(mockApiFetch);
  await hold(100);
  tick(3000);
  rec.stop.mockImplementationOnce(() => new Promise<void>((done) => (stopped = done)));
  await moveTo(100 + 400);
  await moveTo(100 + 420);
  await lift();
  await act(async () => {
    stopped();
  });
  expect(rec.stop).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

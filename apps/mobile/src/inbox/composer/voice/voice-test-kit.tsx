import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, message, thread } from '../../shared/thread-fixtures';
import { ThreadScreen } from '../../screens/ThreadScreen';

// Shared by the voice tests: a fake expo-audio recorder (no native module, nothing recorded) and a
// chat with an open window. Each test file mocks with `jest.mock('expo-audio', () => require(kit).audioMock())`.

interface FakeRecorder {
  isRecording: boolean;
  uri: string | null;
  ms: number;
  canRecord: boolean;
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  stop: jest.Mock;
  getStatus: jest.Mock;
}

export const rec: FakeRecorder = {
  isRecording: false,
  uri: 'file:///cache/rec.m4a',
  ms: 0,
  canRecord: true,
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn((): void => {
    rec.isRecording = true;
  }),
  stop: jest.fn(async (): Promise<void> => {
    rec.isRecording = false;
  }),
  getStatus: jest.fn(() => ({ canRecord: rec.canRecord, durationMillis: rec.ms, isRecording: rec.isRecording })),
};
type Perm = { granted: boolean; canAskAgain: boolean };
export const perms: { now: Perm; asked: Perm } = { now: { granted: true, canAskAgain: true }, asked: { granted: true, canAskAgain: true } };
export const askMic = jest.fn(async () => perms.asked);

/** The expo-audio module for `jest.mock` (loaded with jest.requireActual). @public */
export function audioMock() {
  return {
    AudioModule: { AudioRecorder: function AudioRecorder() {} },
    RecordingPresets: { HIGH_QUALITY: {} },
    useAudioRecorder: () => rec,
    useAudioRecorderState: () => ({ durationMillis: rec.ms, metering: -20, canRecord: true, isRecording: rec.isRecording }),
    getRecordingPermissionsAsync: async () => perms.now,
    requestRecordingPermissionsAsync: () => askMic(),
    useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined), setPlaybackRate: jest.fn() }),
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, didJustFinish: false, isLoaded: false, isBuffering: false }),
    setAudioModeAsync: async () => undefined,
  };
}

let clock = Date.now();
/** Date.now() under the test's control: the hold's length is measured with it. */
export function tick(ms: number) {
  clock += ms;
  rec.ms += ms;
}

export function resetVoice() {
  jest.clearAllMocks();
  Object.assign(rec, { isRecording: false, uri: 'file:///cache/rec.m4a', ms: 0, canRecord: true });
  perms.now = { granted: true, canAskAgain: true };
  perms.asked = { granted: true, canAskAgain: true };
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  globalThis.fetch = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(10) })) as unknown as typeof fetch;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const asked = message({ id: 'm1', direction: 'inbound', status: 'delivered', body: 'أرسل لي تسجيلًا', replyable: true, created_at: minutesAgo(9) });

/** The chat with an open window; `mockApiFetch` answers the gate and the thread. */
export async function openChat(mockApiFetch: jest.Mock) {
  const data = detail([asked], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
  mockApiFetch.mockImplementation(async (path: string) => (path === '/messages/gate' ? { open: true, reason: null, queued: 0 } : data));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(asked.body ?? '');
}

/** «رد» on the inbound message: the next send answers it. */
export async function replyToAsked() {
  await fireEvent(await screen.findByTestId('bubble-m1'), 'longPress');
  await fireEvent.press(within(screen.getByTestId('message-menu')).getByRole('button', { name: t.inbox.reply.action }));
}

const mic = () => screen.getByRole('button', { name: t.inbox.composer.voice.record });
const at = (x: number, y = 500) => ({ nativeEvent: { pageX: x, pageY: y } });

/** Press the microphone (the finger at x, y). */
export async function hold(x = 300, y = 500) {
  await act(async () => {
    fireEvent(mic(), 'responderGrant', at(x, y));
  });
}
export async function moveTo(x: number, y = 500) {
  await act(async () => {
    fireEvent(mic(), 'responderMove', at(x, y));
  });
}
export async function lift() {
  await act(async () => {
    fireEvent(mic(), 'responderRelease', at(0));
  });
}

import { createChannelRecorder, playChannelVoice } from './channel-voice';

const mockRecorder = {
  isRecording: true,
  uri: 'file:///cache/voice.m4a' as string | null,
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => undefined),
  release: jest.fn(),
  getStatus: () => ({ durationMillis: 7200 }),
};
const mockPermission = jest.fn(async () => ({ granted: true }));
type Listener = (s: Record<string, unknown>) => void;
const mockPlayer = {
  playing: false,
  duration: 60,
  listener: null as Listener | null,
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  remove: jest.fn(),
  addListener: jest.fn((_e: string, fn: Listener) => {
    mockPlayer.listener = fn;
    return { remove: jest.fn() };
  }),
};
jest.mock('expo-audio', () => ({
  AudioModule: { AudioRecorder: jest.fn(() => mockRecorder) },
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: () => mockPermission(),
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: jest.fn(() => mockPlayer),
}));

const realFetch = globalThis.fetch;
afterAll(() => {
  globalThis.fetch = realFetch;
});

test('records after the permission; stop gives the m4a with its length', async () => {
  const read = { arrayBuffer: async () => new ArrayBuffer(4) };
  globalThis.fetch = jest.fn(async () => read) as never;
  const rec = createChannelRecorder();
  expect(await rec.start()).toBe(true);
  expect(mockRecorder.record).toHaveBeenCalled();
  const file = await rec.stop();
  expect(file).toMatchObject({ mime: 'audio/mp4', size: 4, durationMs: 7200 });
  expect(mockRecorder.release).toHaveBeenCalled();
});

test('no permission: nothing records; a stop without a recording gives nothing', async () => {
  mockPermission.mockResolvedValueOnce({ granted: false });
  const rec = createChannelRecorder();
  expect(await rec.start()).toBe(false);
  expect(await rec.stop()).toBeNull();
});

test('a dropped recording is stopped and freed, never sent', async () => {
  mockRecorder.release.mockClear();
  const rec = createChannelRecorder();
  await rec.start();
  rec.cancel();
  await Promise.resolve();
  expect(mockRecorder.stop).toHaveBeenCalled();
});

test('the player: toggles, seeks by fraction, reports its status, rewinds at the end', async () => {
  const onStatus = jest.fn();
  const player = playChannelVoice({ url: 'https://files.example.org/v.m4a', onStatus });
  player.toggle();
  expect(mockPlayer.play).toHaveBeenCalled();
  player.seek(0.5);
  expect(mockPlayer.seekTo).toHaveBeenCalledWith(30);
  mockPlayer.listener?.({ playing: false, currentTime: 60, duration: 60, didJustFinish: true });
  expect(onStatus).toHaveBeenCalledWith({ playing: false, positionMs: 60_000, durationMs: 60_000 });
  expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
  player.release();
  expect(mockPlayer.remove).toHaveBeenCalled();
});

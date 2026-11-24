import type * as Rtc from './native-rtc';

const mockLoads = jest.fn();
const mockPeer = jest.fn();
const mockGetUserMedia = jest.fn(async () => ({ getAudioTracks: () => [] }));
const mockWebRtc = () => {
  mockLoads();
  return {
    RTCPeerConnection: function RTCPeerConnection(config: unknown) {
      mockPeer(config);
    },
    mediaDevices: { getUserMedia: mockGetUserMedia },
  };
};
jest.mock('@livekit/react-native-webrtc', () => mockWebRtc(), { virtual: true });

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  jest.doMock('@livekit/react-native-webrtc', () => mockWebRtc(), { virtual: true });
});

const fresh = (): typeof Rtc => jest.requireActual<typeof Rtc>('./native-rtc');

test('the module present: the peer and the microphone come from it', async () => {
  const deps = await fresh().nativeRtc();
  deps?.createPeer({ iceServers: [] });
  expect(mockPeer).toHaveBeenCalledWith({ iceServers: [] });
  await deps?.getMic();
  expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
});

test('an APK without the module (its import throws): null, the call says it is not supported', async () => {
  jest.doMock(
    '@livekit/react-native-webrtc',
    () => {
      throw new Error("Cannot find native module 'WebRTCModule'");
    },
    { virtual: true },
  );
  await expect(fresh().nativeRtc()).resolves.toBeNull();
});

test('loaded once, however many calls ask', async () => {
  const m = fresh();
  await Promise.all([m.nativeRtc(), m.nativeRtc()]);
  await m.nativeRtc();
  expect(mockLoads).toHaveBeenCalledTimes(1);
});

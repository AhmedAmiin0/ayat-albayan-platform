import { createNativeClient } from '../native-client';
import { fakeLivekit, fakeParticipant } from '../../fake-livekit';
import type { LiveKitNative } from '../../livekit-native';

const JOIN = { url: 'wss://lk', token: 't', role: 'teacher', chat: true } as const;
const setup = () => {
  const f = fakeLivekit();
  const client = createNativeClient({ lk: f.lk } as LiveKitNative);
  return { ...f, client };
};

test('connect, then the wished devices; a refused camera never fails the join', async () => {
  const { client, room, local } = setup();
  local.setCameraEnabled.mockRejectedValueOnce(new Error('NotAllowedError'));
  await client.connect(JOIN, { mic: true, cam: true });
  expect(room.connect).toHaveBeenCalledWith('wss://lk', 't');
  expect(local.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  expect(local.setCameraEnabled).toHaveBeenCalledWith(true, { facingMode: 'user' });
  expect(client.snapshot().status).toBe('connected');
});

test('events rebuild the tiles and reach the listeners; reconnecting and back', async () => {
  const { client, room, emit } = setup();
  const seen = jest.fn();
  const off = client.subscribe(seen);
  room.remoteParticipants.set('t1', fakeParticipant('t1'));
  emit('ParticipantConnected');
  expect(client.snapshot().tiles.map((x) => x.key)).toEqual(['me:camera', 't1:camera']);
  emit('Reconnecting');
  expect(client.snapshot().status).toBe('reconnecting');
  emit('Reconnected');
  expect(client.snapshot().status).toBe('connected');
  expect(seen).toHaveBeenCalledTimes(3);
  off();
  emit('TrackMuted');
  expect(seen).toHaveBeenCalledTimes(3);
});

test.each([
  [2, 'duplicate'],
  [4, 'removed'],
  // DeleteRoom: «إنهاء الحلقة للجميع» or the max-duration job (meeting_max_minutes).
  [5, 'ended'],
  [10, 'ended'],
  // The network, a server restart: dropped, with «ادخل مرة أخرى».
  [3, 'dropped'],
  [undefined, 'dropped'],
] as const)('a disconnect (reason %s) closes as %s', (reason, status) => {
  const { client, emit } = setup();
  emit('Disconnected', reason);
  expect(client.snapshot().status).toBe(status);
});

test('mic, camera and the switch go to the local participant; disconnect leaves', async () => {
  const { client, room, local } = setup();
  await client.setMic(false);
  expect(local.setMicrophoneEnabled).toHaveBeenCalledWith(false);
  const restartTrack = jest.fn(async () => undefined);
  local.pubs.set('camera', { videoTrack: { restartTrack } });
  expect(await client.switchCamera()).toBe(false);
  expect(restartTrack).toHaveBeenCalledWith({ facingMode: 'environment' });
  await client.setCamera(true);
  expect(local.setCameraEnabled).toHaveBeenLastCalledWith(true, { facingMode: 'environment' });
  restartTrack.mockRejectedValueOnce(new Error('busy'));
  expect(await client.switchCamera()).toBe(false);
  client.disconnect();
  expect(room.disconnect).toHaveBeenCalled();
});

test('no camera published: the switch keeps the front camera', async () => {
  const { client } = setup();
  expect(await client.switchCamera()).toBe(true);
});

test('dropped while joining (#bug): the join fails instead of going live on a dead room', async () => {
  const { client, local, emit } = setup();
  local.setMicrophoneEnabled.mockImplementationOnce(async () => emit('Disconnected', 3));
  await expect(client.connect(JOIN, { mic: true, cam: false })).rejects.toThrow('dropped');
  expect(client.snapshot().status).toBe('dropped');
});

test('a rejoin after an ended room starts afresh; the recording follows LiveKit', async () => {
  const { client, room, emit } = setup();
  emit('Disconnected', 3);
  await client.connect(JOIN, { mic: false, cam: false });
  expect(client.snapshot().status).toBe('connected');
  room.isRecording = true;
  emit('RecordingStatusChanged');
  expect(client.snapshot().recording).toBe(true);
});

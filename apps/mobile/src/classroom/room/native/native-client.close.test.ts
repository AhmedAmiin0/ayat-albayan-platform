import { createNativeClient } from './native-client';
import { fakeLivekit } from './fake-livekit';
import type { LiveKitNative } from './livekit-native';

const setup = () => {
  const f = fakeLivekit();
  const client = createNativeClient({ lk: f.lk } as LiveKitNative);
  return { ...f, client };
};
const JOIN = { url: 'wss://lk', token: 't' };
const MEDIA = { mic: true, cam: true };

test('closed before the join: connect never reaches LiveKit', async () => {
  const { client, room, local } = setup();
  client.close();
  await expect(client.connect(JOIN, MEDIA)).rejects.toThrow('closed');
  expect(room.connect).not.toHaveBeenCalled();
  expect(local.setMicrophoneEnabled).not.toHaveBeenCalled();
});

test('closed while connecting: the room is left and no device turns on', async () => {
  const { client, room, local } = setup();
  let finish = () => undefined as void;
  room.connect.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
  const joining = client.connect(JOIN, MEDIA);
  client.close();
  finish();
  await expect(joining).rejects.toThrow('closed');
  expect(room.disconnect).toHaveBeenCalledTimes(2);
  expect(local.setMicrophoneEnabled).not.toHaveBeenCalled();
  expect(local.setCameraEnabled).not.toHaveBeenCalled();
});

test('a plain disconnect (a failed join) still lets a retry connect', async () => {
  const { client, room } = setup();
  client.disconnect();
  await client.connect(JOIN, MEDIA);
  expect(room.connect).toHaveBeenCalledWith('wss://lk', 't');
  expect(client.snapshot().status).toBe('connected');
});

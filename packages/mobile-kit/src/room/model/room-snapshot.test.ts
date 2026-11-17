import {
  snapshotOf,
  type ParticipantLike,
  type PublicationLike,
  type RoomLike,
  type SourceName,
} from './room-snapshot';

interface P extends ParticipantLike {
  pubs: Partial<Record<SourceName, PublicationLike>>;
}

const person = (identity: string, over: Partial<P> = {}): P => ({
  identity,
  name: '',
  isSpeaking: false,
  isMicrophoneEnabled: true,
  isCameraEnabled: false,
  pubs: {},
  ...over,
});

const roomOf = (local: P, remotes: P[]): RoomLike<P> => ({
  local,
  remotes,
  recording: false,
  publication: (p, s) => p.pubs[s],
  videoRef: (p, s) => `${p.identity}/${s}`,
});

const on = { isMuted: false, track: {} };

test('a tile per camera, the name (or the identity), and a separate tile for a shared screen', () => {
  const me = person('me', { name: 'أحمد', isCameraEnabled: true, pubs: { camera: on } });
  const her = person('t1', {
    name: ' سهيلة ',
    isMicrophoneEnabled: false,
    isSpeaking: true,
    pubs: { screen_share: on },
  });
  const snap = snapshotOf(roomOf(me, [her, person('guest-9')]), 'connected');
  expect(snap.tiles.map((x) => [x.key, x.name, x.video])).toEqual([
    ['me:camera', 'أحمد', 'me/camera'],
    ['t1:camera', 'سهيلة', null],
    ['t1:screen', 'سهيلة', 't1/screen_share'],
    ['guest-9:camera', 'guest-9', null],
  ]);
  expect(snap.tiles[1]).toMatchObject({ local: false, micOn: false, speaking: true });
  expect(snap).toMatchObject({ status: 'connected', micOn: true, camOn: true });
});

test('a muted or unsubscribed camera shows the name card', () => {
  const me = person('me', { pubs: { camera: { isMuted: true, track: {} } } });
  const other = person('o', { pubs: { camera: { isMuted: false } } });
  expect(snapshotOf(roomOf(me, [other]), 'reconnecting').tiles.map((x) => x.video)).toEqual([
    null,
    null,
  ]);
});

test('each tile names its identity and role (the token metadata), and the recording shows', () => {
  const her = person('teacher-0123456789ab', { metadata: '{"role":"teacher"}' });
  const guest = person('guest-1', { metadata: 'not json', isCameraEnabled: true });
  const room = { ...roomOf(person('me'), [her, guest]), recording: true };
  const snap = snapshotOf(room, 'connected');
  expect(snap.tiles.map((x) => [x.identity, x.role, x.camOn])).toEqual([
    ['me', null, false],
    ['teacher-0123456789ab', 'teacher', false],
    ['guest-1', null, true],
  ]);
  expect(snap.recording).toBe(true);
});
